/**
 * Gemini AI API Integration
 * For Virtual Try-On and Image Generation
 */

import type { AITryOnRequest, AITryOnResponse } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiConfig {
  apiKey: string;
  model?: string;
}

let config: GeminiConfig | null = null;

/**
 * Initialize Gemini API
 */
export function initGemini(apiKey: string, model = 'gemini-3-flash'): void {
  config = { apiKey, model };
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
  return config !== null && !!config.apiKey;
}

/**
 * Generate image with Gemini (using Imagen through Gemini)
 */
export async function geminiTryOn(request: AITryOnRequest): Promise<AITryOnResponse> {
  if (!config) {
    return { success: false, error: 'Gemini API not configured' };
  }

  const startTime = Date.now();

  try {
    // Build prompt based on mode
    let prompt = '';

    if (request.mode === 'VIRTUAL_TRYON' && request.clothingImage) {
      prompt = `You are a professional fashion AI. Take this person image and virtually dress them in the provided clothing item.
      Maintain the person's face, pose, and body proportions exactly.
      The clothing should fit naturally and realistically on the person.
      Preserve the background and lighting conditions.
      ${request.preserveFace ? 'IMPORTANT: Keep the face completely unchanged and recognizable.' : ''}
      ${request.enhanceQuality ? 'Enhance the image quality and details.' : ''}`;
    } else if (request.mode === 'AI_GENERATE' && request.clothingDescription) {
      prompt = `You are a professional fashion AI. Take this person image and dress them in: ${request.clothingDescription}
      Maintain the person's face, pose, and body proportions exactly.
      Create a photorealistic result with natural fabric draping and lighting.
      ${request.preserveFace ? 'IMPORTANT: Keep the face completely unchanged and recognizable.' : ''}
      ${request.enhanceQuality ? 'Enhance the image quality and details.' : ''}`;
    } else if (request.mode === 'SEGMENT_REPLACE') {
      prompt = `You are a professional fashion AI. Identify and segment the clothing in this image.
      Replace the current clothing with: ${request.clothingDescription || 'a stylish modern outfit'}
      Keep everything else (face, skin, background) exactly the same.
      ${request.preserveFace ? 'IMPORTANT: Keep the face completely unchanged.' : ''}`;
    }

    // Prepare parts for multimodal request
    const parts: any[] = [{ text: prompt }];

    // Add person image
    parts.push({
      inline_data: {
        mime_type: 'image/png',
        data: request.personImage.replace(/^data:image\/\w+;base64,/, ''),
      },
    });

    // Add clothing image if provided
    if (request.clothingImage) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: request.clothingImage.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }

    const response = await fetch(
      `${GEMINI_API_URL}/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['image', 'text'],
            responseMimeType: 'image/png',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    // Extract image from response
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      return { success: false, error: 'No image generated' };
    }

    const imagePart = candidate.content.parts.find(
      (p: any) => p.inline_data?.mime_type?.startsWith('image/')
    );

    if (!imagePart?.inline_data?.data) {
      return { success: false, error: 'No image in response' };
    }

    return {
      success: true,
      resultImage: `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}`,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Edit image with Gemini
 */
export async function geminiEditImage(
  image: string,
  instruction: string
): Promise<AITryOnResponse> {
  if (!config) {
    return { success: false, error: 'Gemini API not configured' };
  }

  const startTime = Date.now();

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: instruction },
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: image.replace(/^data:image\/\w+;base64,/, ''),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['image', 'text'],
            responseMimeType: 'image/png',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inline_data?.mime_type?.startsWith('image/')
    );

    if (!imagePart?.inline_data?.data) {
      return { success: false, error: 'No image in response' };
    }

    return {
      success: true,
      resultImage: `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}`,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
