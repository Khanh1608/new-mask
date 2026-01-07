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
 * Create face mask using landmarks with smooth edges
 * Uses bezier curves and proper feathering for natural look
 */
export function createFaceMask(
  width: number,
  height: number,
  face: FaceDetectionResult,
  foreheadRatio = 0.3,
  expand = 1.1
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
      const rx = (face.width / 2) * expand;
      const ry = (face.height / 2) * expand;

      // Create radial gradient for soft edges
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(0.7, 'white');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.2, ry * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }

  const landmarks = face.landmarks;
  const jawLine = landmarks.jawLine;

  // Calculate key points
  const eyeCenterY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;
  const faceTop = face.y;
  const foreheadHeight = (eyeCenterY - faceTop) * (1 + foreheadRatio);

  // Expand factor for the mask
  const ex = expand;

  // Create face center for gradient
  const faceCenterX = face.x + face.width / 2;
  const faceCenterY = face.y + face.height / 2;

  // Create smooth path using bezier curves
  ctx.fillStyle = 'white';
  ctx.beginPath();

  // Forehead points (expanded)
  const foreheadLeft = {
    x: faceCenterX - (face.width * 0.55 * ex),
    y: eyeCenterY - foreheadHeight * ex,
  };
  const foreheadRight = {
    x: faceCenterX + (face.width * 0.55 * ex),
    y: eyeCenterY - foreheadHeight * ex,
  };
  const foreheadTop = {
    x: faceCenterX,
    y: eyeCenterY - foreheadHeight * ex * 1.1,
  };

  // Start from left temple
  ctx.moveTo(foreheadLeft.x, foreheadLeft.y);

  // Draw forehead with smooth curve
  ctx.bezierCurveTo(
    foreheadLeft.x + face.width * 0.2, foreheadTop.y,
    foreheadRight.x - face.width * 0.2, foreheadTop.y,
    foreheadRight.x, foreheadRight.y
  );

  // Draw right side of face using smooth bezier through jaw points
  // Use every other jaw point for smoother curve
  const rightJaw = jawLine.slice(Math.floor(jawLine.length / 2));
  if (rightJaw.length > 2) {
    const p1 = rightJaw[0];
    const p2 = rightJaw[Math.floor(rightJaw.length / 2)];
    const p3 = rightJaw[rightJaw.length - 1];

    // Expand points outward from face center
    const expandPoint = (p: {x: number, y: number}) => ({
      x: faceCenterX + (p.x - faceCenterX) * ex,
      y: faceCenterY + (p.y - faceCenterY) * ex,
    });

    const ep1 = expandPoint(p1);
    const ep2 = expandPoint(p2);
    const ep3 = expandPoint(p3);

    ctx.bezierCurveTo(
      foreheadRight.x + face.width * 0.05, ep1.y - face.height * 0.1,
      ep1.x + face.width * 0.05, ep1.y,
      ep1.x, ep1.y
    );
    ctx.quadraticCurveTo(ep2.x, ep2.y, ep3.x, ep3.y);
  }

  // Draw left side of face (mirror of right side)
  const leftJaw = jawLine.slice(0, Math.floor(jawLine.length / 2) + 1).reverse();
  if (leftJaw.length > 2) {
    const p2 = leftJaw[Math.floor(leftJaw.length / 2)];
    const p3 = leftJaw[leftJaw.length - 1];

    const expandPoint = (p: {x: number, y: number}) => ({
      x: faceCenterX + (p.x - faceCenterX) * ex,
      y: faceCenterY + (p.y - faceCenterY) * ex,
    });

    const ep2 = expandPoint(p2);
    const ep3 = expandPoint(p3);

    ctx.quadraticCurveTo(ep2.x, ep2.y, ep3.x, ep3.y);
    ctx.bezierCurveTo(
      ep3.x - face.width * 0.05, ep3.y,
      foreheadLeft.x - face.width * 0.05, ep3.y - face.height * 0.1,
      foreheadLeft.x, foreheadLeft.y
    );
  }

  ctx.closePath();
  ctx.fill();

  // Apply multiple blur passes for smooth feathering
  applyGaussianBlur(ctx, canvas, width, height, 15);
  applyGaussianBlur(ctx, canvas, width, height, 10);
  applyGaussianBlur(ctx, canvas, width, height, 5);

  return canvas;
}

/**
 * Apply gaussian blur effect using canvas filter
 */
function applyGaussianBlur(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  radius: number
): void {
  // Create temp canvas for blur
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');

  if (tempCtx) {
    tempCtx.filter = `blur(${radius}px)`;
    tempCtx.drawImage(canvas, 0, 0);

    // Draw back to original
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, 0, 0);
  }
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
  expand = 1.2
): HTMLCanvasElement {
  // First create normal face mask with smooth edges
  const faceMask = createFaceMask(width, height, face, foreheadRatio, expand);

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
