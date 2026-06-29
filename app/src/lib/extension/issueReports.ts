import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDirectory } from '@/lib/runtimePaths';

export type IssueReportCategory =
  | 'phrase-boundary'
  | 'timing'
  | 'navigation'
  | 'translation'
  | 'dictionary'
  | 'ui-layout'
  | 'captions-source'
  | 'other';

export type IssueReportRecord = {
  id: string;
  status: 'new' | 'triaged' | 'linked-to-github' | 'closed' | 'ignored';
  reportVersion: number;
  category: IssueReportCategory;
  description: string;
  expectedBehavior?: string;
  includeDiagnostics: boolean;
  diagnostics?: Record<string, unknown>;
  extensionVersion?: string;
  extensionBuildInfo?: Record<string, unknown>;
  backendBuildInfo?: Record<string, unknown>;
  browserUserAgent?: string;
  pageUrl?: string;
  videoId?: string;
  sourceLabel?: string;
  currentPhraseText?: string;
  phraseBoundaryCase?: Record<string, unknown>;
  reporterSubject: string;
  createdAt: string;
  updatedAt: string;
};

type NormalizeInput = {
  body: unknown;
  userAgent: string;
  reporterSubject: string;
};

const CATEGORIES = new Set<IssueReportCategory>([
  'phrase-boundary',
  'timing',
  'navigation',
  'translation',
  'dictionary',
  'ui-layout',
  'captions-source',
  'other',
]);

function nowIso(): string {
  return new Date().toISOString();
}

function reportsDirectory(): string {
  return dataDirectory('issue-reports', '.issue-reports');
}

function reportPath(id: string): string {
  return path.join(reportsDirectory(), 'reports', `${safeFilePart(id)}.json`);
}

function indexPath(): string {
  return path.join(reportsDirectory(), 'index.jsonl');
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'report';
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanOptionalString(value: unknown, maxLength: number): string | undefined {
  const text = cleanString(value, maxLength);
  return text || undefined;
}

function cleanRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function extractDiagnosticsSummary(diagnostics: Record<string, unknown> | undefined) {
  const selectedSource = diagnostics?.selectedSource &&
    typeof diagnostics.selectedSource === 'object' &&
    !Array.isArray(diagnostics.selectedSource)
    ? diagnostics.selectedSource as Record<string, unknown>
    : undefined;
  const currentPhrase = diagnostics?.currentPhrase &&
    typeof diagnostics.currentPhrase === 'object' &&
    !Array.isArray(diagnostics.currentPhrase)
    ? diagnostics.currentPhrase as Record<string, unknown>
    : undefined;

  return {
    pageUrl: cleanOptionalString(diagnostics?.url, 2048),
    videoId: cleanOptionalString(diagnostics?.videoId, 80),
    sourceLabel: cleanOptionalString(selectedSource?.label || selectedSource?.name || selectedSource?.kind, 240),
    currentPhraseText: cleanOptionalString(currentPhrase?.text, 500),
    phraseBoundaryCase: cleanRecord(diagnostics?.phraseBoundaryCase),
  };
}

export function normalizeIssueReport(input: NormalizeInput): IssueReportRecord {
  const record = input.body && typeof input.body === 'object'
    ? input.body as Record<string, unknown>
    : {};
  const category = CATEGORIES.has(record.category as IssueReportCategory)
    ? record.category as IssueReportCategory
    : 'other';
  const description = cleanString(record.description, 4000);
  if (!description) {
    throw new Error('missing_description');
  }

  const includeDiagnostics = record.includeDiagnostics !== false;
  const diagnostics = includeDiagnostics ? cleanRecord(record.diagnostics) : undefined;
  const summary = extractDiagnosticsSummary(diagnostics);
  const createdAt = nowIso();
  const id = `af_report_${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}_${crypto.randomBytes(5).toString('hex')}`;

  return {
    id,
    status: 'new',
    reportVersion: Number.isFinite(Number(record.reportVersion)) ? Number(record.reportVersion) : 1,
    category,
    description,
    expectedBehavior: cleanOptionalString(record.expectedBehavior, 4000),
    includeDiagnostics,
    diagnostics,
    extensionVersion: cleanOptionalString(record.extensionVersion, 120),
    extensionBuildInfo: cleanRecord(record.extensionBuildInfo),
    backendBuildInfo: cleanRecord(record.backendBuildInfo),
    browserUserAgent: cleanOptionalString(record.browserUserAgent, 500) || cleanOptionalString(input.userAgent, 500),
    pageUrl: summary.pageUrl,
    videoId: summary.videoId,
    sourceLabel: summary.sourceLabel,
    currentPhraseText: summary.currentPhraseText,
    phraseBoundaryCase: category === 'phrase-boundary' ? summary.phraseBoundaryCase : undefined,
    reporterSubject: input.reporterSubject,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function saveIssueReport(report: IssueReportRecord): Promise<IssueReportRecord> {
  await fs.mkdir(path.dirname(reportPath(report.id)), { recursive: true });
  await fs.mkdir(path.dirname(indexPath()), { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  const tmpPath = `${reportPath(report.id)}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, body, 'utf8');
  await fs.rename(tmpPath, reportPath(report.id));
  await fs.appendFile(indexPath(), `${JSON.stringify({
    id: report.id,
    status: report.status,
    category: report.category,
    videoId: report.videoId,
    sourceLabel: report.sourceLabel,
    createdAt: report.createdAt,
    path: reportPath(report.id),
  })}\n`, 'utf8');
  return report;
}

export async function listIssueReports(limit = 50): Promise<IssueReportRecord[]> {
  const dir = path.join(reportsDirectory(), 'reports');
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const reports = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => {
        try {
          return JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as IssueReportRecord;
        } catch {
          return null;
        }
      }),
  );

  return reports
    .filter((report): report is IssueReportRecord => Boolean(report?.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(200, limit)));
}
