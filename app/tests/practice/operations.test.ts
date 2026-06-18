import { describe, expect, it } from 'vitest';
import { practiceOperationResultApplicability } from '../../src/lib/practice/operations';
import type { PracticeSnapshot } from '../../src/types/practice';

const snapshot: PracticeSnapshot = {
  snapshotRevisionId: 'practice-snapshot:result',
  videoId: 'video-1',
  textSource: {
    id: 'text-source:asr',
    revisionId: 'text-source:asr-rev',
    contentFingerprint: 'text-content:asr',
    languageCode: 'nl',
    label: 'NL ASR',
    kind: 'asr',
    status: 'ready',
  },
  availableTextSources: [],
  timingEvidence: {
    id: 'timing-evidence:word',
    revisionId: 'timing-evidence:word-rev',
    quality: 'word',
  },
  phraseSet: {
    id: 'phrase-set:nl',
    revisionId: 'phrase-set:result',
    phrases: [{ id: 0, startSec: 1, endSec: 2, text: 'Hij loopt.' }],
  },
  readiness: {
    baseState: 'precise',
    displayState: 'precise',
    availableActions: [],
  },
};

describe('practice operation result applicability', () => {
  it('does not imply safe auto-apply when the requested snapshot revision is missing', () => {
    expect(practiceOperationResultApplicability({}, snapshot)).toMatchObject({
      appliesToCurrentSnapshot: false,
      staleReason: 'missing-requested-snapshot-revision',
      resultSnapshotRevisionId: 'practice-snapshot:result',
    });
  });

  it('marks the result stale when the supplied text source revision differs from the result snapshot', () => {
    expect(
      practiceOperationResultApplicability(
        {
          snapshotRevisionId: 'practice-snapshot:requested',
          textSourceRevisionId: 'text-source:captions-rev',
        },
        snapshot,
      ),
    ).toMatchObject({
      appliesToCurrentSnapshot: false,
      staleReason: 'text-source-revision-mismatch',
      requestedTextSourceRevisionId: 'text-source:captions-rev',
      resultTextSourceRevisionId: 'text-source:asr-rev',
    });
  });

  it('treats changed timing evidence as a new output, not as a stale result by itself', () => {
    const applicability = practiceOperationResultApplicability(
      {
        snapshotRevisionId: 'practice-snapshot:requested',
        textSourceRevisionId: 'text-source:asr-rev',
        timingEvidenceRevisionId: 'timing-evidence:rough-rev',
      },
      snapshot,
    );

    expect(applicability).toMatchObject({
      appliesToCurrentSnapshot: true,
      requestedTimingEvidenceRevisionId: 'timing-evidence:rough-rev',
      resultTimingEvidenceRevisionId: 'timing-evidence:word-rev',
      diagnostics: [
        'Requested timing evidence revision is an input baseline; the result timing evidence revision is a new output and is not a stale check.',
      ],
    });
    expect(applicability).not.toHaveProperty('staleReason');
  });
});
