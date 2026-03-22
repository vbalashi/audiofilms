import type { SubtitleProvider } from '@/types/subtitles';
import { SupadataProvider } from './SupadataProvider';
import { YtDlpProvider } from './YtDlpProvider';

/**
 * Available subtitle provider types
 */
export type ProviderType = 'supadata' | 'yt-dlp';

export const DEFAULT_SUBTITLE_PROVIDER: ProviderType = 'supadata';
export const DEFAULT_YT_DLP_PATH = '/usr/bin/yt-dlp';

/**
 * Configuration for subtitle providers
 */
export type ProviderConfig = {
  type: ProviderType;
  apiKey?: string; // Required for Supadata
  ytDlpPath?: string; // Optional for YtDlpProvider
};

/**
 * Factory function to create subtitle providers
 * This allows easy switching between providers without code changes
 */
export function createSubtitleProvider(config: ProviderConfig): SubtitleProvider {
  switch (config.type) {
    case 'supadata':
      if (!config.apiKey) {
        throw new Error('API key is required for Supadata provider');
      }
      return new SupadataProvider(config.apiKey);
    
    case 'yt-dlp':
      return new YtDlpProvider(config.ytDlpPath);
    
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

/**
 * Get the configured provider from environment variables
 * This makes it easy to switch providers via environment config
 */
export function getConfiguredProvider(): SubtitleProvider {
  const providerType = (process.env.SUBTITLE_PROVIDER ||
    DEFAULT_SUBTITLE_PROVIDER) as ProviderType;
  
  const config: ProviderConfig = {
    type: providerType,
    apiKey: process.env.SUPADATA_API_KEY,
    ytDlpPath: process.env.YT_DLP_PATH || DEFAULT_YT_DLP_PATH,
  };

  console.log(`[Provider] Using subtitle provider: ${providerType}`);
  
  return createSubtitleProvider(config);
}

export type SubtitleProviderCandidate = {
  type: ProviderType;
  provider: SubtitleProvider;
};

export function getSubtitleProviderCandidates(): SubtitleProviderCandidate[] {
  const configuredType = (process.env.SUBTITLE_PROVIDER ||
    DEFAULT_SUBTITLE_PROVIDER) as ProviderType;
  const candidates: SubtitleProviderCandidate[] = [];
  const attempted = new Set<ProviderType>();

  const maybeAdd = (type: ProviderType) => {
    if (attempted.has(type)) {
      return;
    }
    attempted.add(type);

    try {
      const config: ProviderConfig = {
        type,
        apiKey: process.env.SUPADATA_API_KEY,
        ytDlpPath: process.env.YT_DLP_PATH || DEFAULT_YT_DLP_PATH,
      };
      candidates.push({ type, provider: createSubtitleProvider(config) });
    } catch (error) {
      console.warn(`[Provider] Skipping unavailable subtitle provider "${type}":`, error);
    }
  };

  maybeAdd(configuredType);
  maybeAdd(configuredType === 'supadata' ? 'yt-dlp' : 'supadata');

  return candidates;
}

// Export providers for direct use if needed
export { SupadataProvider, YtDlpProvider };
