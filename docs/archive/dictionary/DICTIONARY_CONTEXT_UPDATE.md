# Dictionary Context and Language Update

## Changes Made

Updated the dictionary system to properly use the subtitle language and full sentence context when requesting word definitions.

## What Was Changed

### 1. Store Updates (`src/store/playerStore.ts`)

**Added:**
- `subtitleLanguage: string | null` - Stores the language of loaded subtitles
- Updated `setPhrases()` to accept optional language parameter

**Why:**
- Needed to know what language the subtitles are in when requesting definitions
- Language is selected in `WatchClient` but wasn't being passed to components that need it

### 2. WatchClient Updates (`src/app/watch/[videoId]/WatchClient.tsx`)

**Changed:**
- `setPhrases(data.phrases, selectedLanguage)` - Now passes the selected language to the store

**Why:**
- Makes the subtitle language available throughout the app
- Dictionary can now use the correct source language

### 3. PlayerLayout Updates (`src/components/PlayerLayout.tsx`)

**Changed:**
- Added `subtitleLanguage` to store hook
- Updated `handleWordClick()` to:
  - Use full subtitle text as context: `context = current?.text`
  - Use subtitle language: `language = subtitleLanguage`
  - Pass both to API: `/api/dict?word=X&language=Y&context=Z`

**Why:**
- Provides context for better, more accurate definitions
- Uses the actual subtitle language instead of assuming English
- Sends full sentence so LLM can understand word usage in context

### 4. OpenRouter Provider Logging (`src/lib/providers/dictionary/OpenRouterDictionaryProvider.ts`)

**Added extensive logging:**

#### Before sending request:
```
[OpenRouter Dictionary] =====================================
[OpenRouter Dictionary] Requesting definition for:
[OpenRouter Dictionary]   Word: "ruimte"
[OpenRouter Dictionary]   Language: nl
[OpenRouter Dictionary]   Context: "Dus ja, we hebben heel veel ruimte."
[OpenRouter Dictionary]   Model: x-ai/grok-4.1-fast:free
[OpenRouter Dictionary] -------------------------------------
[OpenRouter Dictionary] Prompt being sent to LLM:
[OpenRouter Dictionary] Define the word "ruimte" in "nl" using...
[OpenRouter Dictionary] =====================================
```

#### After receiving response:
```
[OpenRouter Dictionary] =====================================
[OpenRouter Dictionary] Response received:
[OpenRouter Dictionary] Definition: Space or room; physical extent...
[OpenRouter Dictionary] Tokens used: 245
[OpenRouter Dictionary] =====================================
```

**Why:**
- Easy to debug prompt issues
- See exactly what's being sent to the LLM
- Verify template variables are replaced correctly
- Monitor token usage

## How It Works Now

### 1. User Selects Language
In `WatchClient.tsx`:
```typescript
setSelectedLanguage('nl')  // User picks Dutch
```

### 2. Language Stored with Subtitles
When subtitles load:
```typescript
setPhrases(data.phrases, 'nl')  // Language stored in global state
```

### 3. User Clicks Word
In subtitle: "Dus ja, we hebben heel veel ruimte."
User clicks: "ruimte"

### 4. Dictionary Request Built
```typescript
{
  word: "ruimte",
  language: "nl",  // From store
  context: "Dus ja, we hebben heel veel ruimte."  // Full subtitle text
}
```

### 5. Prompt Template Filled
```
Define the word "ruimte" in "nl" using a style similar to a monolingual 
dictionary for language learners. Context: "Dus ja, we hebben heel veel ruimte.".

Your answer should be brief, clear, and contain only the definition of target 
word "ruimte".

Avoid cognates or translations unless strictly necessary. If the word functions 
as a part of a phrase, idiom, or collocation, describe its meaning in that phrase 
as well, indicating both standalone and contextual meanings separately.
```

### 6. Logged to Console
All details visible in `npm run dev` output

### 7. Response Displayed
User sees definition in UI

## Template Variables

The prompt template uses three variables that are now properly filled:

| Variable | Example Value | Source |
|----------|--------------|--------|
| `{{word}}` | "ruimte" | Selected word (cleaned) |
| `{{sourceLanguage}}` | "nl" | Subtitle language from store |
| `{{context}}` | "Dus ja, we hebben heel veel ruimte." | Full subtitle text |

## Logging Format

