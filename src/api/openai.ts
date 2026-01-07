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
export function initOpenAI(apiKey: string, model = 'gpt-4o'): void {
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

    // Step 2: Generate image with DALL-E 3
    let generationPrompt = '';

    if (request.mode === 'VIRTUAL_TRYON') {
      generationPrompt = `Create a photorealistic image of a person wearing specific clothing.

Based on analysis: ${analysis}

Requirements:
- Photorealistic quality
- Natural fabric draping and lighting
- Maintain exact pose and proportions from reference
- ${request.preserveFace ? 'Preserve facial features exactly' : 'Realistic face'}
- Professional fashion photography style
- ${request.enhanceQuality ? 'High detail, 4K quality' : 'Standard quality'}`;
    } else {
      generationPrompt = `Create a photorealistic fashion image:

${analysis}

Requirements:
- Outfit: ${request.clothingDescription || 'modern stylish clothing'}
- Photorealistic quality
- Natural lighting and fabric textures
- Professional fashion photography
- ${request.enhanceQuality ? 'Ultra high detail' : 'Standard detail'}`;
    }

    const imageResponse = await fetch(`${OPENAI_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: generationPrompt,
        n: 1,
        size: '1024x1024',
        quality: request.enhanceQuality ? 'hd' : 'standard',
        response_format: 'b64_json',
      }),
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
        model: 'dall-e-3',
        prompt: editPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        response_format: 'b64_json',
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
