# Language Detection & Subtitle Fallback System

## Problem Solved

Previously, the system was hardcoded to fetch only English (`en`) subtitles, which caused failures for videos in other languages like Dutch (as in the test video https://www.youtube.com/watch?v=XeWBlW50T3I).

## Solution Implemented

The system now:

1. **Auto-detects the original language** (default behavior)
2. **Falls back through multiple languages** if the first attempt fails
3. **Provides manual language selection** to users when auto-detection fails

## How It Works

### 1. Automatic Language Detection (SupadataProvider)

The `SupadataProvider` now tries multiple strategies:

```typescript
// Strategy 1: Auto-detect (no lang parameter)
// Supadata API will detect the video's original language

// Strategy 2: Fallback languages
// If auto-detect fails, try: nl → en → de → fr → es
```

**File:** `/app/src/lib/providers/SupadataProvider.ts`

### 2. YouTube Metadata Detection (Optional)

A new utility fetches video metadata to identify:
- Original language of the video
- Available subtitle languages (manual + auto-generated)
- Whether manual or auto-generated captions exist

**File:** `/app/src/lib/youtubeMetadata.ts`

### 3. User Language Selection

If automatic detection fails, users can manually select from available languages through the UI.

**File:** `/app/src/app/watch/[videoId]/WatchClient.tsx`

## API Changes

### GET `/api/get-subs`

**Before:**
```
GET /api/get-subs?videoId=XeWBlW50T3I
// Always used 'en'
```

**Now:**
```
GET /api/get-subs?videoId=XeWBlW50T3I
// Auto-detects language

GET /api/get-subs?videoId=XeWBlW50T3I&lang=nl
// Explicitly request Dutch

GET /api/get-subs?videoId=XeWBlW50T3I&lang=auto
// Same as omitting lang parameter
```

### NEW: GET `/api/video-info`

Returns metadata about available subtitle languages:

```json
{
  "videoId": "XeWBlW50T3I",
  "originalLanguage": "nl",
  "availableLanguages": ["nl", "en", "de"],
  "hasManualCaptions": true,
  "hasAutoCaptions": true
}
```

## User Experience

### For Dutch Video (XeWBlW50T3I)

1. **User loads video** → System auto-detects Dutch
2. **If detection succeeds** → Subtitles load in Dutch
3. **If detection fails** → Error message appears with language selector
4. **User clicks "Try a different language?"** → Shows available languages
5. **User selects "NL"** → Retries with Dutch explicitly

## Language Priority

The system tries languages in this order:

1. **User-selected language** (if manually chosen)
2. **Auto-detected original language** (from Supadata or yt-dlp)
3. **Common fallbacks:** nl → en → de → fr → es

## Caching Behavior

Subtitles are now cached **per language**:

```
.subtitle-cache/v3_XeWBlW50T3I.json        // Auto-detected
.subtitle-cache/v3_XeWBlW50T3I_nl.json     // Explicit Dutch
.subtitle-cache/v3_XeWBlW50T3I_en.json     // Explicit English
```

This allows users to:
- Switch languages without re-fetching
- Maintain separate caches for different language preferences

## Testing

### Test Case 1: Dutch Video (Native)
```
Video: https://www.youtube.com/watch?v=XeWBlW50T3I
Expected: Auto-detects Dutch, loads Dutch subtitles
```

### Test Case 2: English Video
```
Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Expected: Auto-detects English, loads English subtitles
```

### Test Case 3: Manual Selection
```
1. Load Dutch video
2. If error occurs → Click "Try a different language?"
3. Select "NL" → Should load Dutch subtitles
```

## Files Modified

| File | Purpose |
|------|---------|
| `src/lib/providers/SupadataProvider.ts` | Added language fallback logic |
| `src/lib/youtubeMetadata.ts` | NEW - Language detection utilities |
| `src/app/api/get-subs/route.ts` | Changed default from 'en' to 'auto' |
| `src/app/api/video-info/route.ts` | NEW - Video metadata endpoint |
| `src/app/watch/[videoId]/WatchClient.tsx` | Added language selector UI |
| `src/lib/subtitleCache.ts` | Updated caching to include language |

## Benefits

✅ **Works with any language** - No longer hardcoded to English  
✅ **Smart fallbacks** - Tries multiple languages automatically  
✅ **User control** - Manual language selection when needed  
✅ **Better caching** - Per-language cache keys  
✅ **Vendor-agnostic** - Both yt-dlp and Supadata support this  

## Environment Variables

No new environment variables needed. The system works with existing config:

```bash
SUBTITLE_PROVIDER=supadata
SUPADATA_API_KEY=your_key_here
```

## Next Steps (Optional Enhancements)

- [ ] Add language names (e.g., "Dutch" instead of "nl")
- [ ] Remember user's language preference in localStorage
- [ ] Show detected language in UI
- [ ] Add "original audio" badge when detected
- [ ] Support custom language priority via environment variable

