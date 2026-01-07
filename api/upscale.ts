/**
 * Vercel Serverless Function for AI Upscale
 * Uses Crystal Upscaler via Model Alias endpoint (always latest version)
 * Keeps REPLICATE_API_TOKEN secure on server-side
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Model Alias endpoint - luôn dùng version mới nhất, tránh lỗi 422
const CRYSTAL_UPSCALER_URL = 'https://api.replicate.com/v1/models/philz1337x/clarity-upscaler/predictions';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

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
    console.error('Missing REPLICATE_API_TOKEN');
    return res.status(500).json({ success: false, error: 'REPLICATE_API_TOKEN not configured.' });
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

    // Đảm bảo scale là số nguyên và nằm trong giới hạn cho phép
    const safeScale = Math.min(Math.max(Number(scale) || 4, 1), 10);

    console.log(`Sending request to Clarity Upscaler (Scale: ${safeScale}, Face Enhance: ${enhanceFace})...`);

    // Start prediction - dùng Model Alias endpoint
    const createResponse = await fetch(CRYSTAL_UPSCALER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: image,
          scale_factor: safeScale,
          face_enhance: enhanceFace ?? true,
        },
      }),
    });

    const responseText = await createResponse.text();

    if (createResponse.status !== 201) {
      console.error('Replicate Error:', responseText);
      let errorMessage = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.detail || errorJson.error || responseText;
      } catch {
        // Keep original text
      }
      return res.status(createResponse.status).json({
        success: false,
        error: `Replicate API Error: ${errorMessage}`
      });
    }

    const prediction = JSON.parse(responseText);

    // Poll for result
    const maxAttempts = 120;
    const pollInterval = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(`${REPLICATE_API_URL}/${prediction.id}`, {
        headers: { 'Authorization': `Token ${apiKey}` },
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
        console.error('Prediction failed:', status.error);
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
