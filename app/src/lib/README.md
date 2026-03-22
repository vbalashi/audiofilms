# Subtitle Management System

This directory contains the vendor-agnostic subtitle retrieval and caching system plus service-layer orchestration used by API routes.

## Architecture

### Provider System (`providers/`)

The subtitle provider system allows easy switching between different subtitle APIs without changing application code.

#### Interface: `SubtitleProvider`

All providers implement the `SubtitleProvider` interface defined in `/types/subtitles.ts`:

```typescript
interface SubtitleProvider {
  fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<Phrase[]>;
  readonly name: string;
}
```

#### Available Providers

1. **SupadataProvider** (`providers/SupadataProvider.ts`)
   - Uses the Supadata API for subtitle retrieval
   - Requires API key via `SUPADATA_API_KEY` environment variable
   - Supports multiple languages
   - Production-ready, high reliability

2. **YtDlpProvider** (`providers/YtDlpProvider.ts`)
   - Uses yt-dlp binary for subtitle retrieval
   - No API key required
   - Runs locally
   - Fallback option

#### Configuration

Set the provider via environment variables:

```bash
# .env.local
SUBTITLE_PROVIDER=supadata
SUPADATA_API_KEY=your_api_key_here
```

To switch providers, simply change the `SUBTITLE_PROVIDER` variable:

```bash
SUBTITLE_PROVIDER=yt-dlp
```

### Service Layer

Route handlers should orchestrate through service modules instead of owning provider and cache flow directly.

- `subtitleService.ts`: cache lookup, provider execution, and demo fallback for subtitle responses
- `videoInfoService.ts`: cache lookup plus language metadata shaping for video-info responses
- `dictionaryLookup.ts`: provider execution plus API-ready success/error payload shaping for dictionary lookups

### Caching System (`subtitleCache.ts`)

The caching system stores subtitles as JSON files to minimize API requests.

#### Features

- **File-based storage**: Subtitles cached in `.subtitle-cache/` directory
- **Automatic expiration**: Cached entries expire after 7 days (configurable)
- **Version control**: Cache version prefix prevents stale data issues
- **Graceful degradation**: Cache errors don't break the application

#### Functions

- `getCachedSubtitles(videoId)`: Retrieve cached subtitles
- `setCachedSubtitles(videoId, response)`: Store subtitles in cache
- `clearCache()`: Delete all cached files
- `cleanupExpiredCache()`: Remove expired entries

#### Cache Location

Subtitles are cached in:
```
{project_root}/.subtitle-cache/v3_{videoId}.json
```

Add to `.gitignore`:
```
.subtitle-cache/
```

## Usage Example

### In API Route

```typescript
import { loadSubtitles } from "@/lib/subtitleService";

const response = await loadSubtitles(videoId, "auto");
return response;
```

### Adding a New Provider

1. Create a new provider class implementing `SubtitleProvider`:

```typescript
// providers/MyNewProvider.ts
import type { SubtitleProvider, SubtitleFetchOptions, Phrase } from '@/types/subtitles';

export class MyNewProvider implements SubtitleProvider {
  readonly name = 'my-provider';

  async fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<Phrase[]> {
    // Implementation
  }
}
```

2. Register in `providers/index.ts`:

```typescript
import { MyNewProvider } from './MyNewProvider';

export type ProviderType = 'supadata' | 'yt-dlp' | 'my-provider';

export function createSubtitleProvider(config: ProviderConfig): SubtitleProvider {
  switch (config.type) {
    case 'my-provider':
      return new MyNewProvider(config.apiKey);
    // ... other cases
  }
}
```

3. Use it:

```bash
SUBTITLE_PROVIDER=my-provider
```

## Benefits

- **Vendor Independence**: Switch providers without code changes
- **Cost Optimization**: Caching reduces API calls
- **Reliability**: Multiple fallback providers available
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new providers

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUBTITLE_PROVIDER` | No | `supadata` | Provider to use: `supadata` or `yt-dlp` |
| `SUPADATA_API_KEY` | Yes (for Supadata) | - | API key from Supadata |
| `YT_DLP_PATH` | No | `/usr/bin/yt-dlp` | Path to yt-dlp binary |

## Future Improvements

- [ ] Database-backed caching (PostgreSQL, Redis)
- [ ] Cache warming strategies
- [ ] Subtitle format conversion
- [ ] Multi-language support improvements
- [ ] Analytics on provider performance
- [ ] Rate limiting and retry logic
