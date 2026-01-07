/**
 * Canvas Utilities - Optimized for performance
 */

const MAX_CANVAS_SIZE = 4096;
const THUMBNAIL_SIZE = 80;

// Canvas pool for memory optimization
const canvasPool: HTMLCanvasElement[] = [];

/**
 * Get a canvas from pool or create new one
 */
export function getPooledCanvas(): HTMLCanvasElement {
  return canvasPool.pop() || document.createElement('canvas');
}

/**
 * Return canvas to pool
 */
export function returnToPool(canvas: HTMLCanvasElement): void {
  if (canvasPool.length < 10) {
    canvas.width = 1;
    canvas.height = 1;
    canvasPool.push(canvas);
  }
}

/**
 * Load image from file with optimization
 */
export async function loadImageFromFile(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if too large
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
        const ratio = Math.min(MAX_CANVAS_SIZE / width, MAX_CANVAS_SIZE / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = getPooledCanvas();
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Load image from URL
 */
export async function loadImageFromUrl(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
        const ratio = Math.min(MAX_CANVAS_SIZE / width, MAX_CANVAS_SIZE / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = getPooledCanvas();
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas);
    };

    img.onerror = () => reject(new Error('Failed to load image from URL'));
    img.src = url;
  });
}

/**
 * Load image from base64
 */
export async function loadImageFromBase64(base64: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = getPooledCanvas();
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => reject(new Error('Failed to load image from base64'));

    // Ensure proper base64 format
    if (base64.startsWith('data:')) {
      img.src = base64;
    } else {
      img.src = `data:image/png;base64,${base64}`;
    }
  });
}

/**
 * Create layer mask (white = visible)
 */
export function createLayerMask(width: number, height: number): HTMLCanvasElement {
  const canvas = getPooledCanvas();
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }

  return canvas;
}

/**
 * Create thumbnail for layer
 */
export function createThumbnail(source: HTMLCanvasElement): string {
  const canvas = document.createElement('canvas');
  const ratio = source.width / source.height;

  if (ratio > 1) {
    canvas.width = THUMBNAIL_SIZE;
    canvas.height = Math.floor(THUMBNAIL_SIZE / ratio);
  } else {
    canvas.height = THUMBNAIL_SIZE;
    canvas.width = Math.floor(THUMBNAIL_SIZE * ratio);
  }

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Compose all layers into a single canvas
 */
export function composeLayers(
  layers: Array<{
    image: HTMLCanvasElement | null;
    mask: HTMLCanvasElement | null;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    visible: boolean;
    blendMode: GlobalCompositeOperation;
  }>,
  canvasWidth: number,
  canvasHeight: number
): HTMLCanvasElement {
  const output = getPooledCanvas();
  output.width = canvasWidth;
  output.height = canvasHeight;

  const ctx = output.getContext('2d');
  if (!ctx) return output;

  // Clear with transparent
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw each visible layer
  for (const layer of layers) {
    if (!layer.visible || !layer.image) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;

    // Apply transforms
    const centerX = layer.x + (layer.image.width * layer.scale) / 2;
    const centerY = layer.y + (layer.image.height * layer.scale) / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // If layer has mask, apply it
    if (layer.mask) {
      // Create temp canvas for masked layer
      const temp = document.createElement('canvas');
      temp.width = layer.image.width;
      temp.height = layer.image.height;
      const tempCtx = temp.getContext('2d');

      if (tempCtx) {
        // Draw original image
        tempCtx.drawImage(layer.image, 0, 0);
        // Apply mask
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(layer.mask, 0, 0);
        // Draw masked result
        ctx.drawImage(
          temp,
          layer.x,
          layer.y,
          layer.image.width * layer.scale,
          layer.image.height * layer.scale
        );
      }
    } else {
      ctx.drawImage(
        layer.image,
        layer.x,
        layer.y,
        layer.image.width * layer.scale,
        layer.image.height * layer.scale
      );
    }

    ctx.restore();
  }

  return output;
}

/**
 * Export canvas to blob
 */
export async function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Canvas to base64
 */
export function canvasToBase64(canvas: HTMLCanvasElement, type = 'image/png'): string {
  return canvas.toDataURL(type);
}

/**
 * Download canvas as image
 */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename = 'layermask-export.png'
): Promise<void> {
  const blob = await exportCanvasToBlob(canvas);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Get pixel color at position
 */
export function getPixelColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): [number, number, number, number] {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return [pixel[0], pixel[1], pixel[2], pixel[3]];
}

/**
 * Draw brush stroke on mask
 */
export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hardness: number,
  erase: boolean
): void {
  const radius = size / 2;

  // Create radial gradient for soft brush
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

  if (erase) {
    // Erase mode - paint black (transparent in mask)
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(hardness, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    // Restore mode - paint white (visible in mask)
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(hardness, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Interpolate brush strokes for smooth lines
 */
export function interpolatePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  spacing: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist / spacing);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: x1 + dx * t,
      y: y1 + dy * t,
    });
  }

  return points;
}
