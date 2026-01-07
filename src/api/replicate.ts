/**
 * Replicate API Integration (via Vercel Serverless Function)
 * Crystal Upscaler: https://replicate.com/philz1337x/crystal-upscaler
 *
 * API key is stored securely on server-side as REPLICATE_API_TOKEN
 */

import type { UpscaleRequest, UpscaleResponse } from '@/types';

/**
 * Initialize Replicate API (no-op, server handles auth)
 */
export function initReplicate(_key?: string): void {
  // API key is handled by serverless function
}

/**
 * Check if Replicate is configured
 * In production, always returns true (server handles auth)
 */
export function isReplicateConfigured(): boolean {
  // In production on Vercel, the serverless function will have the API key
  // We always return true and let the server handle auth errors
  return true;
}

/**
 * Convert image URL to base64
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress image to reduce size for upload
 * Fills transparent areas with white (Crystal Upscaler doesn't handle transparency well)
 */
async function compressImage(dataUrl: string, maxWidth = 2048, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if too large
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill with white background first (for transparent areas)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        // Draw image on top
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Convert to JPEG for smaller size
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

/**
 * Upscale image using Crystal Upscaler via serverless function
 */
export async function replicateUpscale(request: UpscaleRequest): Promise<UpscaleResponse> {
  try {
    const startTime = Date.now();

    // Ensure image has data URL prefix
    let imageData = request.image;
    if (!imageData.startsWith('data:')) {
      imageData = `data:image/png;base64,${imageData}`;
    }

    // Compress image to avoid payload too large error (Vercel limit ~4.5MB)
    const compressedImage = await compressImage(imageData, 1536, 0.8);

    // Check payload size
    const payloadSize = compressedImage.length;
    if (payloadSize > 4 * 1024 * 1024) {
      return {
        success: false,
        error: 'Image is too large. Please use a smaller image (max ~4MB after compression).',
      };
    }

    // Call serverless function
    const response = await fetch('/api/upscale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: compressedImage,
        scale: request.scale,
        enhanceFace: request.enhanceFace ?? true,
      }),
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      return {
        success: false,
        error: `Server error: ${text.substring(0, 100)}...`,
      };
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Server error: ${response.status}`,
      };
    }

    // Convert result URL to base64
    const resultBase64 = await urlToBase64(data.resultUrl);
    const processingTime = Date.now() - startTime;

    return {
      success: true,
      resultImage: resultBase64,
      processingTime,
    };
  } catch (error) {
    console.error('Replicate upscale error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
