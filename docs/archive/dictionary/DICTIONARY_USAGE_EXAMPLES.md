# Dictionary Provider Usage Examples

## Quick Start

### 1. Setup Environment

First, copy the example environment file and add your OpenRouter API key:

```bash
cp app/env.example app/.env.local
```

Edit `.env.local` and add:

```bash
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_DICTIONARY_MODEL=google/gemini-flash-1.5
```

### 2. Basic API Calls

#### Simple word lookup (English)
```bash
curl "http://localhost:3000/api/dict?word=hello"
```

Response:
```json
{
  "result": {
    "word": "hello",
    "language": "en",
    "definition": "A common greeting used when meeting someone or starting a conversation. It expresses friendliness and acknowledgment of another person's presence."
  }
}
```

#### Word with context
```bash
curl "http://localhost:3000/api/dict?word=bank&language=en&context=I%20need%20to%20go%20to%20the%20bank"
```

Response:
```json
{
  "result": {
    "word": "bank",
    "language": "en",
    "definition": "In this context, 'bank' refers to a financial institution where people deposit, withdraw, and manage money. Standalone meaning: A bank can also refer to the edge of a river or raised ground beside water.",
    "context": "I need to go to the bank"
  }
}
```

#### Multi-language support (Spanish)
```bash
curl "http://localhost:3000/api/dict?word=casa&language=es"
```

Response:
```json
{
  "result": {
    "word": "casa",
    "language": "es",
    "definition": "Un edificio donde las personas viven, especialmente una familia. Es el lugar donde alguien reside habitualmente."
  }
}
```

## Frontend Integration

### Using in a React Component

```typescript
'use client';

import { useState } from 'react';

interface DictionaryResult {
  word: string;
  language: string;
  definition: string;
  context?: string;
}

export function WordLookup() {
  const [word, setWord] = useState('');
  const [language, setLanguage] = useState('en');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookupWord = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        word,
        language,
        ...(context && { context }),
      });

      const response = await fetch(`/api/dict?${params}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch definition');
        return;
      }

      setResult(data.result);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label>Word:</label>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter word"
          className="border p-2"
        />
      </div>

      <div>
        <label>Language:</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border p-2"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>

      <div>
        <label>Context (optional):</label>
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Sentence containing the word"
          className="border p-2 w-full"
        />
      </div>

      <button
        onClick={lookupWord}
        disabled={!word || loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
      >
        {loading ? 'Looking up...' : 'Look Up'}
      </button>

      {error && (
        <div className="text-red-500 p-4 border border-red-300 bg-red-50">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold text-lg">{result.word}</h3>
          <p className="text-sm text-gray-600 mb-2">
            Language: {result.language}
          </p>
          {result.context && (
            <p className="text-sm text-gray-600 mb-2">
              Context: <em>{result.context}</em>
            </p>
          )}
          <p className="mt-2">{result.definition}</p>
        </div>
      )}
    </div>
  );
}
```

### Using with Subtitle Text Selection

```typescript
'use client';

import { useState } from 'react';

interface SubtitleWithLookup {
  text: string;
  onWordSelect: (word: string, context: string) => void;
}

export function SubtitleText({ text, onWordSelect }: SubtitleWithLookup) {
  const handleTextSelect = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText && selectedText.length > 0) {
      // Get surrounding context (the full subtitle line)
      onWordSelect(selectedText, text);
    }
  };

  return (
    <p
      onMouseUp={handleTextSelect}
      className="cursor-text select-text hover:bg-blue-50"
    >
      {text}
    </p>
  );
}

// Parent component
export function VideoPlayer() {
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    context: string;
  } | null>(null);

  const handleWordSelect = async (word: string, context: string) => {
    setSelectedWord({ word, context });
    
    // Fetch definition
    const response = await fetch(
      `/api/dict?word=${encodeURIComponent(word)}&language=en&context=${encodeURIComponent(context)}`
    );
    const data = await response.json();
    
    // Show definition in a tooltip or popup
    console.log(data.result);
  };

  return (
    <div>
      <video controls />
      <SubtitleText
        text="Hello, how are you today?"
        onWordSelect={handleWordSelect}
      />
    </div>
  );
}
```

## Advanced Usage

### Custom Prompt Template

Create a specialized prompt for technical terms:

```bash
# In .env.local
OPENROUTER_DICTIONARY_PROMPT=Define the technical term "{{word}}" in {{sourceLanguage}}. Context: "{{context}}". Provide a clear, technical definition suitable for professionals. Include common usage in the field if applicable.
```

### Switching Providers

Switch to the free dictionary (English only):

```bash
# In .env.local
DICTIONARY_PROVIDER=free-dictionary
```

### Using Different Models

Try a more powerful model for better definitions:

```bash
# In .env.local
OPENROUTER_DICTIONARY_MODEL=anthropic/claude-3-5-sonnet
```

Note: Paid models will incur costs. Check OpenRouter pricing.

## Error Handling Examples

### Word Not Found

```typescript
const response = await fetch('/api/dict?word=asdfasdf&language=en');
const data = await response.json();

