import {
  analyticsSummary,
  comparableAttemptKey,
  correctLatency,
  localDayKey,
  practiceStreak,
  speedAccuracyBySession,
  timeByLocalDay
} from '../../src/analytics/metrics';
import type { AttemptRecord } from '../../src/session/sessionMachine';
import type { SessionHistoryRecord } from '../../src/store/appStore';

const attempt = (outcome: AttemptRecord['outcome'], responseMs = 1_000, assisted = false, overrides: Partial<AttemptRecord> = {}): AttemptRecord => ({
  sessionId: 's',
  kind: 'practice',
  instanceId: Math.random().toString(),
  contentId: 'c',
  contentVersion: 1,
  domain: 'reasoning',
  pace: 'fast',
  tier: 'hard',
  outcome,
  assisted,
  responseMs,
  activeTaskMs: responseMs,
  committedAtMs: 0,
  displayedChoices: [],
  prompt: 'Fixture prompt',
  correctChoiceIds: [],
  explanation: '',
  ...overrides
});

describe('analytics definitions', () => {
  test('A01: outcomes and submitted-answer accuracy use exact denominators', () => {
    const records = [
      attempt('correct'),
      attempt('correct'),
      attempt('correct'),
      attempt('correct', 1_000, true),
      attempt('incorrect'),
      attempt('incorrect'),
      attempt('skipped'),
      attempt('timedOut'),
      attempt('interrupted')
    ];
    expect(analyticsSummary(records)).toMatchObject({
      total: 9,
      correct: 4,
      incorrect: 2,
      skipped: 1,
      timedOut: 1,
      interrupted: 1,
      assistedCorrect: 1,
      submittedAccuracy: 4 / 6,
      hardSolved: 4,
      activeTaskMs: 9_000
    });
  });

  test('A02/A03: median gate is correct-only, unassisted, and sample-aware', () => {
    const eligible = Array.from({ length: 10 }, (_, index) => attempt('correct', (index + 1) * 1_000));
    expect(correctLatency(eligible)).toEqual({ eligibleCount: 10, medianMs: 5_500, trendEligible: false });
    expect(correctLatency(eligible.slice(0, 9))).toEqual({ eligibleCount: 9, medianMs: undefined, trendEligible: false });
    expect(correctLatency([...eligible, attempt('incorrect', 1), attempt('correct', 1, true)])).toEqual({
      eligibleCount: 10,
      medianMs: 5_500,
      trendEligible: false
    });
    expect(analyticsSummary([]).submittedAccuracy).toBeUndefined();
    expect(correctLatency(Array.from({ length: 20 }, (_, index) => attempt('correct', index + 1))).trendEligible).toBe(true);
  });

  test('A05: local-day keys respect New York midnight and DST', () => {
    expect(localDayKey(Date.parse('2026-09-22T03:59:00Z'), 'America/New_York')).toBe('2026-09-21');
    expect(localDayKey(Date.parse('2026-09-22T04:01:00Z'), 'America/New_York')).toBe('2026-09-22');
    expect(localDayKey(Date.parse('2026-11-01T05:30:00Z'), 'America/New_York')).toBe('2026-11-01');
    expect(localDayKey(Date.parse('2026-11-01T06:30:00Z'), 'America/New_York')).toBe('2026-11-01');
  });

  test('A02: latency and speed/accuracy comparisons never merge another family, tier, pace, or protocol', () => {
    const base = Array.from({ length: 10 }, (_, index) => attempt('correct', (index + 1) * 1_000));
    const key = comparableAttemptKey(base[0]!);
    const unrelated = [
      attempt('correct', 1, false, { contentId: 'other-family' }),
      attempt('correct', 1, false, { tier: 'easy' }),
      attempt('correct', 1, false, { pace: 'slow' }),
      attempt('correct', 1, false, { protocolId: 'v2' })
    ];
    expect(correctLatency([...base, ...unrelated])).toMatchObject({ eligibleCount: 0, medianMs: undefined });
    expect(correctLatency([...base, ...unrelated], key)).toMatchObject({ eligibleCount: 10, medianMs: 5_500 });
    const series = speedAccuracyBySession([
      attempt('correct', 1_000, false, { sessionId: 'one' }),
      attempt('incorrect', 2_000, false, { sessionId: 'one' }),
      attempt('correct', 1, false, { sessionId: 'one', contentId: 'other-family' })
    ], key);
    expect(series).toEqual([{ sessionId: 'one', accuracy: 0.5, medianCorrectResponseMs: 1_000, eligibleCount: 1 }]);
  });

  test('A04/A05: measured session time stays exact by local day and streak resets after inactivity', () => {
    const timing = (activeTaskMs: number, feedbackMs = 0) => ({
      instructionsMs: 0,
      activeTaskMs,
      studyMs: 0,
      interferenceMs: 0,
      responseMs: activeTaskMs,
      feedbackMs,
      engagedMs: activeTaskMs + feedbackMs,
      wallElapsedMs: activeTaskMs + feedbackMs
    });
    const history: SessionHistoryRecord[] = [
      {
        sessionId: 'sep21',
        kind: 'practice',
        pace: 'fast',
        tier: 'easy',
        categories: ['reasoning'],
        startedAtMs: Date.parse('2026-09-22T03:58:00Z'),
        endedAtMs: Date.parse('2026-09-22T03:59:00Z'),
        timing: timing(1_000, 5_000),
        attemptInstanceIds: ['a'],
        abandonedInstanceIds: []
      },
      {
        sessionId: 'sep22-check',
        kind: 'check',
        pace: 'fast',
        tier: 'medium',
        categories: ['reasoning'],
        startedAtMs: Date.parse('2026-09-22T04:00:00Z'),
        endedAtMs: Date.parse('2026-09-22T04:01:00Z'),
        timing: timing(2_000),
        attemptInstanceIds: ['b'],
        abandonedInstanceIds: []
      }
    ];
    expect(timeByLocalDay(history, 'America/New_York')).toEqual([
      { day: '2026-09-21', practiceActiveMs: 1_000, checkActiveMs: 0, feedbackMs: 5_000, sessionCount: 1 },
      { day: '2026-09-22', practiceActiveMs: 0, checkActiveMs: 2_000, feedbackMs: 0, sessionCount: 1 }
    ]);
    expect(practiceStreak(history, 'America/New_York', Date.parse('2026-09-22T12:00:00Z'))).toBe(0);
    expect(practiceStreak(history, 'America/New_York', Date.parse('2026-09-21T12:00:00Z'))).toBe(1);
  });
});
