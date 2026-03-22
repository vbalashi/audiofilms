# Dictionary Implementation Summary

## Overview

Implemented a provider-independent dictionary system using LLM (Language Learning Model) for intelligent, context-aware word definitions. The system uses OpenRouter API with the free Grok model by default.

## What Was Implemented

### 1. Type Definitions (`src/types/dictionary.ts`)
- `DictionaryProvider` interface - Standard interface for all dictionary providers
- `DictionaryResult` interface - Structured result format
- `DictionaryError` class - Custom error handling with specific error codes

### 2. OpenRouter Dictionary Provider (`src/lib/providers/dictionary/OpenRouterDictionaryProvider.ts`)
- LLM-based word definitions using OpenRouter API
- Configurable prompt templates with placeholders
- Context-aware definitions
- Multi-language support
- Error handling with specific error codes

### 3. Free Dictionary Provider (`src/lib/providers/dictionary/FreeDictionaryProvider.ts`)
- Fallback provider using free Dictionary API
- English-only support
- No API key required
- Good for basic definitions

### 4. Provider Factory (`src/lib/providers/dictionary/index.ts`)
- `createDictionaryProvider()` - Factory function to create providers
- `getConfiguredDictionaryProvider()` - Gets provider from environment config
- Easy switching between providers via environment variables

### 5. Updated API Route (`src/app/api/dict/route.ts`)
- Now uses the provider system
- Supports additional query parameters:
  - `word` (required) - The word to define
  - `language` (optional, default: 'en') - Source language
  - `context` (optional) - Context sentence
- Improved error handling with specific HTTP status codes

### 6. Environment Configuration (`env.example`)
Added new environment variables:
- `DICTIONARY_PROVIDER` - Choose provider (openrouter or free-dictionary)
- `OPENROUTER_API_KEY` - API key for OpenRouter
- `OPENROUTER_DICTIONARY_MODEL` - Model to use (default: x-ai/grok-beta)
- `OPENROUTER_DICTIONARY_PROMPT` - Custom prompt template (optional)
- `NEXT_PUBLIC_SITE_URL` - Site URL for OpenRouter rankings (optional)
- `NEXT_PUBLIC_SITE_NAME` - Site name for OpenRouter rankings (optional)

## Key Features

### Context-Aware Definitions
The system can use surrounding context to provide more accurate definitions:
```
GET /api/dict?word=bank&language=en&context=I%20deposited%20money%20at%20the%20bank
```

### Configurable Prompts
Customize how definitions are generated via environment variables. The default prompt is optimized for language learners and follows monolingual dictionary style.

### Multi-Language Support
Unlike the previous implementation (English-only), the new system supports any language when using the OpenRouter provider.

### Provider-Independent Architecture
Easy to add new dictionary providers or switch between existing ones without changing application code.

## Default Configuration

```bash
DICTIONARY_PROVIDER=openrouter
OPENROUTER_DICTIONARY_MODEL=google/gemini-flash-1.5
```

**Why x-ai/grok-2-1212?**
- Available via OpenRouter (may have usage limits)
- Good quality definitions
- Fast response times
- Note: Check https://openrouter.ai/models for current free model availability

## Prompt Template

The default prompt template is:

```
Define the word "{{word}}" in "{{sourceLanguage}}" using a style similar to a monolingual dictionary for language learners. Context: "{{context}}".

Your answer should be brief, clear, and contain only the definition of target word "{{word}}".

Avoid cognates or translations unless strictly necessary. If the word functions as a part of a phrase, idiom, or collocation, describe its meaning in that phrase as well, indicating both standalone and contextual meanings separately.
```

This can be customized via the `OPENROUTER_DICTIONARY_PROMPT` environment variable.

## API Changes

### Old API
```bash
GET /api/dict?word=hello
```
Only supported English words, used hardcoded Free Dictionary API.

### New API
```bash
GET /api/dict?word=hello&language=en&context=Hello%20world
```
Supports multiple languages, context-aware, provider-independent.

### Response Format
```json
{
  "result": {
    "word": "hello",
    "language": "en",
    "definition": "A greeting used when meeting someone...",
    "context": "Hello world"
  }
}
```

### Error Response
```json
{
  "error": "Word not found",
  "translateUrl": "https://translate.google.com/..."
}
```

## Setup Instructions

1. Copy `env.example` to `.env.local`
2. Get an OpenRouter API key from https://openrouter.ai/
3. Add your key to `.env.local`:
   ```bash
   OPENROUTER_API_KEY=your_api_key_here
   ```
4. (Optional) Customize the model or prompt

## Migration Notes

The new system is **backward compatible** with existing API calls to `/api/dict?word=xxx`. The default language is 'en', so old calls will work without changes.

## Future Enhancements

Potential improvements:
1. **Caching** - Cache common word definitions to reduce API costs
2. **Rate Limiting** - User-based rate limiting to prevent abuse
3. **Fallback Strategy** - Automatically fall back to Free Dictionary for English words if OpenRouter fails
4. **Audio Pronunciations** - Add pronunciation support
5. **Examples** - Generate usage examples
6. **Related Words** - Show synonyms, antonyms, etc.

## Files Created/Modified

### Created:
- `src/types/dictionary.ts`
- `src/lib/providers/dictionary/OpenRouterDictionaryProvider.ts`
- `src/lib/providers/dictionary/FreeDictionaryProvider.ts`
- `src/lib/providers/dictionary/index.ts`
- `src/lib/providers/dictionary/README.md`
- `DICTIONARY_IMPLEMENTATION.md` (this file)

### Modified:
- `src/app/api/dict/route.ts`
- `env.example`

## Testing

To test the implementation:

1. Start the development server
2. Make a request:
   ```bash
   curl "http://localhost:3000/api/dict?word=test&language=en&context=This%20is%20a%20test"
   ```
3. Check the response for an LLM-generated definition

## Notes

- The free Grok model (`x-ai/grok-beta`) is used by default, but this might change to a paid model in the future
- Always check OpenRouter's pricing page for current model costs
- The system gracefully handles API failures and provides helpful error messages
- Consider implementing caching for production use to reduce costs

