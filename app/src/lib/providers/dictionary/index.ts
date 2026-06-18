import type { DictionaryProvider } from '@/types/dictionary';
import { OpenAIDictionaryProvider } from './OpenAIDictionaryProvider';
import { OpenRouterDictionaryProvider } from './OpenRouterDictionaryProvider';
import { FreeDictionaryProvider } from './FreeDictionaryProvider';
import { TwoThousandNlDictionaryProvider } from './TwoThousandNlDictionaryProvider';

/**
 * Available dictionary provider types
 */
export type DictionaryProviderType = 'openai' | 'openrouter' | 'free-dictionary' | '2000nl';

export const DEFAULT_DICTIONARY_PROVIDER: DictionaryProviderType = 'openrouter';
export const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_OPENAI_MODEL = 'gpt-5.2';
export const DEFAULT_OPENROUTER_MODEL = 'x-ai/grok-4.1-fast:free';
export const DEFAULT_2000NL_API_BASE = 'https://2000.dilum.io/api/platform/v1';

/**
 * Configuration for dictionary providers
 */
export type DictionaryProviderConfig = {
  type: DictionaryProviderType;
  // OpenAI specific
  openAiApiKey?: string;
  openAiApiUrl?: string;
  openAiModel?: string;
  openAiPrompt?: string;
  // OpenRouter specific
  openRouterApiKey?: string;
  openRouterModel?: string;
  openRouterPrompt?: string;
  // 2000NL platform API specific
  twoThousandNlApiBase?: string;
  twoThousandNlAccessToken?: string;
  twoThousandNlIncludeUserState?: boolean;
};

export type DictionaryProviderOverrides = {
  twoThousandNlAccessToken?: string;
};

/**
 * Factory function to create dictionary providers
 * This allows easy switching between providers without code changes
 */
export function createDictionaryProvider(
  config: DictionaryProviderConfig,
): DictionaryProvider {
  switch (config.type) {
    case 'openai':
      if (!config.openAiApiKey) {
        throw new Error('OpenAI API key is required for OpenAI provider');
      }
      return new OpenAIDictionaryProvider({
        apiKey: config.openAiApiKey,
        apiUrl: config.openAiApiUrl,
        model: config.openAiModel,
        promptTemplate: config.openAiPrompt,
        timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 8000),
      });

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

    case '2000nl':
      if (!config.twoThousandNlAccessToken) {
        throw new Error('Access token is required for 2000NL dictionary provider');
      }
      return new TwoThousandNlDictionaryProvider({
        apiBase: config.twoThousandNlApiBase || DEFAULT_2000NL_API_BASE,
        accessToken: config.twoThousandNlAccessToken,
        includeUserState: config.twoThousandNlIncludeUserState,
        timeoutMs: Number(process.env.DICTIONARY_2000NL_TIMEOUT_MS || 8000),
      });

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
  const config = getDictionaryProviderConfig(providerType);

  console.log(`[Dictionary Provider] Using provider: ${providerType}`);

  return createDictionaryProvider(config);
}

function getDictionaryProviderConfig(
  providerType: DictionaryProviderType,
  overrides: DictionaryProviderOverrides = {},
): DictionaryProviderConfig {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim() || '';
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY?.trim() || '';
  const azureDeployment =
    process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ||
    process.env.AZURE_OPENAI_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    '';
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || '';
  const openAiApiUrlFromEnv = process.env.OPENAI_API_URL?.trim() || '';
  const openAiApiUrl =
    openAiApiUrlFromEnv ||
    (azureEndpoint
      ? buildAzureOpenAiUrl({
          endpoint: azureEndpoint,
          deployment: azureDeployment,
          apiVersion: azureApiVersion,
        })
      : DEFAULT_OPENAI_API_URL);

  return {
    type: providerType,
    openAiApiKey:
      (azureApiKey || process.env.OPENAI_API_KEY?.trim() || '') || undefined,
    openAiApiUrl,
    openAiModel:
      azureDeployment || process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    openAiPrompt: process.env.OPENAI_DICTIONARY_PROMPT,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    // Default to x-ai/grok-4.1-fast:free - free on OpenRouter
    // Check https://openrouter.ai/models for current offerings
    openRouterModel: process.env.OPENROUTER_DICTIONARY_MODEL || DEFAULT_OPENROUTER_MODEL,
    openRouterPrompt: process.env.OPENROUTER_DICTIONARY_PROMPT,
    twoThousandNlApiBase:
      process.env.DICTIONARY_2000NL_API_BASE?.trim() || DEFAULT_2000NL_API_BASE,
    twoThousandNlAccessToken:
      overrides.twoThousandNlAccessToken ||
      process.env.DICTIONARY_2000NL_ACCESS_TOKEN?.trim(),
    twoThousandNlIncludeUserState: false,
  };
}

export type DictionaryProviderCandidate = {
  type: DictionaryProviderType;
  provider: DictionaryProvider;
};

export function getDictionaryProviderCandidates(
  sourceLanguage: string,
  overrides: DictionaryProviderOverrides = {},
): DictionaryProviderCandidate[] {
  const configuredType = (process.env.DICTIONARY_PROVIDER ||
    DEFAULT_DICTIONARY_PROVIDER) as DictionaryProviderType;
  const candidates: DictionaryProviderCandidate[] = [];
  const attempted = new Set<DictionaryProviderType>();

  const maybeAdd = (type: DictionaryProviderType) => {
    if (attempted.has(type)) {
      return;
    }
    attempted.add(type);

    try {
      const config = getDictionaryProviderConfig(type, overrides);
      candidates.push({ type, provider: createDictionaryProvider(config) });
    } catch (error) {
      console.warn(
        `[Dictionary Provider] Skipping unavailable provider "${type}":`,
        error,
      );
    }
  };

  maybeAdd(configuredType);

  if (configuredType !== '2000nl') {
    maybeAdd('2000nl');
  }

  if (configuredType !== 'openai') {
    maybeAdd('openai');
  }

  if (configuredType !== 'openrouter') {
    maybeAdd('openrouter');
  }

  if (sourceLanguage.toLowerCase() === 'en' || sourceLanguage.toLowerCase() === 'english') {
    maybeAdd('free-dictionary');
  }

  return candidates;
}

// Export providers for direct use if needed
function buildAzureOpenAiUrl(opts: {
  endpoint: string;
  deployment: string;
  apiVersion: string;
}) {
  const rawEndpoint = opts.endpoint.trim().replace(/\/+$/, '');
  if (!rawEndpoint) return '';

  const endpointAlreadyHasChatCompletions = /\/chat\/completions$/i.test(rawEndpoint);
  if (endpointAlreadyHasChatCompletions) return rawEndpoint;

  const endpointHasOpenAiV1 = /\/openai\/v1$/i.test(rawEndpoint);
  const endpointBase = rawEndpoint
    .replace(/\/openai\/v1$/i, '')
    .replace(/\/openai$/i, '');

  if (opts.apiVersion && opts.deployment) {
    return `${endpointBase}/openai/deployments/${encodeURIComponent(
      opts.deployment,
    )}/chat/completions?api-version=${encodeURIComponent(opts.apiVersion)}`;
  }

  if (endpointHasOpenAiV1) {
    return `${rawEndpoint}/chat/completions`;
  }

  return `${endpointBase}/openai/v1/chat/completions`;
}

export {
  OpenAIDictionaryProvider,
  OpenRouterDictionaryProvider,
  FreeDictionaryProvider,
  TwoThousandNlDictionaryProvider,
};
