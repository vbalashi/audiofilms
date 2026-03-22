# Dictionary Provider Troubleshooting Guide

## Common Issues and Solutions

### Issue: "No endpoints found for [model-name]"

**Error Example:**
```json
{
  "error": {
    "message": "No endpoints found for x-ai/grok-2-1212.",
    "code": 404
  }
}
```

**Cause**: The model name doesn't exist or is no longer available on OpenRouter.

**Solution**:
1. Visit https://openrouter.ai/models
2. Search for available models
3. Look for models with "free" tag or check pricing
4. Update your `.env.local` file:
   ```bash
   OPENROUTER_DICTIONARY_MODEL=google/gemini-flash-1.5
   ```
5. Restart your development server

**Recommended Models** (as of implementation):
- `google/gemini-flash-1.5` - Often free/low-cost
- `openai/gpt-3.5-turbo` - Low cost, good quality
- `anthropic/claude-instant-1` - Good balance
- `meta-llama/llama-3-8b-instruct` - Open source

### Issue: "Missing API key" or 401 Unauthorized

**Error**: API returns 401 status

**Solution**:
1. Make sure you have an OpenRouter API key from https://openrouter.ai/
2. Add it to `/home/khrustal/dev/audiofilms/app/.env.local`:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
   ```
3. Verify the key is correct (check for typos)
4. Restart your dev server after changing `.env.local`

### Issue: Rate Limit Exceeded (429)

**Error**: "Rate limit exceeded"

**Solution**:
1. Wait a few minutes before trying again
2. Check your OpenRouter dashboard for usage limits
3. Consider upgrading your OpenRouter plan
4. Implement caching to reduce API calls

### Issue: Dictionary API returns 500 errors

**Possible Causes**:
- Model temporarily unavailable
- Invalid prompt template
- Network issues

**Solution**:
1. Check OpenRouter status page
2. Try a different model
3. Verify your prompt template doesn't have syntax errors
4. Check your server logs for more details:
   ```bash
   # In your terminal
   tail -f .next/server/app/api/dict/route.js.nft.json
   ```

### Issue: Definitions are in wrong language

**Problem**: You request a Spanish word definition but get English response

**Solution**:
Update your prompt template in `.env.local`:
```bash
OPENROUTER_DICTIONARY_PROMPT=Define the word "{{word}}" in "{{sourceLanguage}}". IMPORTANT: Give your entire answer in {{sourceLanguage}}, not in English. Context: "{{context}}". Be brief and clear.
```

### Issue: Dev server not picking up .env.local changes

**Solution**:
1. Stop your dev server (Ctrl+C)
2. Start it again:
   ```bash
   cd app
   npm run dev
   ```
3. Hard refresh your browser (Ctrl+Shift+R)

### Issue: Definitions are too long/verbose

**Solution**:
Customize your prompt to be more concise:
```bash
OPENROUTER_DICTIONARY_PROMPT=Define "{{word}}" in {{sourceLanguage}} in ONE sentence. Context: "{{context}}". Be extremely brief.
```

### Issue: Model costs too much

**Problem**: Your OpenRouter credits are depleting quickly

**Solution**:
1. Switch to a cheaper model:
   ```bash
   OPENROUTER_DICTIONARY_MODEL=google/gemini-flash-1.5
   ```
2. Implement caching (see DICTIONARY_USAGE_EXAMPLES.md)
3. Add rate limiting on your API endpoint
4. Use the `free-dictionary` provider for English words:
   ```bash
   DICTIONARY_PROVIDER=free-dictionary
   ```

### Issue: "Context" parameter not working

**Problem**: Definitions don't seem context-aware

**Solution**:
1. Make sure you're passing the context parameter:
   ```
   GET /api/dict?word=bank&language=en&context=I%20went%20to%20the%20bank
   ```
2. Check that your prompt template includes `{{context}}`
3. Try a more powerful model that better understands context

### Issue: Cannot connect to OpenRouter

**Error**: Network error or timeout

**Solution**:
1. Check your internet connection
2. Verify OpenRouter isn't blocked by firewall
3. Check OpenRouter status: https://status.openrouter.ai/
4. Try switching to `free-dictionary` provider temporarily

## Debugging Steps

### 1. Check Environment Variables

```bash
cd app
cat .env.local | grep OPENROUTER
```

Should show:
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_DICTIONARY_MODEL=google/gemini-flash-1.5
```

### 2. Test API Key Directly

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Should return a list of available models.

### 3. Test Dictionary API

```bash
curl "http://localhost:3000/api/dict?word=test&language=en" | jq
```

Should return JSON with definition.

### 4. Check Server Logs

Look for errors in your terminal where `npm run dev` is running.

### 5. Verify Model Exists

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY" | \
  jq '.data[] | select(.id | contains("gemini-flash"))'
```

## Quick Fixes

### Switch to Free Dictionary (English Only)

Edit `.env.local`:
```bash
DICTIONARY_PROVIDER=free-dictionary
```

No API key needed, works immediately.

### Use Most Common Model

Edit `.env.local`:
```bash
OPENROUTER_DICTIONARY_MODEL=openai/gpt-3.5-turbo
```

Almost always available (but has costs).

### Simplify Your Setup

Minimal `.env.local`:
```bash
DICTIONARY_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
# That's it - will use defaults
```

## Getting Help

1. **Check OpenRouter Documentation**: https://openrouter.ai/docs
2. **OpenRouter Discord**: Join for community support
3. **Check Model Availability**: https://openrouter.ai/models
4. **Check Pricing**: https://openrouter.ai/models?pricing=true

## Common Questions

### Q: Why did my working model suddenly stop working?

**A**: OpenRouter providers can disable models temporarily or permanently. Always have a backup model configured.

### Q: How do I know which models are free?

**A**: Visit https://openrouter.ai/models and look for models with "$0.00" pricing or a "free" tag. Note: This changes frequently.

### Q: Can I use multiple models simultaneously?

**A**: Not currently. The system uses one model at a time. You can switch by changing the environment variable.

### Q: Should I use OpenRouter or Free Dictionary?

**A**: 
- **OpenRouter**: Better for multi-language, context-aware, high-quality definitions
- **Free Dictionary**: Good for English-only, no API key, no costs, but limited features

### Q: How can I test without using API credits?

**A**: 
1. Use `free-dictionary` provider for testing
2. Look for free models on OpenRouter
3. Cache results to avoid repeat lookups
4. Use a small daily limit on your OpenRouter dashboard

## Still Having Issues?

1. Read the implementation docs: `DICTIONARY_IMPLEMENTATION.md`
2. Check usage examples: `DICTIONARY_USAGE_EXAMPLES.md`
3. Review the quick start: `DICTIONARY_QUICKSTART.md`
4. Check your OpenRouter dashboard for errors
5. Verify your API key hasn't expired

## Emergency Fallback

If nothing works, use this minimal configuration:

```bash
# .env.local
DICTIONARY_PROVIDER=free-dictionary
```

This will work for English words without any API key or configuration.


