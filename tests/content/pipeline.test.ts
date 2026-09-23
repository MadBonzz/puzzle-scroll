import {
  contentCoverageReport,
  ingestPack,
  loadApprovedPack,
  packPublicationProblems,
  selectPackItems,
  type SourceManifest,
  type StagedPackItem
} from '../../src/content/pipeline';
import { familyDispositions } from '../../src/content/catalog';

const source: SourceManifest = {
  sourceId: 'puzzlescroll-original-test',
  title: 'Original test pack',
  licenseId: 'Copyright owner authorization',
  rightsEvidenceUrl: 'repo://docs/implementation/original-content-rights.md',
  rightsCheckedAt: '2026-09-22',
  contentReuseAllowed: true,
  codeOnlyLicense: false
};

const item = (overrides: Partial<StagedPackItem> = {}): StagedPackItem => ({
  contentId: 'fixture-logic-1',
  version: 1,
  templateId: 'fixture-logic-template',
  caseId: 'fixture-logic-case',
  domain: 'reasoning',
  pace: 'slow',
  tier: 'hard',
  responseFormat: 'single-select',
  effortRangeMinutes: [5, 10],
  prompt: 'All rules hold. Which listed conclusion follows?',
  assumptions: ['Every displayed rule holds without exception.'],
  choices: [
    { id: 'valid', label: 'The derived conclusion' },
    { id: 'invalid-a', label: 'A converse not licensed by the rules' },
    { id: 'invalid-b', label: 'A contradiction of a stated fact' },
    { id: 'invalid-c', label: 'A conclusion not determined' }
  ],
  correctChoiceIds: ['valid'],
  workedSolution: 'Apply the two stated implications, then eliminate each remaining option against a stated fact.',
  reasoningOutline: ['Translate the rules.', 'Derive the forced consequence.', 'Check every distractor.'],
  distractorRationales: {
    'invalid-a': 'It affirms the converse.',
    'invalid-b': 'It contradicts the stated fact.',
    'invalid-c': 'The conclusion is determined.'
  },
  qa: {
    independentSolve: 'pass',
    editorialReview: 'pass',
    rendererReview: 'pass',
    humanTiming: 'provisional'
  },
  ...overrides
});

describe('content pack governance', () => {
  test('P01/Q12: every missing publication prerequisite fails closed at import and load', () => {
    const variants: Array<[SourceManifest, StagedPackItem, string]> = [
      [{ ...source, rightsEvidenceUrl: '', contentReuseAllowed: false }, item(), 'missing rights evidence'],
      [{ ...source, codeOnlyLicense: true }, item(), 'code-only license does not clear content'],
      [source, item({ correctChoiceIds: [] }), 'missing key'],
      [source, item({ correctChoiceIds: ['valid', 'invalid-a'] }), 'ambiguous single-select key'],
      [source, item({ assumptions: [] }), 'missing required assumptions'],
      [source, item({ qa: { ...item().qa, independentSolve: 'not-run' } }), 'independent solve not passed'],
      [source, item({ qa: { ...item().qa, editorialReview: 'not-run' } }), 'editorial review not passed']
    ];
    for (const [manifest, candidate, expected] of variants) {
      expect(packPublicationProblems(manifest, candidate)).toContain(expected);
      const result = ingestPack([], manifest, [candidate]);
      expect(result.records[0]?.status).toBe('staged');
      expect(loadApprovedPack(result.records)).toEqual([]);
      expect(selectPackItems(result.records, { pace: 'slow', tier: 'hard', categories: ['reasoning'] })).toEqual([]);
    }

    const good = ingestPack([], source, [item()]).records[0]!;
    expect(good.status).toBe('approved');
    const tampered = { ...good, source: { ...good.source, contentReuseAllowed: false } };
    expect(loadApprovedPack([tampered])).toEqual([]);
  });

  test('P02: exact re-import is idempotent; new version coexists and never rewrites the old snapshot', () => {
    const first = ingestPack([], source, [item()]);
    expect(first).toMatchObject({ added: 1, errors: [] });
    const again = ingestPack(first.records, source, [item()]);
    expect(again).toMatchObject({ added: 0, errors: [] });
    expect(again.records).toHaveLength(1);

    const changedWithoutVersion = ingestPack(first.records, source, [item({ prompt: 'Changed without version bump' })]);
    expect(changedWithoutVersion.errors[0]).toMatch(/same identity\/version has different bytes/);
    expect(changedWithoutVersion.records[0]?.item.prompt).toBe(item().prompt);

    const versionTwo = ingestPack(first.records, source, [item({
      version: 2,
      prompt: 'Version two asks the same skill with a separately reviewed presentation.'
    })]);
    expect(versionTwo.errors).toEqual([]);
    expect(versionTwo.records).toHaveLength(2);
    expect(versionTwo.records[0]?.item.prompt).toBe(item().prompt);
    expect(versionTwo.records[1]?.item.version).toBe(2);
  });

  test('P03/Q13: machine report includes 48 cells and leaves unmet corpus targets failed, not relabelled', () => {
    const records = ingestPack([], source, [item()]).records;
    const report = contentCoverageReport(records);
    expect(report.cells).toHaveLength(48);
    expect(report.totals.unassignedQuarantinedFamilies).toBe(
      familyDispositions.filter((family) => !family.approved && (!family.pace || !family.tier)).length
    );
    expect(new Set(report.cells.map((cell) => `${cell.domain}|${cell.pace}|${cell.tier}`)).size).toBe(48);
    expect(report.totals.targets).toEqual({
      independentReasoningItems: 144,
      slowHardCases: 24,
      cognitiveConfigurations: 24
    });
    expect(report.totals.independentReasoningItems).toBe(1);
    expect(report.totals.slowHardCases).toBe(1);
    expect(report.totals.pilotReady).toBe(false);
  });
});
