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

    // Call serverless function
    const response = await fetch('/api/upscale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        scale: request.scale,
        enhanceFace: request.enhanceFace ?? true,
      }),
    });

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
