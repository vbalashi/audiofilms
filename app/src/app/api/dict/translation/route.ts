import { NextResponse } from 'next/server';
import {
  getBearerToken,
  postTwoThousandNlPlatformJson,
} from '@/lib/twoThousandNlPlatform';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const entryId = typeof body?.entryId === 'string' ? body.entryId : '';
  const targetLang = typeof body?.targetLang === 'string' ? body.targetLang : '';

  if (!entryId) {
    return NextResponse.json({ error: 'missing_entry_id' }, { status: 400 });
  }
  if (!targetLang) {
    return NextResponse.json({ error: 'missing_target_lang' }, { status: 400 });
  }

  const outcome = await postTwoThousandNlPlatformJson('translation', {
    entryId,
    targetLang,
    force: body?.force === true,
  }, getBearerToken(request));
  return NextResponse.json(outcome.body, { status: outcome.status });
}
