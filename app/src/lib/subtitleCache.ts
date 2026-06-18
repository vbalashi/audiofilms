import fs from 'fs';
import path from 'path';
import { cacheDirectory } from '@/lib/runtimePaths';
import type { SubtitleResponse } from "@/types/subtitles";

// Bump this when we change the subtitle response structure or selection logic
// so old cached entries don't cause confusing behaviour.
const CACHE_VERSION = "v7";

// Cache directory - will be created if it doesn't exist
const CACHE_DIR = cacheDirectory('subtitle-cache', '.subtitle-cache');

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`[SubtitleCache] Created cache directory: ${CACHE_DIR}`);
  }
}

/**
 * Generate cache file path for a video ID
 */
function getCacheFilePath(videoId: string): string {
  const sanitizedVideoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${CACHE_VERSION}_${sanitizedVideoId}.json`);
}

/**
 * Get cached subtitles for a video ID
 * Returns null if not cached. Subtitle cache is intentionally indefinite:
 * YouTube video captions rarely change, and provider/API calls can be paid
 * or rate-limited. Use the API refresh flag for an explicit re-fetch.
 */
export function getCachedSubtitles(videoId: string): SubtitleResponse | null {
  try {
    const filePath = getCacheFilePath(videoId);
    
    if (!fs.existsSync(filePath)) {
      console.log(`[SubtitleCache] Cache miss for ${videoId}`);
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const cacheEntry = JSON.parse(fileContent);

    console.log(`[SubtitleCache] Cache hit for ${videoId}`);
    return cacheEntry.value;
  } catch (error) {
    console.error(`[SubtitleCache] Error reading cache for ${videoId}:`, error);
    return null;
  }
}

/**
 * Save subtitles to cache for a video ID
 */
export function setCachedSubtitles(
  videoId: string,
  value: SubtitleResponse
): void {
  try {
    ensureCacheDir();
    
    const filePath = getCacheFilePath(videoId);
    const cacheEntry = {
      value,
      createdAt: Date.now(),
      version: CACHE_VERSION,
    };

    fs.writeFileSync(filePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
    console.log(
      `[SubtitleCache] Cached subtitles for ${videoId} (${value.phrases.length} source phrases, ${value.practicePhrases?.length || 0} practice phrases)`,
    );
  } catch (error) {
    console.error(`[SubtitleCache] Error writing cache for ${videoId}:`, error);
    // Don't throw - caching is optional, shouldn't break the app
  }
}

/**
 * Clear all cached subtitles (useful for maintenance/debugging)
 */
export function clearCache(): void {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
      console.log(`[SubtitleCache] Cleared ${files.length} cached files`);
    }
  } catch (error) {
    console.error('[SubtitleCache] Error clearing cache:', error);
  }
}

/**
 * Deprecated no-op. Cache is intentionally indefinite.
 */
export function cleanupExpiredCache(): void {
  console.log('[SubtitleCache] cleanupExpiredCache skipped: cache is indefinite');
}
