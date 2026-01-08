/**
 * OpenAI API Integration
 * For Virtual Try-On using GPT-4 Vision and DALL-E
 */

import type { AITryOnRequest, AITryOnResponse } from '@/types';

const OPENAI_API_URL = 'https://api.openai.com/v1';

interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

let config: OpenAIConfig | null = null;

/**
 * Initialize OpenAI API
 */
export function initOpenAI(apiKey: string, model = 'gpt-4o-2024-11-20'): void {
  config = { apiKey, model };
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return config !== null && !!config.apiKey;
}

/**
 * Virtual Try-On with OpenAI
 * Uses GPT-4 Vision for analysis and DALL-E for generation
 */
export async function openaiTryOn(request: AITryOnRequest): Promise<AITryOnResponse> {
  if (!config) {
    return { success: false, error: 'OpenAI API not configured' };
  }

  const startTime = Date.now();

  try {
    // Step 1: Analyze the person image with GPT-4 Vision
    let analysisPrompt = '';

    if (request.mode === 'VIRTUAL_TRYON' && request.clothingImage) {
      analysisPrompt = `Analyze this person image for virtual try-on. Describe:
1. The person's pose and body position
2. The lighting conditions
3. The background
4. Current clothing (to be replaced)
5. Key body proportions and features

Then describe how to realistically apply the provided clothing item onto this person.`;
    } else if (request.mode === 'AI_GENERATE') {
      analysisPrompt = `Analyze this person image. Describe their pose, lighting, and background.
Then describe how to dress them in: ${request.clothingDescription}
Create a detailed prompt for generating this outfit on them realistically.`;
    } else {
      analysisPrompt = `Analyze this image and identify the clothing items.
Describe how to replace them with: ${request.clothingDescription || 'a modern stylish outfit'}`;
    }

    // Build messages for analysis
    const messages: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
          {
            type: 'image_url',
            image_url: {
              url: request.personImage.startsWith('data:')
                ? request.personImage
                : `data:image/png;base64,${request.personImage}`,
            },
          },
        ],
      },
    ];

    // Add clothing image if provided
    if (request.clothingImage) {
      messages[0].content.push({
        type: 'image_url',
        image_url: {
          url: request.clothingImage.startsWith('data:')
            ? request.clothingImage
            : `data:image/png;base64,${request.clothingImage}`,
        },
      });
    }

    // Get analysis from GPT-4 Vision
    const analysisResponse = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: 1000,
      }),
    });

    if (!analysisResponse.ok) {
      const error = await analysisResponse.json();
      return {
        success: false,
        error: error.error?.message || `Analysis failed: ${analysisResponse.status}`,
      };
    }

    const analysisData = await analysisResponse.json();
    const analysis = analysisData.choices?.[0]?.message?.content || '';

    // Step 2: Generate/Edit image
    // Use images/edits endpoint to preserve the original image and face
    let generationPrompt = '';

    if (request.mode === 'VIRTUAL_TRYON') {
      generationPrompt = `Based on the analysis: ${analysis}

Edit this image to change ONLY the clothing while keeping the person's face, body, pose, and background EXACTLY the same.
Requirements:
- Keep the EXACT same face - do not change facial features at all
- Keep the same pose and body position
- Keep the same background
- Only replace/modify the clothing
- Natural fabric draping and lighting that matches the original
- Photorealistic quality`;
    } else {
      generationPrompt = `Based on the analysis: ${analysis}

Edit this image to dress the person in: ${request.clothingDescription || 'modern stylish clothing'}
Requirements:
- Keep the EXACT same face - do not change facial features at all
- Keep the same pose and body position
- Keep the same background
- Only change the outfit/clothing
- Natural lighting and fabric textures
- Photorealistic quality`;
    }

    // Try using images/edits endpoint first (preserves original image)
    const formData = new FormData();

    // Convert base64 to blob for the image
    const imageBase64 = request.personImage.startsWith('data:')
      ? request.personImage.split(',')[1]
      : request.personImage;
    const imageBlob = await fetch(`data:image/png;base64,${imageBase64}`).then(r => r.blob());
    formData.append('image', imageBlob, 'image.png');
    formData.append('prompt', generationPrompt);
    formData.append('model', 'gpt-image-1');
    formData.append('size', '1024x1024');
    formData.append('quality', request.enhanceQuality ? 'high' : 'auto');

    const imageResponse = await fetch(`${OPENAI_API_URL}/images/edits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: formData,
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.json();
      return {
        success: false,
        error: error.error?.message || `Generation failed: ${imageResponse.status}`,
      };
    }

    const imageData = await imageResponse.json();
    const generatedImage = imageData.data?.[0]?.b64_json;

    if (!generatedImage) {
      return { success: false, error: 'No image generated' };
    }

    return {
      success: true,
      resultImage: `data:image/png;base64,${generatedImage}`,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Edit image with GPT-4 Vision guidance
 */
export async function openaiEditImage(
  image: string,
  instruction: string
): Promise<AITryOnResponse> {
  if (!config) {
    return { success: false, error: 'OpenAI API not configured' };
  }

  const startTime = Date.now();

  try {
    // First, analyze with GPT-4 Vision
    const analysisResponse = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and describe how to: ${instruction}

Create a detailed DALL-E prompt to achieve this edit while maintaining the original image's quality and style.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: image.startsWith('data:') ? image : `data:image/png;base64,${image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 800,
      }),
    });

    if (!analysisResponse.ok) {
      const error = await analysisResponse.json();
      return { success: false, error: error.error?.message || 'Analysis failed' };
    }

    const analysisData = await analysisResponse.json();
    const editPrompt = analysisData.choices?.[0]?.message?.content || instruction;

    // Generate edited image
    const imageResponse = await fetch(`${OPENAI_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1.5',
        prompt: editPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
      }),
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.json();
      return { success: false, error: error.error?.message || 'Generation failed' };
    }

    const imageData = await imageResponse.json();
    const generatedImage = imageData.data?.[0]?.b64_json;

    if (!generatedImage) {
      return { success: false, error: 'No image generated' };
    }

    return {
      success: true,
      resultImage: `data:image/png;base64,${generatedImage}`,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analyze image with GPT-4 Vision
 */
export async function analyzeImage(image: string, prompt: string): Promise<string> {
  if (!config) {
    throw new Error('OpenAI API not configured');
  }

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: image.startsWith('data:') ? image : `data:image/png;base64,${image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Analysis failed');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
