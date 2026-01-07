/**
 * Face Detection and Alignment Utilities
 * Uses face-api.js for detection and landmark extraction
 */

import type { FaceDetectionResult, FaceAlignment, FaceLandmarks } from '@/types';

declare const faceapi: any;

let modelsLoaded = false;
let modelsLoading = false;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

/**
 * Load face-api.js models
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoading) {
    // Wait for models to finish loading
    while (modelsLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return;
  }

  modelsLoading = true;

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error('Failed to load face models:', error);
    throw new Error('Failed to load face detection models');
  } finally {
    modelsLoading = false;
  }
}

/**
 * Detect single face in canvas
 * Uses TinyFaceDetector with options optimized for both desktop and mobile
 */
export async function detectSingleFace(
  canvas: HTMLCanvasElement
): Promise<FaceDetectionResult | null> {
  await loadFaceModels();

  // Try with default settings first
  let detection = await faceapi
    .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    }))
    .withFaceLandmarks();

  // If no face found, try with lower threshold (mobile/low quality images)
  if (!detection) {
    detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.3,
      }))
      .withFaceLandmarks();
  }

  // Still no face? Try with even lower threshold
  if (!detection) {
    detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.2,
      }))
      .withFaceLandmarks();
  }

  if (!detection) return null;

  const box = detection.detection.box;
  const landmarks = detection.landmarks;

  // Extract key landmarks
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();
  const mouth = landmarks.getMouth();
  const jawOutline = landmarks.getJawOutline();

  // Calculate eye centers
  const leftEyeCenter = {
    x: leftEye.reduce((sum: number, p: any) => sum + p.x, 0) / leftEye.length,
    y: leftEye.reduce((sum: number, p: any) => sum + p.y, 0) / leftEye.length,
  };

  const rightEyeCenter = {
    x: rightEye.reduce((sum: number, p: any) => sum + p.x, 0) / rightEye.length,
    y: rightEye.reduce((sum: number, p: any) => sum + p.y, 0) / rightEye.length,
  };

  // Calculate face angle
  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const faceLandmarks: FaceLandmarks = {
    leftEye: leftEyeCenter,
    rightEye: rightEyeCenter,
    nose: { x: nose[3].x, y: nose[3].y },
    leftMouth: { x: mouth[0].x, y: mouth[0].y },
    rightMouth: { x: mouth[6].x, y: mouth[6].y },
    jawLine: jawOutline.map((p: any) => ({ x: p.x, y: p.y })),
  };

  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    landmarks: faceLandmarks,
    angle,
  };
}

/**
 * Calculate alignment transform to match overlay face to base face
 * Now includes minimum coverage to ensure overlay covers enough of base image
 */
export function calculateFaceAlignment(
  baseFace: FaceDetectionResult,
  overlayFace: FaceDetectionResult,
  overlayWidth: number,
  overlayHeight: number,
  baseWidth?: number,
  baseHeight?: number,
  minCoverage = 0.9 // Minimum 90% coverage of base height
): FaceAlignment {
  if (!baseFace.landmarks || !overlayFace.landmarks) {
    // Fallback: use bounding boxes
    const scale = baseFace.width / overlayFace.width;
    const x = baseFace.x - overlayFace.x * scale;
    const y = baseFace.y - overlayFace.y * scale;

    return { x, y, scale, rotation: baseFace.angle - overlayFace.angle };
  }

  const baseL = baseFace.landmarks;
  const overlayL = overlayFace.landmarks;

  // Calculate eye distances
  const baseEyeDist = Math.sqrt(
    Math.pow(baseL.rightEye.x - baseL.leftEye.x, 2) +
      Math.pow(baseL.rightEye.y - baseL.leftEye.y, 2)
  );

  const overlayEyeDist = Math.sqrt(
    Math.pow(overlayL.rightEye.x - overlayL.leftEye.x, 2) +
      Math.pow(overlayL.rightEye.y - overlayL.leftEye.y, 2)
  );

  // Calculate scale based on eye distance (face alignment)
  const faceScale = baseEyeDist / overlayEyeDist;

  // Calculate minimum scale for coverage (if base dimensions provided)
  let minScale = faceScale;
  if (baseWidth && baseHeight) {
    // Scale needed for overlay to cover minCoverage of base
    const minHeightScale = (baseHeight * minCoverage) / overlayHeight;
    const minWidthScale = (baseWidth * minCoverage) / overlayWidth;
    minScale = Math.max(minHeightScale, minWidthScale);
  }

  // Use the larger scale: either face-based or minimum coverage
  const scale = Math.max(faceScale, minScale);

  // Calculate rotation difference
  const rotation = baseFace.angle - overlayFace.angle;

  // Calculate eye centers
  const baseEyeCenter = {
    x: (baseL.leftEye.x + baseL.rightEye.x) / 2,
    y: (baseL.leftEye.y + baseL.rightEye.y) / 2,
  };

  const overlayEyeCenter = {
    x: (overlayL.leftEye.x + overlayL.rightEye.x) / 2,
    y: (overlayL.leftEye.y + overlayL.rightEye.y) / 2,
  };

  // Calculate position to align eye centers
  // Account for rotation around overlay center
  const overlayCenterX = overlayWidth / 2;
  const overlayCenterY = overlayHeight / 2;

  // Transform overlay eye center considering scale and rotation
  const angleRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Position relative to overlay center
  const relX = overlayEyeCenter.x - overlayCenterX;
  const relY = overlayEyeCenter.y - overlayCenterY;

  // Rotated and scaled position
  const transformedX = (relX * cos - relY * sin) * scale;
  const transformedY = (relX * sin + relY * cos) * scale;

  // Calculate final position to align faces
  let x = baseEyeCenter.x - transformedX - overlayCenterX * scale;
  let y = baseEyeCenter.y - transformedY - overlayCenterY * scale;

  // If we used minimum coverage scale (larger than face scale),
  // center the overlay on base while keeping it from going too far off
  if (baseWidth && baseHeight && scale > faceScale) {
    // Prefer centering horizontally
    const scaledWidth = overlayWidth * scale;
    const scaledHeight = overlayHeight * scale;

    // Center horizontally but keep face roughly aligned
    const centerX = (baseWidth - scaledWidth) / 2;
    // Blend between face-aligned position and centered position
    const blendFactor = Math.min(1, (scale - faceScale) / faceScale);
    x = x * (1 - blendFactor * 0.5) + centerX * (blendFactor * 0.5);

    // For Y, keep face aligned but don't go too negative
    y = Math.max(y, -(scaledHeight - baseHeight) * 0.3);
  }

  return { x, y, scale, rotation };
}

