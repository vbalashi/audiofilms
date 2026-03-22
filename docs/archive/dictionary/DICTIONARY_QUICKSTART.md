# Dictionary Provider - Quick Start Guide

## ✅ What Was Done

We've successfully implemented a **provider-independent dictionary system** that uses LLMs (via OpenRouter) to provide intelligent, context-aware word definitions. This replaces the old hardcoded Free Dictionary API approach.

## 🚀 Quick Setup (3 Steps)

### Step 1: Get OpenRouter API Key
1. Visit https://openrouter.ai/
2. Sign up for a free account
3. Get your API key from the dashboard

### Step 2: Configure Environment
```bash
cd app
cp env.example .env.local
```

Edit `.env.local` and add:
```bash
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=your_actual_api_key_here
OPENROUTER_DICTIONARY_MODEL=google/gemini-flash-1.5
```

### Step 3: Test It
Start your dev server and try:
```bash
curl "http://localhost:3000/api/dict?word=hello&language=en"
```

## 📋 Key Features

✨ **Context-Aware** - Understands word meaning based on surrounding text  
🌍 **Multi-Language** - Supports any language (not just English)  
🔌 **Provider-Independent** - Easy to switch between different dictionary services  
⚙️ **Configurable** - Customize prompts via environment variables  
🎓 **Language-Learner Focused** - Definitions optimized for learning  

## 📝 Example API Calls

### Basic lookup
```bash
GET /api/dict?word=hello&language=en
```

### With context (recommended)
```bash
GET /api/dict?word=bank&language=en&context=I%20went%20to%20the%20bank
```

### Spanish word
```bash
GET /api/dict?word=casa&language=es
```

## 📦 What's Included

### New Files Created:
- `src/types/dictionary.ts` - Type definitions
- `src/lib/providers/dictionary/OpenRouterDictionaryProvider.ts` - LLM provider
- `src/lib/providers/dictionary/FreeDictionaryProvider.ts` - Fallback provider
- `src/lib/providers/dictionary/index.ts` - Provider factory
- `src/lib/providers/dictionary/README.md` - Detailed documentation

### Modified Files:
- `src/app/api/dict/route.ts` - Updated to use new provider system
- `env.example` - Added new environment variables

### Documentation:
- `DICTIONARY_IMPLEMENTATION.md` - Technical implementation details
- `DICTIONARY_USAGE_EXAMPLES.md` - Usage examples and patterns
- `DICTIONARY_QUICKSTART.md` - This file

## 🎯 The Prompt

The default prompt optimized for language learners:

```
Define the word "{{word}}" in "{{sourceLanguage}}" using a style 
similar to a monolingual dictionary for language learners. 
Context: "{{context}}".

Your answer should be brief, clear, and contain only the definition 
of target word "{{word}}".

Avoid cognates or translations unless strictly necessary. If the word 
functions as a part of a phrase, idiom, or collocation, describe its 
meaning in that phrase as well, indicating both standalone and 
contextual meanings separately.
```

You can customize this via `OPENROUTER_DICTIONARY_PROMPT` in `.env.local`.

## 🔄 Switching Providers

### Use OpenRouter (LLM-based, default)
```bash
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key
```

### Use Free Dictionary (English only, no API key needed)
```bash
DICTIONARY_PROVIDER=free-dictionary
```

## 💰 Cost Considerations

The default model `x-ai/grok-2-1212` may have usage limits. Check https://openrouter.ai/models for current offerings.

**Recommendations:**
- ✅ Use for development and testing
- ✅ Implement caching for production to reduce costs
- ✅ Monitor usage via OpenRouter dashboard
- ⚠️ Consider paid models for production if needed

Average cost per request with paid models: $0.0001 - $0.001

## 🧪 Testing

Test the API works correctly:

```bash
# Test 1: Simple word
curl "http://localhost:3000/api/dict?word=test&language=en"

# Test 2: With context
curl "http://localhost:3000/api/dict?word=run&language=en&context=I%20like%20to%20run"

# Test 3: Spanish
curl "http://localhost:3000/api/dict?word=correr&language=es"

# Test 4: Not found (should return error + Google Translate link)
curl "http://localhost:3000/api/dict?word=xyzabc&language=en"
```

## 🔧 Common Issues

### "Missing API key" error
- Make sure `OPENROUTER_API_KEY` is set in `.env.local`
- Restart your dev server after changing `.env.local`

### "Rate limit exceeded"
- You've hit OpenRouter's rate limit
- Wait a few minutes or upgrade your plan

### Definitions are in wrong language
- Update your prompt to specify the desired output language
- Example: Add "Give your answer in {{sourceLanguage}}" to the prompt

## 📚 Next Steps

1. ✅ Set up your API key (done above)
2. 📖 Read `DICTIONARY_USAGE_EXAMPLES.md` for integration examples
3. 🔨 Integrate into your subtitle player UI
4. 💾 Implement caching for frequently looked-up words
5. 🎨 Create a nice word lookup UI component

## 🎓 Integration Ideas

- **Subtitle Click**: Click on words in subtitles to get definitions
- **Vocabulary List**: Save looked-up words for review
- **Flashcards**: Generate flashcards from looked-up words
- **Word Highlighting**: Highlight difficult words in subtitles
- **Spaced Repetition**: Review vocabulary at optimal intervals

## 🐛 Troubleshooting

### Check if server is running
```bash
curl http://localhost:3000/api/dict?word=test
```

### Check environment variables
```bash
# In your app directory
cat .env.local | grep OPENROUTER
```

### Test with a known free model
If the default model isn't working, try updating:
```bash
OPENROUTER_DICTIONARY_MODEL=openai/gpt-3.5-turbo
```
(Note: This may have costs)

### Verify API key is correct
Log in to https://openrouter.ai/ and check your API key hasn't expired.

## 📞 Support

- OpenRouter docs: https://openrouter.ai/docs
- OpenRouter models: https://openrouter.ai/models
- Check the `DICTIONARY_IMPLEMENTATION.md` for technical details
- Check the `DICTIONARY_USAGE_EXAMPLES.md` for code examples

## ✨ Benefits Over Old System

| Feature | Old System | New System |
|---------|-----------|------------|
| Languages | English only | Any language |
| Context | No | Yes |
| Provider | Hardcoded | Configurable |
| Quality | Basic | LLM-powered |
| Customization | None | Via prompts |
| Idioms/Phrases | Limited | Excellent |

## 🎉 You're Ready!

Your dictionary system is now ready to use. Start making API calls and integrate it into your subtitle player!

For detailed integration examples, see `DICTIONARY_USAGE_EXAMPLES.md`.

