import { allTrainingPuzzleTypeIds } from '../../src/logic/puzzleGenerators';
import { buildSessionItems, coverageMatrix, eligibleFamilies, familyDispositions, publicationProblems } from '../../src/content/catalog';

describe('publication and selection gate', () => {
  test('Q12: every legacy family has a visible disposition and quarantines cannot serve', () => {
    expect(new Set(familyDispositions.map((item) => item.typeId))).toEqual(new Set(allTrainingPuzzleTypeIds));
    const quarantined = new Set(familyDispositions.filter((item) => !item.approved).map((item) => item.typeId));
    const served = eligibleFamilies({
      pace: 'fast',
      tier: 'easy',
      categories: ['processingSpeed', 'workingMemory', 'attention', 'flexibility', 'reasoning', 'language', 'planning', 'quantitative']
    });
    expect(served.some((item) => quarantined.has(item.typeId))).toBe(false);
  });

  test('F01/Q13: selection never changes pace, tier, or category silently', () => {
    const selections = [
      { pace: 'fast' as const, tier: 'easy' as const, categories: ['reasoning' as const] },
      { pace: 'slow' as const, tier: 'hard' as const, categories: ['planning' as const] }
    ];
    for (const selection of selections) {
      const items = buildSessionItems(selection, 5, 42);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item).toMatchObject({ pace: selection.pace, tier: selection.tier, domain: selection.categories[0] });
        expect(publicationProblems(item.round!)).toEqual([]);
      }
    }
    expect(buildSessionItems({ pace: 'slow', tier: 'easy', categories: ['attention'] }, 5, 42)).toEqual([]);
  });

  test('UX-25: a locally reported content version is excluded without excluding a future version', () => {
    const selection = {
      pace: 'fast' as const,
      tier: 'easy' as const,
      categories: ['reasoning' as const]
    };
    const available = buildSessionItems(selection, 1, 42);
    expect(available).toHaveLength(1);
    const item = available[0]!;
    const exactFamilySelection = { ...selection, familyIds: [item.contentId] };

    expect(buildSessionItems({
      ...exactFamilySelection,
      excludedContentVersions: [`${item.contentId}:v${item.contentVersion}`]
    }, 1, 42)).toEqual([]);
    expect(buildSessionItems({
      ...exactFamilySelection,
      excludedContentVersions: [`${item.contentId}:v${item.contentVersion + 1}`]
    }, 1, 42)).toHaveLength(1);
  });

  test('P03: coverage report contains all 48 required product cells', () => {
    const matrix = coverageMatrix();
    expect(matrix).toHaveLength(48);
    expect(new Set(matrix.map((cell) => `${cell.domain}|${cell.pace}|${cell.tier}`)).size).toBe(48);
  });

  test('Q13: every released family carries pace, tier, effort, response, QA, rights, and reasoning metadata', () => {
    for (const family of familyDispositions.filter((candidate) => candidate.approved)) {
      expect(family.pace).toMatch(/^(fast|slow)$/);
      expect(family.tier).toMatch(/^(easy|medium|hard)$/);
      expect(family.effortRangeMinutes?.[0]).toBeGreaterThan(0);
      expect(family.effortRangeMinutes?.[1]).toBeGreaterThanOrEqual(family.effortRangeMinutes![0]);
      expect(family.responseFormat).toBeTruthy();
      expect(family.reasoningOutline).toBeTruthy();
      expect(family.verificationMethod).toBeTruthy();
      expect(family.qaStatus).toBe('approved');
      expect(family.rightsStatus).toBe('cleared');
      expect(family.rightsEvidence).toBeTruthy();
      expect(family.humanTimingStatus).toMatch(/^(provisional|piloted)$/);
    }
  });

  test('F01: all 48 requested cells either deliver exact approved metadata or return an honest empty pool', () => {
    const domains = ['processingSpeed', 'workingMemory', 'attention', 'flexibility', 'reasoning', 'language', 'planning', 'quantitative'] as const;
    for (const pace of ['fast', 'slow'] as const) for (const tier of ['easy', 'medium', 'hard'] as const) for (const domain of domains) {
      const items = buildSessionItems({ pace, tier, categories: [domain] }, 4, 700);
      const approved = new Set(familyDispositions.filter((family) =>
        family.approved && family.pace === pace && family.tier === tier && family.domain === domain
      ).map((family) => family.typeId));
      if (!approved.size) {
        expect(items).toEqual([]);
      } else {
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          expect(item).toMatchObject({ pace, tier, domain });
          expect(approved.has(item.contentId)).toBe(true);
        }
      }
    }
  });

  test('F01: provenance is independent of mode—one cell has two sources and one source spans cells', () => {
    const cell = buildSessionItems({ pace: 'fast', tier: 'medium', categories: ['quantitative'] }, 8, 101);
    expect(new Set(cell.map((item) => item.sourceId))).toEqual(new Set(['public-domain-classics', 'puzzlescroll-original']));
    const originalFamilies = familyDispositions.filter((family) => family.approved && family.sourceId === 'puzzlescroll-original');
    expect(new Set(originalFamilies.map((family) => `${family.pace}|${family.tier}`)).size).toBeGreaterThan(1);
  });

  test('F03: all-current mode includes approved families that an explicit allowlist excludes', () => {
    const all = eligibleFamilies({ pace: 'fast', tier: 'medium', categories: ['quantitative'] });
    expect(all.length).toBeGreaterThan(1);
    const explicit = eligibleFamilies({
      pace: 'fast',
      tier: 'medium',
      categories: ['quantitative'],
      familyIds: [all[0]!.typeId]
    });
    expect(explicit.map((family) => family.typeId)).toEqual([all[0]!.typeId]);
    expect(explicit).not.toContainEqual(all[1]);
  });
});