/**
 * Create face mask using 68 landmarks with smooth edges
 *
 * Algorithm:
 * 1. Use jawline points (0-16) from 68 landmarks
 * 2. Estimate forehead using geometric interpolation (foreheadRatio)
 * 3. Draw Bezier curve from temple to temple over forehead
 * 4. Apply blur BEFORE cutting for soft edges
 * 5. Use stroke to expand mask area (covers skin at edges)
 */
export function createFaceMask(
  width: number,
  height: number,
  face: FaceDetectionResult,
  foreheadRatio = 0.8,
  strokeWidth = 15
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx || !face.landmarks) {
    // Fallback: smooth ellipse mask with gradient
    if (ctx) {
      const cx = face.x + face.width / 2;
      const cy = face.y + face.height / 2;
      const rx = (face.width / 2) * 1.3;
      const ry = (face.height / 2) * 1.3;

      // Apply blur BEFORE drawing
      ctx.filter = 'blur(8px)';
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.filter = 'none';
    }
    return canvas;
  }

  const landmarks = face.landmarks;
  const jawLine = landmarks.jawLine; // Points 0-16

  // Calculate face height (chin to eyebrows)
  const chinY = jawLine[8].y; // Point 8 is chin
  const eyebrowY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2 - face.height * 0.15;
  const faceHeight = chinY - eyebrowY;

  // Estimate forehead height using foreheadRatio
  const foreheadHeight = faceHeight * foreheadRatio;

  // Temple points (start and end of jawline - points 0 and 16)
  const leftTemple = jawLine[0];
  const rightTemple = jawLine[jawLine.length - 1];

  // Calculate forehead top point (center of forehead arc)
  const foreheadTopY = eyebrowY - foreheadHeight;
  const foreheadCenterX = (leftTemple.x + rightTemple.x) / 2;

  // Apply blur BEFORE drawing for soft edges
  ctx.filter = 'blur(8px)';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = strokeWidth; // Expansion: nới rộng vùng cắt 7-8px
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();

  // Start from left temple
  ctx.moveTo(leftTemple.x, leftTemple.y);

  // Draw Bezier curve for forehead (vòm trán)
  // Control points create a nice arc over the head
  ctx.bezierCurveTo(
    leftTemple.x, foreheadTopY + foreheadHeight * 0.3,  // Left control
    foreheadCenterX, foreheadTopY,                       // Top control (apex of forehead)
    rightTemple.x, rightTemple.y                         // End at right temple
  );

  // Actually we need a better forehead curve - use quadratic through top
  ctx.moveTo(leftTemple.x, leftTemple.y);

  // Draw smooth forehead arc
  ctx.quadraticCurveTo(
    foreheadCenterX, foreheadTopY,
    rightTemple.x, rightTemple.y
  );

  // Draw along jawline (points 16 -> 0)
  // Use smooth curve through all jaw points
  for (let i = jawLine.length - 2; i >= 0; i--) {
    const curr = jawLine[i];
    const next = jawLine[Math.max(0, i - 1)];

    // Use quadratic curve for smoother jawline
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }

  ctx.closePath();

  // Fill the mask
  ctx.fill();

  // Stroke to expand the mask area (che lấp phần da cổ/mặt)
  ctx.stroke();

  // Reset filter
  ctx.filter = 'none';

  return canvas;
}

/**
 * Create inverted face mask (face area is transparent, body is visible)
 * Used for face swap: hide overlay's face to reveal base's face underneath
 */
export function createInvertedFaceMask(
  width: number,
  height: number,
  face: FaceDetectionResult,
  foreheadRatio = 0.3,
  strokeWidth = 20
): HTMLCanvasElement {
  // First create normal face mask with smooth edges
  const faceMask = createFaceMask(width, height, face, foreheadRatio, strokeWidth);

  // Create inverted mask
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Fill with white (fully visible)
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Cut out the face area with soft edges
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(faceMask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return canvas;
}

/**
 * Check if face-api is available
 */
export function isFaceApiAvailable(): boolean {
  return typeof faceapi !== 'undefined';
}
