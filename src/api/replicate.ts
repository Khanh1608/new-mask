/**
 * Replicate API Integration
 * Crystal Upscaler: https://replicate.com/philz1337x/crystal-upscaler
 */

import type { UpscaleRequest, UpscaleResponse } from '@/types';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const CRYSTAL_UPSCALER_MODEL = 'philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e';

let apiKey: string | null = null;

/**
 * Initialize Replicate API with key
 */
export function initReplicate(key?: string): void {
  apiKey = key || import.meta.env.VITE_REPLICATE_API_KEY || null;
}

/**
 * Check if Replicate is configured
 */
export function isReplicateConfigured(): boolean {
  if (!apiKey) {
    initReplicate();
  }
  return !!apiKey;
}

/**
 * Create a prediction (start upscale job)
 */
async function createPrediction(imageBase64: string, scale: number, enhanceFace: boolean): Promise<string> {
  if (!apiKey) {
    throw new Error('Replicate API key not configured');
  }

  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: CRYSTAL_UPSCALER_MODEL.split(':')[1],
      input: {
        image: `data:image/png;base64,${base64Data}`,
        scale_factor: scale,
        resemblance: enhanceFace ? 0.8 : 0.6,
        creativity: 0.3,
        hdr: 0.1,
        prompt: 'masterpiece, best quality, high resolution, detailed',
        negative_prompt: 'blurry, low quality, pixelated, noise',
        num_inference_steps: 18,
        seed: Math.floor(Math.random() * 1000000),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Replicate API error: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Poll for prediction result
 */
async function getPredictionResult(predictionId: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Replicate API key not configured');
  }

  const maxAttempts = 120; // 2 minutes max
  const pollInterval = 1000; // 1 second

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get prediction status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'succeeded') {
      // Crystal Upscaler returns output as a URL string
      const output = data.output;
      if (typeof output === 'string') {
        return output;
      }
      // Or it might be an array
      if (Array.isArray(output) && output.length > 0) {
        return output[0];
      }
      throw new Error('Unexpected output format from Replicate');
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Upscale processing failed');
    }

    if (data.status === 'canceled') {
      throw new Error('Upscale was canceled');
    }

    // Still processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Upscale timed out after 2 minutes');
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
 * Upscale image using Crystal Upscaler
 */
export async function replicateUpscale(request: UpscaleRequest): Promise<UpscaleResponse> {
  try {
    if (!isReplicateConfigured()) {
      return {
        success: false,
        error: 'Replicate API key not configured. Add VITE_REPLICATE_API_KEY to environment.',
      };
    }

    const startTime = Date.now();

    // Start the prediction
    const predictionId = await createPrediction(
      request.image,
      request.scale,
      request.enhanceFace ?? true
    );

    // Wait for result
    const resultUrl = await getPredictionResult(predictionId);

    // Convert result URL to base64
    const resultBase64 = await urlToBase64(resultUrl);

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
