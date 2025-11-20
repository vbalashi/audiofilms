import { NextResponse } from 'next/server';

const FREE_DICTIONARY_ENDPOINT =
  'https://api.dictionaryapi.dev/api/v2/entries/en/';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Missing word' }, { status: 400 });
  }

  try {
    const response = await fetch(`${FREE_DICTIONARY_ENDPOINT}${word}`, {
      next: { revalidate: 3600 },
    });

    if (response.status === 404) {
      const translateUrl = `https://translate.google.com/?sl=en&tl=en&text=${encodeURIComponent(
        word,
      )}&op=translate`;
      return NextResponse.json({ error: 'Not found', translateUrl });
    }

    if (!response.ok) {
      throw new Error('Dictionary lookup failed');
    }

    const payload = await response.json();
    return NextResponse.json({ result: payload });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch definition' },
      { status: 500 },
    );
  }
}
