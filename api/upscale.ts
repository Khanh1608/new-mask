/**
 * Vercel Serverless Function for AI Upscale
 * Keeps REPLICATE_API_TOKEN secure on server-side
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const CRYSTAL_UPSCALER_VERSION = 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'REPLICATE_API_TOKEN not configured. Please add it to Vercel Environment Variables.' });
  }

  try {
    const { image, scale, enhanceFace } = req.body || {};

    // Validate body exists
    if (!req.body) {
      return res.status(400).json({ success: false, error: 'Request body is empty or too large' });
    }

    if (!image || !scale) {
      return res.status(400).json({ success: false, error: 'Missing required fields: image, scale' });
    }

    // Check image size (approximate - base64 is ~33% larger than binary)
    const estimatedSize = image.length * 0.75;
    if (estimatedSize > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'Image too large. Max 10MB.' });
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
        success: false,
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
        return res.status(500).json({ success: false, error: 'Failed to check prediction status' });
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
        return res.status(500).json({ success: false, error: status.error || 'Processing failed' });
      }

      if (status.status === 'canceled') {
        return res.status(500).json({ success: false, error: 'Processing was canceled' });
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return res.status(504).json({ success: false, error: 'Processing timed out' });
  } catch (error) {
    console.error('Upscale error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