if (response.status === 404) {
  console.log('Not found:', data.error);
  console.log('Try Google Translate:', data.translateUrl);
}
```

### Rate Limit

```typescript
const response = await fetch('/api/dict?word=hello&language=en');

if (response.status === 429) {
  console.error('Rate limit exceeded, please try again later');
}
```

### Invalid Input

```typescript
const response = await fetch('/api/dict?language=en'); // Missing word

if (response.status === 400) {
  console.error('Missing required parameter: word');
}
```

## Performance Tips

### 1. Implement Caching

Cache frequent word lookups to reduce API calls:

```typescript
const cache = new Map<string, DictionaryResult>();

async function getCachedDefinition(word: string, language: string) {
  const key = `${word}-${language}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const response = await fetch(`/api/dict?word=${word}&language=${language}`);
  const data = await response.json();
  
  cache.set(key, data.result);
  return data.result;
}
```

### 2. Debounce Requests

Avoid excessive API calls during typing:

```typescript
import { debounce } from 'lodash';

const debouncedLookup = debounce(async (word: string) => {
  const response = await fetch(`/api/dict?word=${word}&language=en`);
  const data = await response.json();
  // Handle result
}, 500); // Wait 500ms after user stops typing
```

### 3. Batch Requests

If looking up multiple words, consider batching (requires API modification):

```typescript
// Future enhancement
const words = ['hello', 'world', 'test'];
const response = await fetch('/api/dict/batch', {
  method: 'POST',
  body: JSON.stringify({ words, language: 'en' }),
});
```

## Testing

### Test with cURL

```bash
# Basic test
curl -v "http://localhost:3000/api/dict?word=test&language=en"

# With context
curl -v "http://localhost:3000/api/dict?word=run&language=en&context=I%20like%20to%20run%20in%20the%20morning"

# Spanish word
curl -v "http://localhost:3000/api/dict?word=correr&language=es"

# Non-existent word
curl -v "http://localhost:3000/api/dict?word=xyzabc&language=en"
```

### Test with JavaScript

```javascript
// In browser console or Node.js
async function testDictionary() {
  const tests = [
    { word: 'hello', language: 'en' },
    { word: 'bank', language: 'en', context: 'river bank' },
    { word: 'banco', language: 'es' },
  ];

  for (const test of tests) {
    const params = new URLSearchParams(test);
    const response = await fetch(`http://localhost:3000/api/dict?${params}`);
    const data = await response.json();
    console.log(`${test.word}:`, data);
  }
}

testDictionary();
```

## Troubleshooting

### "Missing API key" Error

Make sure you've set `OPENROUTER_API_KEY` in your `.env.local` file.

### "Rate limit exceeded" Error

You've hit OpenRouter's rate limit. Either wait or upgrade your plan.

### Definitions are in English when I expect another language

The LLM might respond in English by default. Update your prompt template to specify:

```bash
OPENROUTER_DICTIONARY_PROMPT=Define "{{word}}" in {{sourceLanguage}}. Give your answer in {{sourceLanguage}}, not in English. Context: "{{context}}". Be brief and clear.
```

### Model not found or not working

Model availability on OpenRouter changes frequently. If you get a "No endpoints found" error:
1. Visit https://openrouter.ai/models
2. Search for available models (look for "free" tag or check pricing)
3. Update your `OPENROUTER_DICTIONARY_MODEL` with a valid model name
4. Common alternatives: `openai/gpt-3.5-turbo`, `anthropic/claude-instant-1`, `meta-llama/llama-3-8b-instruct`

## Cost Estimation

### Free/Low-Cost Tier (google/gemini-flash-1.5)
- Cost: Often $0 or very low per request (check OpenRouter for current pricing)
- Limit: Varies by OpenRouter's current policy  
- Good for: Development, testing, and light production use
- **Note**: Model availability and pricing change frequently

### Paid Models
Example costs per 1000 requests (approximate):
- `anthropic/claude-3-5-sonnet`: ~$0.30
- `openai/gpt-4`: ~$0.60
- `openai/gpt-3.5-turbo`: ~$0.05

Average definition request uses ~100-200 tokens.

## Next Steps

1. Implement caching to reduce API costs
2. Add user rate limiting
3. Create a nice UI for word lookups
4. Integrate with subtitle text selection
5. Add pronunciation support
6. Store user's vocabulary for review

