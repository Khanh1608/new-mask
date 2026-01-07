/**
 * Vercel Serverless Function for AI Upscale
 * Keeps REPLICATE_API_TOKEN secure on server-side
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const CRYSTAL_UPSCALER_VERSION = 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
  }

  try {
    const { image, scale, enhanceFace } = req.body;

    if (!image || !scale) {
      return res.status(400).json({ error: 'Missing required fields: image, scale' });
    }

    // Start prediction
    const createResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: CRYSTAL_UPSCALER_VERSION,
        input: {
          image: image,
          scale_factor: scale,
          resemblance: enhanceFace ? 0.8 : 0.6,
          creativity: 0.3,
          hdr: 0.1,
          prompt: 'masterpiece, best quality, high resolution, detailed',
          negative_prompt: 'blurry, low quality, pixelated, noise',
          num_inference_steps: 18,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({}));
      return res.status(createResponse.status).json({
        error: error.detail || `Replicate API error: ${createResponse.status}`
      });
    }

    const prediction = await createResponse.json();

    // Poll for result
    const maxAttempts = 120;
    const pollInterval = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(`${REPLICATE_API_URL}/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!statusResponse.ok) {
        return res.status(500).json({ error: 'Failed to check prediction status' });
      }

      const status = await statusResponse.json();

      if (status.status === 'succeeded') {
        const output = Array.isArray(status.output) ? status.output[0] : status.output;
        return res.status(200).json({
          success: true,
          resultUrl: output,
        });
      }

      if (status.status === 'failed') {
        return res.status(500).json({ error: status.error || 'Processing failed' });
      }

      if (status.status === 'canceled') {
        return res.status(500).json({ error: 'Processing was canceled' });
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return res.status(504).json({ error: 'Processing timed out' });
  } catch (error) {
    console.error('Upscale error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
