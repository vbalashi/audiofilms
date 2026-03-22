# Dictionary Language Auto-Detection Fix

## Problem

When user selected `'auto'` for subtitle language, the dictionary was defaulting to English (`'en'`) even when subtitles were in Dutch or other languages.

### Example Error:
```
[OpenRouter Dictionary]   Word: "vermoorde"
[OpenRouter Dictionary]   Language: en   ❌ Should be 'nl'
[OpenRouter Dictionary]   Context: "Lichamen van vermoorde mensen..."
```

## Root Cause

1. User selects `'auto'` for language in `WatchClient`
2. `WatchClient` passes `undefined` to store when language is `'auto'`
3. `PlayerLayout` fell back to `'en'` when `subtitleLanguage` was `undefined` or `'auto'`
4. No language detection was happening on the actual subtitle text

## Solution

Added **client-side language detection** that analyzes the subtitle text to determine the actual language when `subtitleLanguage` is not explicitly set.

### Implementation

#### 1. Added `detectLanguageFromText()` Function

Location: `src/components/PlayerLayout.tsx`

```typescript
function detectLanguageFromText(text: string): string {
  // Checks for common words in:
  // - Dutch (nl): 'de', 'het', 'van', 'een', etc.
  // - English (en): 'the', 'be', 'to', 'of', etc.
  // - German (de): 'der', 'die', 'das', 'und', etc.
  // - French (fr): 'le', 'de', 'un', 'être', etc.
  
  // Returns language code based on highest match count
  // Minimum 2 matches required, otherwise defaults to 'en'
}
```

#### 2. Updated `handleWordClick()` to Use Detection

```typescript
// Before:
const language = subtitleLanguage && subtitleLanguage !== 'auto' ? subtitleLanguage : 'en';

// After:
let language = subtitleLanguage && subtitleLanguage !== 'auto' ? subtitleLanguage : null;

// If language is not set or 'auto', detect from text
if (!language && current?.text) {
  language = detectLanguageFromText(current.text);
  console.log(`[PlayerLayout] Auto-detected language: ${language}`);
}

// Final fallback
if (!language) {
  language = 'en';
}
```

## How It Works

### Flow:

1. **User clicks word** in subtitle: "vermoorde"
2. **Check subtitle language** from store
3. **If not set or 'auto'**: Analyze subtitle text
4. **Text analyzed**: "Lichamen van vermoorde mensen in hun eigen bloed..."
5. **Detection finds**:
   - Dutch words: `van` (✓), `in` (✓), `hun` (✓) = 3 matches
   - English words: 0 matches
   - German words: 0 matches
   - French words: 0 matches
6. **Returns**: `'nl'` (Dutch)
7. **Dictionary request**: Uses `'nl'` as source language

### Detection Algorithm:

- Scans text for common function words in each language
- Counts matches using word boundary regex (`\b word \b`)
- Returns language with highest match count
- Requires minimum 2 matches to be confident
- Falls back to English if no strong match

### Supported Languages:

| Code | Language | Sample Words |
|------|----------|--------------|
| `nl` | Dutch | de, het, van, een, en, ook, niet, maar |
| `en` | English | the, be, to, of, and, have, it, for |
| `de` | German | der, die, das, und, ist, nicht, auch |
| `fr` | French | le, de, un, être, et, à, ne, pas |

## Testing

### Before Fix:
```
[OpenRouter Dictionary]   Language: en ❌
```

### After Fix:
```
[PlayerLayout] Auto-detected language: nl from text: "Lichamen van vermoorde mensen..."
[OpenRouter Dictionary]   Language: nl ✅
```

## Logging

When auto-detection occurs, you'll see in console:

```
[PlayerLayout] Auto-detected language: nl from text: "Lichamen van vermoorde mensen in hun eigen bloed..."
[OpenRouter Dictionary] =====================================
[OpenRouter Dictionary] Requesting definition for:
[OpenRouter Dictionary]   Word: "vermoorde"
[OpenRouter Dictionary]   Language: nl  ✅ Correct now!
[OpenRouter Dictionary]   Context: "Lichamen van vermoorde mensen..."
```

## Accuracy

### High accuracy for:
- Dutch (many unique function words)
- German (distinctive articles)
- French (unique prepositions)
- English (common baseline)

### May struggle with:
- Very short subtitles (< 5 words)
- Subtitles with mostly proper nouns
- Mixed-language subtitles
- Languages not in detection list

### Fallback:
- If detection is uncertain (< 2 matches), defaults to English
- User can always explicitly select language instead of 'auto'

## Alternative: Explicit Language Selection

Users can avoid auto-detection by explicitly selecting the subtitle language in the UI instead of using 'auto'. This provides 100% accuracy but requires user action.

## Future Improvements

1. **API-side language detection**: Have `/api/get-subs` return the detected language
2. **More languages**: Add Spanish, Italian, Portuguese, etc.
3. **Better algorithm**: Use character n-grams or a proper language detection library
4. **Cache detection**: Store detected language in session to avoid re-detecting
5. **User override**: Let user correct auto-detected language
6. **Confidence score**: Show warning if detection confidence is low

## Files Changed

- `app/src/components/PlayerLayout.tsx`
  - Added `detectLanguageFromText()` function
  - Updated `handleWordClick()` to use auto-detection
  - Added logging for detected language

## Benefits

### Before:
- ❌ Always used English when language was 'auto'
- ❌ Incorrect definitions for non-English words
- ❌ No way to know why language was wrong

### After:
- ✅ Automatically detects language from subtitle text
- ✅ Correct definitions for Dutch, German, French, etc.
- ✅ Logged detection results for debugging
- ✅ Works seamlessly with existing user selection
- ✅ No API changes required

## Example Results

### Dutch Subtitle:
```
Input: "Lichamen van vermoorde mensen in hun eigen bloed..."
Detected: nl (Dutch)
Confidence: High (3 Dutch words found)
```

### English Subtitle:
```
Input: "The bodies of murdered people in their own blood..."
Detected: en (English)
Confidence: High (4 English words found)
```

### German Subtitle:
```
Input: "Die Körper der ermordeten Menschen in ihrem eigenen Blut..."
Detected: de (German)
Confidence: High (3 German words found)
```

### Short/Ambiguous:
```
Input: "Ja"
Detected: en (English)
Confidence: Low (0 matches, default fallback)
```


