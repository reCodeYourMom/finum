/**
 * AI Service - Wrapper for Anthropic Claude API
 * Handles all interactions with Claude models
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  model?: 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022';
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  cached?: boolean;
  model: string;
}

/**
 * Send a message to Claude and get a response
 */
export async function generateResponse(
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<AIResponse> {
  const {
    model = 'claude-3-5-sonnet-20241022',
    maxTokens = 2048,
    temperature = 0.7,
    systemPrompt,
    stream = false,
  } = options;

  try {
    if (stream) {
      throw new Error('Streaming not implemented yet');
    }

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Extract text content from response
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n');

    return {
      content: textContent,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
    };
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate response with structured JSON output
 */
export async function generateStructuredResponse<T>(
  messages: AIMessage[],
  schema: object,
  options: AIRequestOptions = {}
): Promise<T> {
  const systemPrompt = `${options.systemPrompt || ''}\n\nYou must respond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;

  const response = await generateResponse(messages, {
    ...options,
    systemPrompt,
    temperature: 0.3, // Lower temperature for more deterministic JSON
  });

  try {
    // Extract JSON from potential markdown code blocks
    let jsonContent = response.content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonContent) as T;
  } catch (error) {
    console.error('Failed to parse AI JSON response:', response.content);
    throw new Error('AI response was not valid JSON');
  }
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = {
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 }, // per million tokens
    'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  };

  const modelPricing = pricing[model as keyof typeof pricing] || pricing['claude-3-5-sonnet-20241022'];

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Check if API key is configured
 */
export function isConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
