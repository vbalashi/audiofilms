#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoRoot = path.resolve(appRoot, '..');
const defaultDataRoot = process.env.AUDIOFILMS_DATA_DIR
  ? path.resolve(process.env.AUDIOFILMS_DATA_DIR)
  : path.join(appRoot, '.issue-reports');
const defaultFixturesRoot = path.join(appRoot, 'test-fixtures', 'issue-reports');

const args = process.argv.slice(2);
const command = args[0] || 'help';
const rest = args.slice(1);

const CATEGORY_ALIASES = new Map([
  ['bad-split', 'phrase-boundary'],
  ['phrase', 'phrase-boundary'],
  ['phrase-boundary', 'phrase-boundary'],
  ['translation', 'translation'],
  ['dictionary', 'dictionary'],
  ['timing', 'timing'],
  ['navigation', 'navigation'],
  ['ui-layout', 'ui-layout'],
  ['captions-source', 'captions-source'],
  ['other', 'other'],
]);

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const options = parseOptions(rest);
  const category = normalizeCategory(options.category || options.kind || 'phrase-boundary');
  const dataRoot = path.resolve(options.dataDir || defaultDataRoot);
  const fixturesRoot = path.resolve(options.fixturesDir || defaultFixturesRoot);

  if (command === 'list') {
    const reports = await loadReports({ options, dataRoot });
    const filtered = await filterReports(reports, { category, options, fixturesRoot });
    printReportList(filtered, options);
    return;
  }

  if (command === 'show') {
    const id = positional(options)[0];
    if (!id) throw new Error('show requires a report id');
    const report = await findReport(id, { options, dataRoot });
    printReportDetail(report, options);
    return;
  }

  if (command === 'curate') {
    const id = positional(options)[0];
    if (!id) throw new Error('curate requires a report id');
    const report = await findReport(id, { options, dataRoot });
    const filePath = await writeReviewCase(report, {
      fixturesRoot,
      reviewStatus: 'confirmed',
      scenario: options.scenario || defaultScenario(report),
      note: options.note || '',
      reviewer: options.reviewer || process.env.USER || '',
    });
    await updateSourceReportStatus(report, dataRoot, 'triaged');
    console.log(`curated: ${relative(filePath)}`);
    return;
  }

  if (command === 'ignore') {
    const id = positional(options)[0];
    if (!id) throw new Error('ignore requires a report id');
    const report = await findReport(id, { options, dataRoot });
    const filePath = await writeReviewCase(report, {
      fixturesRoot,
      reviewStatus: 'ignored',
      scenario: options.scenario || defaultScenario(report),
      note: options.reason || options.note || 'false-positive-or-not-actionable',
      reviewer: options.reviewer || process.env.USER || '',
    });
    await updateSourceReportStatus(report, dataRoot, 'ignored');
    console.log(`ignored: ${relative(filePath)}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function parseOptions(values) {
  const options = { _: [] };
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (!value.startsWith('--')) {
      options._.push(value);
      continue;
    }
    const eqIndex = value.indexOf('=');
    const key = camelize(value.slice(2, eqIndex >= 0 ? eqIndex : undefined));
    if (eqIndex >= 0) {
      options[key] = value.slice(eqIndex + 1);
      continue;
    }
    const next = values[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return options;
}

function positional(options) {
  return Array.isArray(options._) ? options._ : [];
}

function camelize(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function normalizeCategory(value) {
  const category = CATEGORY_ALIASES.get(String(value || '').trim());
  if (!category) throw new Error(`Unknown report category: ${value}`);
  return category;
}

async function loadReports({ options, dataRoot }) {
  if (options.api) {
    return fetchReportsFromApi(options);
  }
  return readReportsFromFiles(dataRoot);
}

async function fetchReportsFromApi(options) {
  const base = String(options.api).replace(/\/+$/, '');
  const limit = Number(options.limit || 200);
  const token = options.token ||
    process.env.AUDIOFILMS_TESTER_TOKEN ||
    firstCsvValue(process.env.ASR_TESTER_TOKENS) ||
    process.env.ASR_TESTER_TOKEN;
  if (!token) {
    throw new Error('Remote API mode requires --token or AUDIOFILMS_TESTER_TOKEN');
  }

  const response = await fetch(`${base}/api/extension/issue-reports?limit=${encodeURIComponent(String(limit))}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Issue report API returned ${response.status}: ${await response.text()}`);
  }
  const body = await response.json();
  return Array.isArray(body.reports) ? body.reports : [];
}

async function readReportsFromFiles(dataRoot) {
  const reportsDir = dataRoot.endsWith('issue-reports')
    ? path.join(dataRoot, 'reports')
    : path.join(dataRoot, 'issue-reports', 'reports');
  const files = await fs.readdir(reportsDir).catch(() => []);
  const reports = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const report = JSON.parse(await fs.readFile(path.join(reportsDir, file), 'utf8'));
      report.__filePath = path.join(reportsDir, file);
      reports.push(report);
    } catch (error) {
      console.warn(`skip unreadable report ${file}: ${error instanceof Error ? error.message : error}`);
    }
  }
  return reports;
}

async function filterReports(reports, { category, options, fixturesRoot }) {
  const reviewedIds = options.all ? new Set() : await readReviewedReportIds(fixturesRoot, category);
  const status = options.status || 'raw';
  const includeReviewed = Boolean(options.all);

  return reports
    .filter((report) => report.category === category)
    .filter((report) => includeReviewed || !reviewedIds.has(report.id))
    .filter((report) => {
      if (status === 'all') return true;
      if (category === 'phrase-boundary') {
        const caseStatus = report.phraseBoundaryCase?.status || report.diagnostics?.phraseBoundaryCase?.status;
        return status === 'raw'
          ? caseStatus === 'raw' || report.status === 'new'
          : report.status === status || caseStatus === status;
      }
      return report.status === status || (status === 'raw' && report.status === 'new');
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, Number(options.limit || 50));
}

async function readReviewedReportIds(fixturesRoot, category) {
  const ids = new Set();
  for (const bucket of ['curated', 'ignored']) {
    const dir = path.join(fixturesRoot, bucket, category);
    const files = await fs.readdir(dir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const body = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
        if (body.sourceReportId) ids.add(body.sourceReportId);
      } catch {
        // Ignore invalid review files; they should be fixed separately.
      }
    }
  }
  return ids;
}

async function findReport(id, { options, dataRoot }) {
  const reports = await loadReports({ options, dataRoot });
  const report = reports.find((item) => item.id === id);
  if (!report) throw new Error(`Report not found: ${id}`);
  return report;
}

function printReportList(reports, options) {
  if (options.json) {
    console.log(JSON.stringify(reports, null, 2));
    return;
  }

  if (!reports.length) {
    console.log('No matching reports.');
    return;
  }

  for (const report of reports) {
    console.log(`${report.id}  ${report.category}  ${report.status || 'unknown'}  ${report.videoId || '-'}  ${report.createdAt || '-'}`);
    const current = report.phraseBoundaryCase?.currentPhrase || report.diagnostics?.phraseBoundaryCase?.currentPhrase;
    const currentText = current?.text || report.currentPhraseText || '';
    if (currentText) console.log(`  current: ${currentText}`);
    if (options.window || options.verbose) {
      printPhraseWindow(report, '    ');
    }
    console.log('');
  }
}

function printReportDetail(report, options) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`${report.id}`);
  console.log(`category: ${report.category}`);
  console.log(`status: ${report.status}`);
  console.log(`video: ${report.videoId || report.phraseBoundaryCase?.video?.id || '-'}`);
  console.log(`created: ${report.createdAt || '-'}`);
  console.log(`description: ${report.description || '-'}`);
  if (report.expectedBehavior) console.log(`expected: ${report.expectedBehavior}`);
  printPhraseWindow(report, '  ');
}

function printPhraseWindow(report, indent) {
  const boundaryCase = report.phraseBoundaryCase || report.diagnostics?.phraseBoundaryCase;
  const window = Array.isArray(boundaryCase?.phraseWindow) ? boundaryCase.phraseWindow : [];
  if (!window.length) return;
  const currentIndex = boundaryCase.currentIndex;
  console.log(`${indent}phraseWindow:`);
  for (const phrase of window) {
    const marker = phrase.index === currentIndex ? '>' : ' ';
    const start = Number.isFinite(Number(phrase.startSec)) ? `${Number(phrase.startSec).toFixed(2)}s` : '-';
    console.log(`${indent}${marker} [${phrase.index}] ${start} ${phrase.text || ''}`);
  }
}

async function writeReviewCase(report, { fixturesRoot, reviewStatus, scenario, note, reviewer }) {
  const category = report.category || 'other';
  const bucket = reviewStatus === 'ignored' ? 'ignored' : 'curated';
  const dir = path.join(fixturesRoot, bucket, category);
  await fs.mkdir(dir, { recursive: true });

  const boundaryCase = report.phraseBoundaryCase || report.diagnostics?.phraseBoundaryCase || null;
  const body = {
    schemaVersion: 1,
    reviewStatus,
    scenario,
    sourceReportId: report.id,
    sourceCategory: category,
    reviewedAt: new Date().toISOString(),
    reviewer,
    note,
    videoId: report.videoId || boundaryCase?.video?.id || '',
    sourceLabel: report.sourceLabel || '',
    rawCase: boundaryCase,
    expected: reviewStatus === 'confirmed'
      ? expectedTemplate(category)
      : undefined,
  };

  const filePath = path.join(dir, `${safeFilePart(report.id)}.json`);
  await fs.writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
  return filePath;
}

function expectedTemplate(category) {
  if (category === 'phrase-boundary') {
    return {
      decision: 'TODO: merge-as-display-segment | merge-as-single-phrase | keep-separate',
      normalizedPhrases: [],
      notes: 'Fill this before turning the case into an executable regression test.',
    };
  }
  return {
    decision: 'TODO',
    notes: 'Fill this before turning the case into an executable regression test.',
  };
}

function defaultScenario(report) {
  if (report.category === 'phrase-boundary') return 'sentence-join';
  return report.category || 'issue-report';
}

async function updateSourceReportStatus(report, dataRoot, status) {
  const reportPath = report.__filePath || await inferReportPath(report.id, dataRoot);
  if (!reportPath) return;
  try {
    const current = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    current.status = status;
    current.updatedAt = new Date().toISOString();
    await fs.writeFile(reportPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  } catch {
    // Remote API summaries and read-only mounts cannot be updated by this helper.
  }
}

async function inferReportPath(id, dataRoot) {
  const fileName = `${safeFilePart(id)}.json`;
  const candidates = [
    path.join(dataRoot, 'reports', fileName),
    path.join(dataRoot, 'issue-reports', 'reports', fileName),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next path.
    }
  }
  return '';
}

function safeFilePart(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'case';
}

function firstCsvValue(value) {
  return String(value || '').split(',').map((item) => item.trim()).find(Boolean) || '';
}

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

function printHelp() {
  console.log(`Issue report case helper

Usage:
  node app/scripts/issue-report-cases.mjs list [--category phrase-boundary] [--window]
  node app/scripts/issue-report-cases.mjs show <report-id>
  node app/scripts/issue-report-cases.mjs curate <report-id> [--scenario sentence-join] [--note "..."]
  node app/scripts/issue-report-cases.mjs ignore <report-id> --reason "false positive"

Storage:
  Defaults to AUDIOFILMS_DATA_DIR/issue-reports or app/.issue-reports.
  Override with --data-dir /path/to/audiofilms-data.
  Remote read-only listing is available with --api https://audiofilms-api.dilum.io --token <tester-token>.

Useful filters:
  --category phrase-boundary
  --kind bad-split
  --status raw|all|new|triaged|ignored
  --all                 include already curated/ignored report ids
  --limit 20
  --json
`);
}
