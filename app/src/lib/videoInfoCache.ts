import fs from 'fs';
import path from 'path';
import type { YouTubeLanguageInfo } from './youtubeMetadata';

const CACHE_VERSION = "v1";
const CACHE_DIR = path.join(process.cwd(), '.video-info-cache');
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days (video metadata rarely changes)

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`[VideoInfoCache] Created cache directory: ${CACHE_DIR}`);
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
 * Get cached video info for a video ID
 * Returns null if not cached or if cache is expired
 */
export function getCachedVideoInfo(videoId: string): YouTubeLanguageInfo | null {
  try {
    const filePath = getCacheFilePath(videoId);
    
    if (!fs.existsSync(filePath)) {
      console.log(`[VideoInfoCache] Cache miss for ${videoId}`);
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const cacheEntry = JSON.parse(fileContent);

    // Check if expired
    if (isExpired(cacheEntry.createdAt)) {
      console.log(`[VideoInfoCache] Cache expired for ${videoId}`);
      fs.unlinkSync(filePath); // Clean up expired cache
      return null;
    }

    console.log(`[VideoInfoCache] Cache hit for ${videoId}`);
    return cacheEntry.value;
  } catch (error) {
    console.error(`[VideoInfoCache] Error reading cache for ${videoId}:`, error);
    return null;
  }
}

/**
 * Save video info to cache for a video ID
 */
export function setCachedVideoInfo(
  videoId: string,
  value: YouTubeLanguageInfo
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
    console.log(`[VideoInfoCache] Cached video info for ${videoId}`);
  } catch (error) {
    console.error(`[VideoInfoCache] Error writing cache for ${videoId}:`, error);
    // Don't throw - caching is optional, shouldn't break the app
  }
}