### Request Log:
Shows:
- ✅ Selected word
- ✅ Source language
- ✅ Full context sentence
- ✅ Model being used
- ✅ Complete prompt sent to LLM

### Response Log:
Shows:
- ✅ Definition received
- ✅ Token usage
- ✅ Any errors

## Testing

### Test the full flow:

1. Start dev server:
```bash
cd app
npm run dev
```

2. Open a video with subtitles

3. Select a subtitle language (or use 'auto')

4. Switch to "read" mode (Arrow Down)

5. Click on a word

6. Check terminal logs:
```
[OpenRouter Dictionary] =====================================
[OpenRouter Dictionary] Requesting definition for:
[OpenRouter Dictionary]   Word: "your-word"
[OpenRouter Dictionary]   Language: nl
[OpenRouter Dictionary]   Context: "Full subtitle sentence here"
...
```

### Verify:
- ✅ `{{word}}` is replaced with actual word
- ✅ `{{sourceLanguage}}` is replaced with subtitle language
- ✅ `{{context}}` is replaced with full subtitle text
- ✅ Complete prompt is shown in logs
- ✅ Response definition is shown in logs

## Fallback Behavior

### If language is 'auto':
- Falls back to 'en' (English)
- Still provides context

### If no subtitle text:
- Context will be empty string
- Prompt will say "Context: none" or empty

### If no language set:
- Defaults to 'en' (English)

## Example Log Output

```
[Dictionary Provider] Using provider: openrouter
[OpenRouter Dictionary] =====================================
[OpenRouter Dictionary] Requesting definition for:
[OpenRouter Dictionary]   Word: "ruimte"
[OpenRouter Dictionary]   Language: nl
[OpenRouter Dictionary]   Context: "Dus ja, we hebben heel veel ruimte."
[OpenRouter Dictionary]   Model: x-ai/grok-4.1-fast:free
[OpenRouter Dictionary] -------------------------------------
[OpenRouter Dictionary] Prompt being sent to LLM:
[OpenRouter Dictionary] Define the word "ruimte" in "nl" using a style similar to a monolingual dictionary for language learners. Context: "Dus ja, we hebben heel veel ruimte.".

Your answer should be brief, clear, and contain only the definition of target word "ruimte".

Avoid cognates or translations unless strictly necessary. If the word functions as a part of a phrase, idiom, or collocation, describe its meaning in that phrase as well, indicating both standalone and contextual meanings separately.
[OpenRouter Dictionary] =====================================
[OpenRouter Dictionary] =====================================
[OpenRouter Dictionary] Response received:
[OpenRouter Dictionary] Definition: Ruimte betekent letterlijk 'space' of 'room'. Het verwijst naar een hoeveelheid beschikbare plaats of afstand. In deze context betekent het dat er veel plaats of capaciteit is.
[OpenRouter Dictionary] Tokens used: 189
[OpenRouter Dictionary] =====================================
GET /api/dict?word=ruimte&language=nl&context=Dus%20ja%2C%20we%20hebben%20heel%20veel%20ruimte. 200 in 3.2s
```

## Custom Prompts

You can customize the prompt template via environment variable:

```bash
# .env.local
OPENROUTER_DICTIONARY_PROMPT=Explain "{{word}}" in {{sourceLanguage}}. Context: {{context}}. Be very brief.
```

All three variables (`{{word}}`, `{{sourceLanguage}}`, `{{context}}`) are available.

## Benefits

### Before:
- ❌ No context sent to LLM
- ❌ Always assumed English
- ❌ No way to see what prompt was sent
- ❌ Generic definitions

### After:
- ✅ Full sentence context provided
- ✅ Uses actual subtitle language
- ✅ Complete logging of requests/responses
- ✅ Context-aware definitions
- ✅ Better accuracy for idioms and phrases

## Files Changed

1. `app/src/store/playerStore.ts` - Added subtitle language storage
2. `app/src/app/watch/[videoId]/WatchClient.tsx` - Pass language to store
3. `app/src/components/PlayerLayout.tsx` - Use language and context in API calls
4. `app/src/lib/providers/dictionary/OpenRouterDictionaryProvider.ts` - Added detailed logging

## Next Steps (Optional)

Potential improvements:
1. Auto-detect language from subtitle text if not provided
2. Cache definitions with context for better cache hits
3. Add pronunciation if model supports it
4. Show both standalone and contextual meaning separately in UI
5. Highlight the word in the context sentence


