import fs from 'fs';
import path from 'path';
import type { SubtitleResponse } from "@/types/subtitles";

// Bump this when we change the subtitle response structure or selection logic
// so old cached entries don't cause confusing behaviour.
const CACHE_VERSION = "v3";

// Cache directory - will be created if it doesn't exist
const CACHE_DIR = path.join(process.cwd(), '.subtitle-cache');

// Subtitles rarely change; keep them for a reasonable period
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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
 * Check if a cached entry is expired
 */
function isExpired(createdAt: number): boolean {
  return Date.now() - createdAt > TTL_MS;
}

/**
 * Get cached subtitles for a video ID
 * Returns null if not cached or if cache is expired
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

    // Check if expired
    if (isExpired(cacheEntry.createdAt)) {
      console.log(`[SubtitleCache] Cache expired for ${videoId}`);
      fs.unlinkSync(filePath); // Clean up expired cache
      return null;
    }

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
    console.log(`[SubtitleCache] Cached subtitles for ${videoId} (${value.phrases.length} phrases)`);
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
 * Clean up expired cache entries (useful for maintenance)
 */
export function cleanupExpiredCache(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return;
    }

    const files = fs.readdirSync(CACHE_DIR);
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const cacheEntry = JSON.parse(fileContent);
        
        if (isExpired(cacheEntry.createdAt)) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (error) {
        // If we can't parse it, delete it
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SubtitleCache] Cleaned up ${cleaned} expired cache entries`);
    }
  } catch (error) {
    console.error('[SubtitleCache] Error cleaning up cache:', error);
  }
}
