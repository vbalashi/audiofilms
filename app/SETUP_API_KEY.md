# API Key Setup Guide

## Quick Setup (Secure Method)

Follow these steps to set up your Supadata API key securely:

### 1. Create `.env.local` file

```bash
cd /home/khrustal/dev/audiofilms/app
touch .env.local
```

### 2. Add your API key

Open `.env.local` and add:

```bash
SUBTITLE_PROVIDER=supadata
SUPADATA_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your real API key from [Supadata Dashboard](https://supadata.ai/dashboard).

### 3. Verify it's gitignored

The `.env.local` file is **automatically ignored by git** (covered by `.env*` in `.gitignore`). You can verify:

```bash
git status
# .env.local should NOT appear in the list
```

### 4. Restart your dev server

```bash
npm run dev
```

## Security Checklist ✓

- [x] `.env*` is in `.gitignore` - **your secrets won't be pushed to git**
- [x] `.subtitle-cache/` is in `.gitignore` - **cached data won't be committed**
- [x] `env.example` template provided - **safe to commit without secrets**

## Alternative: Using YT-DLP (No API Key Required)

If you want to use the local yt-dlp provider instead:

```bash
# .env.local
SUBTITLE_PROVIDER=yt-dlp
YT_DLP_PATH=/usr/bin/yt-dlp
```

## Getting a Supadata API Key

1. Visit [https://supadata.ai](https://supadata.ai)
2. Sign up / Log in
3. Go to Dashboard
4. Generate an API key
5. Copy it to your `.env.local` file

## Troubleshooting

### "API key is required for Supadata provider" error

Make sure:
- You created `.env.local` in the `/app` directory
- The file contains `SUPADATA_API_KEY=your_key`
- You restarted the dev server after creating the file

### Want to check if env vars are loaded?

Add this temporarily to your route:

```typescript
console.log('Provider:', process.env.SUBTITLE_PROVIDER);
console.log('Has API Key:', !!process.env.SUPADATA_API_KEY);
```

(Don't commit this - it's just for debugging!)

## What's Safe to Commit?

✅ **SAFE** to commit:
- `env.example` - template without secrets
- `.gitignore` - protects your secrets
- Code files that read from `process.env`

❌ **NEVER** commit:
- `.env.local` - contains your actual API key
- `.env` - contains secrets
- `.subtitle-cache/` - cached data

## Production Deployment

For production (Vercel, etc.):

1. Don't commit `.env.local`
2. Add environment variables in your hosting platform's dashboard
3. Set `SUBTITLE_PROVIDER=supadata`
4. Set `SUPADATA_API_KEY=<your_key>`

The app will automatically use these environment variables.

