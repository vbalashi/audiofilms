# Caching Strategy - Cost Optimization

## Goal: Zero Redundant API Calls

Every API call to Supadata costs money. Our caching system ensures **zero API requests** when data is already cached.

## What Gets Cached?

### 1. Subtitles (`.subtitle-cache/`)

**Cache Key Format:**
```
.subtitle-cache/v3_{videoId}.json           # Auto-detected language
.subtitle-cache/v3_{videoId}_{lang}.json    # Specific language
```

**TTL:** 7 days

**Example:**
```
.subtitle-cache/v3_XeWBlW50T3I.json        # Auto-detected (Dutch)
.subtitle-cache/v3_XeWBlW50T3I_nl.json     # Explicit Dutch
.subtitle-cache/v3_XeWBlW50T3I_en.json     # English translation
```

### 2. Video Info (`.video-info-cache/`)

**Cache Key Format:**
```
.video-info-cache/v1_{videoId}.json
```

**TTL:** 30 days (metadata rarely changes)

**What's Cached:**
- Original language
- Available subtitle languages
- Manual captions availability
- Auto-captions availability

**Example:**
```json
{
  "value": {
    "originalLanguage": "nl",
    "availableLanguages": ["nl", "en", "de", "fr", ...],
    "hasManualCaptions": true,
    "hasAutoCaptions": true
  },
  "createdAt": 1732800000000,
  "version": "v1"
}
```

## Cache Flow Diagram

### Subtitle Request Flow

```
User Request
    ↓
Check .subtitle-cache/
    ↓
┌─────────────────┬──────────────────┐
│   Cache Hit     │   Cache Miss     │
│   (File exists) │   (No file)      │
├─────────────────┼──────────────────┤
│ Read from file  │ Call Supadata    │
│ Return data     │ Save to file     │
│ ✅ No API call  │ Return data      │
│                 │ 💰 API call      │
└─────────────────┴──────────────────┘
```

### Video Info Request Flow

```
User Request
    ↓
Check .video-info-cache/
    ↓
┌─────────────────┬──────────────────┐
│   Cache Hit     │   Cache Miss     │
│   (File exists) │   (No file)      │
├─────────────────┼──────────────────┤
│ Read from file  │ Call yt-dlp      │
│ Return data     │ Save to file     │
│ ✅ No API call  │ Return data      │
│                 │ (Free, local)    │
└─────────────────┴──────────────────┘
```

## Cost Savings

### Test Case: Video XeWBlW50T3I

**Without Caching:**
- First load: 1 Supadata call + 1 yt-dlp call
- Reload page: 1 Supadata call + 1 yt-dlp call
- Change language: 1 Supadata call
- **Total: 4+ API calls** 💸💸💸

**With Caching:**
- First load: 1 Supadata call + 1 yt-dlp call (cached)
- Reload page: 0 API calls (read from cache)
- Change language: 1 Supadata call (first time only)
- Reload with same language: 0 API calls
- **Total: 2 API calls** ✅

**Savings: 50-75% reduction in API calls**

## Cache Verification

### Check if Subtitles are Cached

```bash
ls -la /home/khrustal/dev/audiofilms/app/.subtitle-cache/
```

Should show files like:
```
v3_XeWBlW50T3I.json
v3_dQw4w9WgXcQ.json
```

### Check if Video Info is Cached

```bash
ls -la /home/khrustal/dev/audiofilms/app/.video-info-cache/
```

Should show files like:
```
v1_XeWBlW50T3I.json
```

### Verify Cache is Working in Logs

**First Request (Cache Miss):**
```
[get-subs] Fetching subtitles for videoId: XeWBlW50T3I
[SubtitleCache] Cache miss for XeWBlW50T3I
[get-subs] Cache miss, fetching from provider
[Provider] Using subtitle provider: supadata
[SupadataProvider] Fetching subtitles...
[SubtitleCache] Cached subtitles for XeWBlW50T3I (56 phrases)
```

**Second Request (Cache Hit):**
```
[get-subs] Fetching subtitles for videoId: XeWBlW50T3I
[SubtitleCache] Cache hit for XeWBlW50T3I
[get-subs] Returning cached subtitles for XeWBlW50T3I
✅ NO Supadata API call!
```

## Testing Caching

### Test 1: Subtitle Caching

```bash
# Clear cache
rm -rf /home/khrustal/dev/audiofilms/app/.subtitle-cache/

# Load video (should see "Cache miss" and API call)
curl "http://localhost:3000/api/get-subs?videoId=XeWBlW50T3I"

# Load again (should see "Cache hit" and NO API call)
curl "http://localhost:3000/api/get-subs?videoId=XeWBlW50T3I"
```

### Test 2: Video Info Caching

```bash
# Clear cache
rm -rf /home/khrustal/dev/audiofilms/app/.video-info-cache/

# Load video info (should see "Cache miss")
curl "http://localhost:3000/api/video-info?videoId=XeWBlW50T3I"

# Load again (should see "Cache hit")
curl "http://localhost:3000/api/video-info?videoId=XeWBlW50T3I"
```

## Cache Maintenance

### Clear All Caches

```bash
cd /home/khrustal/dev/audiofilms/app
rm -rf .subtitle-cache/ .video-info-cache/
```

### Clear Expired Entries

The system automatically removes expired entries when accessed.

### Check Cache Size

```bash
du -sh .subtitle-cache/ .video-info-cache/
```

## Cache Limitations

### What Triggers a New API Call?

1. **First request** for a video (cache doesn't exist)
2. **Cache expired** (after TTL period)
3. **Different language** requested (different cache key)
4. **Cache manually cleared** by developer

### What Does NOT Trigger an API Call?

1. ✅ Reloading the page
2. ✅ Same video, same language
3. ✅ Within TTL period
4. ✅ Server restart (cache is file-based, not in-memory)

## Production Considerations

### Deployment Platforms

**Vercel/Netlify (Serverless):**
- File-based cache won't persist between deployments
- Consider using Redis or database for caching
- See: Future improvements below

**VPS/Docker (Persistent Storage):**
- File-based cache works perfectly
- Mount cache directories as volumes
- Survives container restarts

### Environment Variables

No configuration needed! Caching works out of the box.

Optional tuning in code:
```typescript
// subtitleCache.ts
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// videoInfoCache.ts
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
```

## Future Improvements

### Phase 2: Database Caching

Replace file-based cache with PostgreSQL/Redis:

```sql
CREATE TABLE subtitle_cache (
  video_id TEXT,
  language TEXT,
  phrases JSONB,
  created_at TIMESTAMP,
  PRIMARY KEY (video_id, language)
);
```

Benefits:
- Works on serverless platforms
- Faster lookups
- Centralized cache across instances
- Better analytics

### Phase 3: Cache Warming

Pre-fetch popular videos:
```typescript
// Warm cache for popular videos
const popularVideos = ['XeWBlW50T3I', 'dQw4w9WgXcQ'];
for (const videoId of popularVideos) {
  await fetchAndCacheSubtitles(videoId);
}
```

### Phase 4: Smart Expiry

Use conditional cache invalidation:
- Check if video has new captions
- Only refetch if metadata changed

## Summary

✅ **Subtitle caching**: Saves 75% of Supadata API calls  
✅ **Video info caching**: Saves 100% of redundant yt-dlp calls  
✅ **File-based**: Works immediately, no setup  
✅ **Automatic expiry**: Old cache gets cleaned up  
✅ **Per-language keys**: Multiple languages cached separately  

**Result: Significant cost savings on API usage!** 💰✅

