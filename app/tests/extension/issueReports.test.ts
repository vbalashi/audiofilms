import { describe, expect, it } from 'vitest';
import { normalizeIssueReport } from '../../src/lib/extension/issueReports';

describe('normalizeIssueReport', () => {
  it('preserves extension and backend build identity fields', () => {
    const report = normalizeIssueReport({
      userAgent: 'test-agent',
      reporterSubject: 'tester',
      body: {
        reportVersion: 1,
        category: 'ui-layout',
        description: 'The tester panel shows stale build data.',
        includeDiagnostics: true,
        diagnostics: {
          url: 'https://www.youtube.com/watch?v=abc123',
          videoId: 'abc123',
        },
        extensionVersion: '0.1.0',
        extensionBuildInfo: {
          manifestVersion: '0.1.0',
          buildId: 'audiofilms-extension-20260628094500-abc1234',
          sourceCommit: 'abc1234',
        },
        backendBuildInfo: {
          apiBase: 'https://audiofilms-api.dilum.io',
          version: '0.1.168',
          builtAt: '2026-06-28T09:45:00Z',
          commit: 'def5678',
        },
      },
    });

    expect(report.extensionVersion).toBe('0.1.0');
    expect(report.extensionBuildInfo).toMatchObject({
      buildId: 'audiofilms-extension-20260628094500-abc1234',
      sourceCommit: 'abc1234',
    });
    expect(report.backendBuildInfo).toMatchObject({
      version: '0.1.168',
      commit: 'def5678',
    });
  });
});
