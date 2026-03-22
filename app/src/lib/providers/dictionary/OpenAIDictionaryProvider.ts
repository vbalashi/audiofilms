import type { DictionaryProvider, DictionaryResult } from '@/types/dictionary';
import { DictionaryError } from '@/types/dictionary';

type OpenAIDictionaryProviderOptions = {
  apiKey: string;
  apiUrl?: string;
  model?: string;
  promptTemplate?: string;
  timeoutMs?: number;
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5.2';
const DEFAULT_TIMEOUT_MS = 8000;

function looksLikeAzureOpenAI(apiUrl: string) {
  const url = (apiUrl || '').toLowerCase();
  return url.includes('.openai.azure.com') || url.includes('azure.com/openai/');
}

function resolveChatCompletionsUrl(apiUrl: string) {
  const trimmed = (apiUrl || '').trim();
  if (!trimmed) return trimmed;

  if (/\/openai\/v1\/?$/i.test(trimmed)) {
    return `${trimmed.replace(/\/+$/, '')}/chat/completions`;
  }

  return trimmed;
}

export class OpenAIDictionaryProvider implements DictionaryProvider {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly promptTemplate: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAIDictionaryProviderOptions) {
    if (!options.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = options.apiKey;
    this.apiUrl = resolveChatCompletionsUrl(options.apiUrl ?? DEFAULT_API_URL);
    this.model = options.model ?? DEFAULT_MODEL;
    this.promptTemplate =
      options.promptTemplate ||
      'Define the word "{{word}}" in "{{sourceLanguage}}" using a style similar to a monolingual dictionary for language learners. Context: "{{context}}".\n\nYour answer should be brief, clear, and contain only the definition of target word "{{word}}".\n\nAvoid cognates or translations unless strictly necessary. If the word functions as a part of a phrase, idiom, or collocation, describe its meaning in that phrase as well, indicating both standalone and contextual meanings separately.';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private formatPrompt(word: string, sourceLanguage: string, context?: string) {
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const isAzure = looksLikeAzureOpenAI(this.apiUrl);
    const prompt = this.formatPrompt(word, sourceLanguage, context);

    try {
      const includeModel = !isAzure || !/\/openai\/deployments\//i.test(this.apiUrl);
      const body: Record<string, unknown> = {
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      if (includeModel) {
        body.model = this.model;
      }

      if (this.model.startsWith('gpt-5')) {
        body.reasoning_effort = 'none';
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAzure
            ? { 'api-key': this.apiKey }
            : { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new DictionaryError(
          'Rate limit exceeded. Please try again later.',
          'RATE_LIMIT',
        );
      }

      const data = (await response.json().catch(() => null)) as OpenAIChatResponse | null;

      if (!response.ok) {
        const errorMessage = data?.error?.message?.trim();
        throw new DictionaryError(
          errorMessage || `OpenAI API request failed: ${response.status}`,
          'API_ERROR',
        );
      }

      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new DictionaryError(
          'No definition returned from API',
          'NOT_FOUND',
        );
      }

      return {
        word,
        language: sourceLanguage,
        definition: content,
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

      throw new DictionaryError(
        'Failed to fetch definition from OpenAI',
        'API_ERROR',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
