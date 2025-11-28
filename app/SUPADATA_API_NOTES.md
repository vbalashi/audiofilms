# Supadata API Integration Notes

## Correct API Response Structure

The Supadata API returns a different structure than initially expected:

### Response Format

```javascript
{
  "lang": "nl",
  "availableLangs": ["nl"],
  "content": [
    {
      "lang": "nl",
      "text": "Plassen bloed die je vanuit de ruimte kunt zien.",
      "offset": 115,        // Start time in MILLISECONDS
      "duration": 2308      // Duration in MILLISECONDS
    },
    // ... more items
  ]
}
```

### Key Differences from Initial Implementation

| Property | Expected | Actual |
|----------|----------|--------|
| Data array | `segments` | `content` |
| Start time | `start` (seconds) | `offset` (milliseconds) |
| End time | `end` (seconds) | Calculated from `offset + duration` |
| Time unit | Seconds | **Milliseconds** |

## API Parameters

### Required Parameters

```javascript
await supadata.transcript({
  url: 'https://www.youtube.com/watch?v=VIDEO_ID',
  text: false,           // Get timestamped data, not just plain text
  mode: 'native'         // 'native', 'auto', or 'generate'
})
```

### Mode Options

1. **`native`** - Get native/manual subtitles (preferred)
   - Best quality
   - Human-created captions
   - May not be available for all videos

2. **`auto`** - Get auto-generated subtitles
   - Available for most videos
   - Machine-generated
   - May have lower quality

3. **`generate`** - Generate new subtitles using AI transcription
   - Uses Supadata's AI to transcribe audio
   - Slower, may cost more credits
   - Useful when no captions exist

## Implementation Strategy

Our implementation follows this priority:

```
1. Try native captions (manual/human-created)
   ↓ (if empty)
2. Try auto-generated captions
   ↓ (if fails)
3. Try fallback languages: nl → en → de → fr → es
```

## Language Detection

### Auto-Detection

When no language is specified, Supadata attempts to detect the original language:

```javascript
await supadata.transcript({
  url: videoUrl,
  text: false,
  mode: 'native'
  // lang parameter omitted = auto-detect
})
```

### Explicit Language

To force a specific language:

```javascript
await supadata.transcript({
  url: videoUrl,
  lang: 'nl',        // Force Dutch
  text: false,
  mode: 'native'
})
```

## Time Conversion

**IMPORTANT:** Supadata returns times in milliseconds, but our app uses seconds.

```javascript
// Convert Supadata response to our format
const startSec = item.offset / 1000;              // ms → seconds
const durationSec = item.duration / 1000;         // ms → seconds
const endSec = startSec + durationSec;
```

## Error Handling

Common issues:

1. **No content in response**
   - Video may not have subtitles
   - Try different `mode` (native → auto)
   - Try different language

2. **Empty content array**
   - Language not available
   - Fall back to other languages

3. **API rate limits**
   - Implement caching (already done)
   - Respect rate limits

## Example: Working Code

```javascript
import { Supadata } from '@supadata/js';

const supadata = new Supadata({
  apiKey: process.env.SUPADATA_API_KEY,
});

// Get native Dutch subtitles
const response = await supadata.transcript({
  url: 'https://www.youtube.com/watch?v=XeWBlW50T3I',
  text: false,
  mode: 'native'
});

// Transform to our format
const phrases = response.content.map((item, index) => ({
  id: index,
  startSec: item.offset / 1000,
  endSec: (item.offset + item.duration) / 1000,
  text: item.text
}));
```

## Testing

Test video: https://www.youtube.com/watch?v=XeWBlW50T3I
- Language: Dutch (nl)
- Has native manual captions
- Has auto-generated captions in multiple languages

Expected behavior:
1. Auto-detect should pick up 'nl'
2. Native mode should return ~56 phrases
3. Times should be properly converted to seconds

## References

- Supadata Docs: https://docs.supadata.ai
- Supadata SDK: https://github.com/supadata-ai/js (if available)

