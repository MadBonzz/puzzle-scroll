import { migratePersistedState } from '../../src/store/migration';

describe('legacy migration', () => {
  const legacy = {
    attempts: [{ puzzleId: 'old-1', puzzleType: 'speed-match', domain: 'processingSpeed', difficulty: 5, accuracy: 1, reactionTimeMs: 1_000, completedAt: 10, isAssessment: false }],
    assessments: [],
    feedSettings: { enabledDomains: ['processingSpeed'], enabledPuzzleTypes: ['speed-match'], mode: 'fastReflex', sessionGoal: 'short' },
    streakDays: 1,
    totalTrainingMinutes: 0.25
  };

  test('M02/M03: migration preserves legacy facts, labels uncertainty, and is idempotent', () => {
    const once = migratePersistedState(legacy);
    expect(once.version).toBe(2);
    expect(once.legacy?.estimatedTrainingMinutes).toBe(0.25);
    expect(once.legacy?.attempts[0]).toMatchObject({ responseAvailable: false, timingKind: 'legacyEstimate' });
    expect(once.preferences).toMatchObject({ pace: 'fast', tier: 'easy', categories: ['processingSpeed'] });
    expect(migratePersistedState(once)).toEqual(once);
  });

  test('M03: corrupt and unknown data fails without inventing defaults', () => {
    expect(() => migratePersistedState('{bad json')).toThrow(/invalid/i);
    expect(() => migratePersistedState({ version: 999 })).toThrow(/unsupported/i);
  });

  test('M05: bounded details retain known 301-attempt, 51-check, and per-domain totals', () => {
    const attempts = Array.from({ length: 301 }, (_, index) => ({
      puzzleId: `old-${index}`,
      puzzleType: 'implication-chain',
      domain: 'reasoning',
      difficulty: 10,
      accuracy: 1,
      reactionTimeMs: 1_000,
      completedAt: index,
      isAssessment: false
    }));
    const assessments = Array.from({ length: 51 }, (_, index) => ({ id: `check-${index}` }));
    const migrated = migratePersistedState({
      attempts,
      assessments,
      domains: { reasoning: { totalPuzzlesCompleted: 301, latestScore: 50 } },
      feedSettings: { enabledDomains: ['reasoning'], enabledPuzzleTypes: ['implication-chain'], mode: 'mixed' },
      totalTrainingMinutes: 75.25
    });
    expect(migrated.legacy).toMatchObject({
      knownAttemptTotal: 301,
      knownAssessmentTotal: 51,
      detailRetentionGap: { attempts: 1, assessments: 1 },
      initialScoreIsUnknown: true,
      historicalDayConvention: 'uncertain-legacy'
    });
    expect(migrated.legacy?.attempts).toHaveLength(300);
    expect(migrated.legacy?.assessments).toHaveLength(50);
    expect(migrated.legacy?.domainScores.reasoning).toMatchObject({ totalPuzzlesCompleted: 301 });
  });
});
