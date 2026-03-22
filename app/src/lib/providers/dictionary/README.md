# Dictionary Provider System

This directory contains the dictionary provider implementation for fetching word definitions.

## Overview

The dictionary provider system uses a provider-based architecture similar to the subtitle provider system. This allows easy switching between different dictionary services without changing application code.

## Available Providers

### OpenRouter Dictionary Provider

Uses Large Language Models (LLMs) via OpenRouter API to provide intelligent, context-aware word definitions.

This is the current runtime default dictionary provider.

**Features:**
- Multi-language support
- Context-aware definitions
- Configurable prompts
- Support for idioms and collocations
- Monolingual dictionary style (ideal for language learners)

**Configuration:**
```bash
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_DICTIONARY_MODEL=x-ai/grok-4.1-fast:free
```

**Supported Models:**
- `x-ai/grok-4.1-fast:free` (current runtime default)
- `google/gemini-flash-1.5`
- `openai/gpt-3.5-turbo` (paid, good balance of speed and cost)
- `anthropic/claude-3-5-sonnet` (paid, excellent quality)
- `openai/gpt-4` (paid, high quality)
- Any other OpenRouter-supported model (see https://openrouter.ai/models)
- **IMPORTANT**: Model availability changes frequently - always verify on OpenRouter

### Free Dictionary Provider

Uses the free Dictionary API (dictionaryapi.dev) as a fallback.

This is the explicit fallback provider, not the default.

**Features:**
- Completely free
- No API key required
- Provides definitions with examples

**Limitations:**
- English only
- No context awareness
- Limited vocabulary coverage

**Configuration:**
```bash
DICTIONARY_PROVIDER=free-dictionary
```

## Usage

### In API Routes

```typescript
import { getConfiguredDictionaryProvider } from '@/lib/providers/dictionary';

const provider = getConfiguredDictionaryProvider();
const result = await provider.getDefinition(
  'word',      // The word to define
  'en',        // Source language
  'context'    // Optional: sentence containing the word
);

console.log(result.definition);
```

### Direct Provider Usage

```typescript
import { OpenRouterDictionaryProvider } from '@/lib/providers/dictionary';

const provider = new OpenRouterDictionaryProvider(
  'your-api-key',
  'google/gemini-flash-1.5',  // optional model
  'custom prompt template'  // optional custom prompt
);

const result = await provider.getDefinition('hello', 'en');
```

## Custom Prompt Template

You can customize how the LLM generates definitions by setting the `OPENROUTER_DICTIONARY_PROMPT` environment variable.

**Available placeholders:**
- `{{word}}` - The word being defined
- `{{sourceLanguage}}` - The language of the word
- `{{context}}` - The context sentence (if provided)

**Default prompt:**
```
Define the word "{{word}}" in "{{sourceLanguage}}" using a style similar to a monolingual dictionary for language learners. Context: "{{context}}".

Your answer should be brief, clear, and contain only the definition of target word "{{word}}".

Avoid cognates or translations unless strictly necessary. If the word functions as a part of a phrase, idiom, or collocation, describe its meaning in that phrase as well, indicating both standalone and contextual meanings separately.
```

## API Endpoint

**GET** `/api/dict`

**Query Parameters:**
- `word` (required) - The word to define
- `language` (optional) - The source language (default: 'en')
- `context` (optional) - Context sentence containing the word

**Example:**
```bash
curl "http://localhost:3000/api/dict?word=hello&language=en&context=Hello%20world"
```

**Response:**
```json
{
  "result": {
    "word": "hello",
    "language": "en",
    "definition": "A greeting used when meeting someone or starting a conversation...",
    "context": "Hello world"
  }
}
```

**Error Response:**
```json
{
  "error": "Word not found",
  "translateUrl": "https://translate.google.com/..."
}
```

## Error Handling

The system uses a custom `DictionaryError` class with the following error codes:

- `NOT_FOUND` - Word not found in dictionary (404)
- `RATE_LIMIT` - API rate limit exceeded (429)
- `INVALID_INPUT` - Missing or invalid parameters (400)
- `API_ERROR` - General API error (500)

## Adding a New Provider

1. Create a new provider class that implements the `DictionaryProvider` interface:

```typescript
import type { DictionaryProvider, DictionaryResult } from '@/types/dictionary';

export class MyCustomProvider implements DictionaryProvider {
  async getDefinition(
    word: string,
    sourceLanguage: string,
    context?: string
  ): Promise<DictionaryResult> {
    // Your implementation
  }
}
```

2. Add the provider to the factory in `index.ts`:

```typescript
case 'my-custom':
  return new MyCustomProvider(/* config */);
```

3. Update the environment configuration to support the new provider.

## Testing

To test the dictionary provider:

1. Set up your `.env.local` with the appropriate configuration
2. Make a request to `/api/dict?word=test&language=en`
3. Check the response for the definition

## Cost Considerations

### OpenRouter Provider
- Some models may be free or have usage limits (check OpenRouter's current offerings)
- Paid models charge per token (typically $0.001-0.01 per request)
- Consider implementing caching for frequently looked-up words
- Always check https://openrouter.ai/models for current pricing

### Free Dictionary Provider
- Completely free
- No rate limits (reasonable use)
- Good fallback option

## Best Practices

1. **Use context when available** - Provides more accurate definitions
2. **Cache results** - Implement caching to reduce API calls and costs
3. **Fallback strategy** - Consider falling back to Free Dictionary for English words
4. **Rate limiting** - Implement user-side rate limiting to prevent abuse
5. **Error handling** - Always handle errors gracefully with user-friendly messages
