import crypto from 'node:crypto';
import { authorizeAsrRequest } from '@/lib/asr/asrAuth';
import { testerTokens } from '@/lib/asr/asrConfig';
import { checkIssueReportRateLimit } from '@/lib/extension/issueReportRateLimit';
import {
  listIssueReports,
  normalizeIssueReport,
  saveIssueReport,
} from '@/lib/extension/issueReports';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'POST', 'OPTIONS'] });
}

export async function GET(request: Request) {
  const auth = authorizeOwnerRequest(request);
  if (!auth.ok) {
    return jsonResponse(request, auth.body, { status: auth.status });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || 50);
  const reports = await listIssueReports(limit);
  return jsonResponse(request, {
    reports: reports.map((report) => ({
      id: report.id,
      status: report.status,
      category: report.category,
      description: report.description,
      expectedBehavior: report.expectedBehavior,
      includeDiagnostics: report.includeDiagnostics,
      videoId: report.videoId,
      sourceLabel: report.sourceLabel,
      currentPhraseText: report.currentPhraseText,
      pageUrl: report.pageUrl,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const subject = reportSubject(request);
  const rateLimit = checkIssueReportRateLimit(subject);
  if (!rateLimit.ok) {
    return jsonResponse(
      request,
      {
        error: 'issue_report_rate_limited',
        status: 'rate_limited',
        retryAfterMs: rateLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);
  try {
    const report = normalizeIssueReport({
      body,
      userAgent: request.headers.get('user-agent') || '',
      reporterSubject: subject,
    });
    await saveIssueReport(report);
    return jsonResponse(request, {
      id: report.id,
      status: report.status,
      category: report.category,
      createdAt: report.createdAt,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'issue_report_rejected';
    return jsonResponse(
      request,
      {
        error: message,
        status: 'rejected',
      },
      { status: message === 'missing_description' ? 400 : 500 },
    );
  }
}

function authorizeOwnerRequest(request: Request) {
  if (!testerTokens().length) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: 'issue_report_owner_auth_not_configured',
        status: 'unavailable',
        suggestedAction: 'Configure AUDIOFILMS_TESTER_TOKEN or ASR_TESTER_TOKENS before exposing issue report listing.',
      },
    };
  }
  return authorizeAsrRequest(request);
}

function reportSubject(request: Request): string {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) {
    return `bearer:${crypto.createHash('sha256').update(bearer).digest('hex').slice(0, 16)}`;
  }
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const realIp = request.headers.get('x-real-ip') || '';
  const userAgent = request.headers.get('user-agent') || '';
  const raw = `${forwardedFor || realIp || 'unknown'}:${userAgent.slice(0, 120)}`;
  return `public:${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)}`;
}

