import type { DictionaryProvider } from '@/types/dictionary';
import { OpenRouterDictionaryProvider } from './OpenRouterDictionaryProvider';
import { FreeDictionaryProvider } from './FreeDictionaryProvider';

/**
 * Available dictionary provider types
 */
export type DictionaryProviderType = 'openrouter' | 'free-dictionary';

export const DEFAULT_DICTIONARY_PROVIDER: DictionaryProviderType = 'openrouter';
export const DEFAULT_OPENROUTER_MODEL = 'x-ai/grok-4.1-fast:free';

/**
 * Configuration for dictionary providers
 */
export type DictionaryProviderConfig = {
  type: DictionaryProviderType;
  // OpenRouter specific
  openRouterApiKey?: string;
  openRouterModel?: string;
  openRouterPrompt?: string;
};

/**
 * Factory function to create dictionary providers
 * This allows easy switching between providers without code changes
 */
export function createDictionaryProvider(
  config: DictionaryProviderConfig,
): DictionaryProvider {
  switch (config.type) {
    case 'openrouter':
      if (!config.openRouterApiKey) {
        throw new Error('OpenRouter API key is required for OpenRouter provider');
      }
      return new OpenRouterDictionaryProvider(
        config.openRouterApiKey,
        config.openRouterModel,
        config.openRouterPrompt,
      );

    case 'free-dictionary':
      return new FreeDictionaryProvider();

    default:
      throw new Error(`Unknown dictionary provider type: ${config.type}`);
  }
}

/**
 * Get the configured dictionary provider from environment variables
 * This makes it easy to switch providers via environment config
 */
export function getConfiguredDictionaryProvider(): DictionaryProvider {
  const providerType = (process.env.DICTIONARY_PROVIDER ||
    DEFAULT_DICTIONARY_PROVIDER) as DictionaryProviderType;

  const config: DictionaryProviderConfig = {
    type: providerType,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    // Default to x-ai/grok-4.1-fast:free - free on OpenRouter
    // Check https://openrouter.ai/models for current offerings
    openRouterModel: process.env.OPENROUTER_DICTIONARY_MODEL || DEFAULT_OPENROUTER_MODEL,
    openRouterPrompt: process.env.OPENROUTER_DICTIONARY_PROMPT,
  };

  console.log(`[Dictionary Provider] Using provider: ${providerType}`);

  return createDictionaryProvider(config);
}

// Export providers for direct use if needed
export { OpenRouterDictionaryProvider, FreeDictionaryProvider };
