import type {
  DictionaryProvider,
  DictionaryResult,
} from '@/types/dictionary';
import { DictionaryError } from '@/types/dictionary';

/**
 * OpenRouter API response structure
 */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter dictionary provider using LLM for word definitions
 */
export class OpenRouterDictionaryProvider implements DictionaryProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly promptTemplate: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly timeoutMs: number;

  constructor(apiKey: string, model?: string, promptTemplate?: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    this.apiKey = apiKey;
    // Default to x-ai/grok-4.1-fast:free which is free on OpenRouter
    // Check https://openrouter.ai/models for current free offerings
    this.model = model || 'x-ai/grok-4.1-fast:free';
    this.promptTemplate =
      promptTemplate ||
      'Define the word "{{word}}" in "{{sourceLanguage}}" using a style similar to a monolingual dictionary for language learners. Context: "{{context}}".\n\nYour answer should be brief, clear, and contain only the definition of target word "{{word}}".\n\nAvoid cognates or translations unless strictly necessary. If the word functions as a part of a phrase, idiom, or collocation, describe its meaning in that phrase as well, indicating both standalone and contextual meanings separately.';
    this.timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 8000);
  }

  /**
   * Format the prompt with actual values
   */
  private formatPrompt(
    word: string,
    sourceLanguage: string,
    context?: string,
  ): string {
    return this.promptTemplate
      .replace(/\{\{word\}\}/g, word)
      .replace(/\{\{sourceLanguage\}\}/g, sourceLanguage)
      .replace(/\{\{context\}\}/g, context || 'No context provided');
  }

  async getDefinition(
    word: string,
    sourceLanguage: string,
    context?: string,
  ): Promise<DictionaryResult> {
    if (!word || !sourceLanguage) {
      throw new DictionaryError(
        'Word and source language are required',
        'INVALID_INPUT',
      );
    }

    const prompt = this.formatPrompt(word, sourceLanguage, context);
    
    // Log the prompt being sent
    console.log('[OpenRouter Dictionary] =====================================');
    console.log('[OpenRouter Dictionary] Requesting definition for:');
    console.log(`[OpenRouter Dictionary]   Word: "${word}"`);
    console.log(`[OpenRouter Dictionary]   Language: ${sourceLanguage}`);
    console.log(`[OpenRouter Dictionary]   Context: "${context || 'none'}"`);
    console.log(`[OpenRouter Dictionary]   Model: ${this.model}`);
    console.log('[OpenRouter Dictionary] -------------------------------------');
    console.log('[OpenRouter Dictionary] Prompt being sent to LLM:');
    console.log('[OpenRouter Dictionary]', prompt);
    console.log('[OpenRouter Dictionary] =====================================');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      let response: Response;

      try {
        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || '',
            'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'AudioFilms',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            stream: false,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (response.status === 429) {
        throw new DictionaryError(
          'Rate limit exceeded. Please try again later.',
          'RATE_LIMIT',
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', errorText);
        throw new DictionaryError(
          `OpenRouter API request failed: ${response.status}`,
          'API_ERROR',
        );
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        console.error('[OpenRouter Dictionary] No choices in response:', JSON.stringify(data, null, 2));
        throw new DictionaryError(
          'No definition returned from API',
          'NOT_FOUND',
        );
      }

      const definition = data.choices[0].message.content.trim();

      if (!definition) {
        console.error('[OpenRouter Dictionary] Empty definition received');
        throw new DictionaryError(
          'Empty definition returned from API',
          'NOT_FOUND',
        );
      }

      console.log('[OpenRouter Dictionary] =====================================');
      console.log('[OpenRouter Dictionary] Response received:');
      console.log('[OpenRouter Dictionary] Definition:', definition);
      if (data.usage) {
        console.log('[OpenRouter Dictionary] Tokens used:', data.usage.total_tokens);
      }
      console.log('[OpenRouter Dictionary] =====================================');

      return {
        word,
        language: sourceLanguage,
        definition,
        context,
      };
    } catch (error) {
      if (error instanceof DictionaryError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DictionaryError(
          'Dictionary provider timed out',
          'API_ERROR',
        );
      }

      console.error('Error fetching definition from OpenRouter:', error);
      throw new DictionaryError(
        'Failed to fetch definition from OpenRouter',
        'API_ERROR',
      );
    }
  }
}
