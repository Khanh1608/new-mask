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
 */
export async function detectSingleFace(
  canvas: HTMLCanvasElement
): Promise<FaceDetectionResult | null> {
  await loadFaceModels();

  const detection = await faceapi
    .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

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
 */
export function calculateFaceAlignment(
  baseFace: FaceDetectionResult,
  overlayFace: FaceDetectionResult,
  overlayWidth: number,
  overlayHeight: number
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

  // Calculate scale based on eye distance
  const scale = baseEyeDist / overlayEyeDist;

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

  // Calculate final position
  const x = baseEyeCenter.x - transformedX - overlayCenterX * scale;
  const y = baseEyeCenter.y - transformedY - overlayCenterY * scale;

  return { x, y, scale, rotation };
}

/**
 * Create face mask using landmarks
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
    // Fallback: simple ellipse mask
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(
        face.x + face.width / 2,
        face.y + face.height / 2,
        (face.width / 2) * expand,
        (face.height / 2) * expand,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    return canvas;
  }

  const landmarks = face.landmarks;
  const jawLine = landmarks.jawLine;

  // Calculate forehead points based on eye positions
  const eyeCenterY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;
  const faceTop = face.y;
  const foreheadHeight = (eyeCenterY - faceTop) * (1 + foreheadRatio);

  // Create smooth face outline
  ctx.fillStyle = 'white';
  ctx.beginPath();

  // Start from left side of forehead
  const foreheadLeft = {
    x: jawLine[0].x - (face.width * 0.05),
    y: eyeCenterY - foreheadHeight,
  };

  const foreheadRight = {
    x: jawLine[jawLine.length - 1].x + (face.width * 0.05),
    y: eyeCenterY - foreheadHeight,
  };

  // Move to start point
  ctx.moveTo(foreheadLeft.x, foreheadLeft.y);

  // Draw smooth forehead curve using bezier
  const foreheadMid = {
    x: (foreheadLeft.x + foreheadRight.x) / 2,
    y: foreheadLeft.y - (face.height * foreheadRatio * 0.3),
  };

  ctx.quadraticCurveTo(foreheadMid.x, foreheadMid.y, foreheadRight.x, foreheadRight.y);

  // Connect to jaw line
  ctx.lineTo(jawLine[jawLine.length - 1].x, jawLine[jawLine.length - 1].y);

  // Draw along jaw line
  for (let i = jawLine.length - 2; i >= 0; i--) {
    ctx.lineTo(jawLine[i].x, jawLine[i].y);
  }

  // Close path
  ctx.closePath();
  ctx.fill();

  // Apply gaussian blur for smooth edges
  ctx.filter = 'blur(10px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  // Expand the mask slightly
  if (expand !== 1) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      const cx = face.x + face.width / 2;
      const cy = face.y + face.height / 2;

      tempCtx.translate(cx, cy);
      tempCtx.scale(expand, expand);
      tempCtx.translate(-cx, -cy);
      tempCtx.drawImage(canvas, 0, 0);

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  return canvas;
}

/**
 * Check if face-api is available
 */
export function isFaceApiAvailable(): boolean {
  return typeof faceapi !== 'undefined';
}
