import { NextResponse } from 'next/server';
import { lookupDictionaryEntry } from '@/lib/dictionaryLookup';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');
  const language = searchParams.get('language') || 'en';
  const context = searchParams.get('context') || undefined;

  if (!word) {
    return NextResponse.json({ error: 'Missing word' }, { status: 400 });
  }

  try {
    const outcome = await lookupDictionaryEntry({ word, language, context });
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch definition' }, { status: 500 });
  }
}
