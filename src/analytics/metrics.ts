import type { AttemptRecord } from '../session/sessionMachine';
import type { SessionHistoryRecord } from '../store/appStore';

export function analyticsSummary(attempts: AttemptRecord[]) {
  const count = (outcome: AttemptRecord['outcome']) => attempts.filter((attempt) => attempt.outcome === outcome).length;
  const correct = count('correct');
  const incorrect = count('incorrect');
  const submitted = correct + incorrect;
  return {
    total: attempts.length,
    correct,
    incorrect,
    skipped: count('skipped'),
    timedOut: count('timedOut'),
    interrupted: count('interrupted'),
    assistedCorrect: attempts.filter((attempt) => attempt.outcome === 'correct' && attempt.assisted).length,
    submittedAccuracy: submitted ? correct / submitted : undefined,
    hardSolved: attempts.filter((attempt) => attempt.tier === 'hard' && attempt.outcome === 'correct').length,
    activeTaskMs: attempts.reduce((sum, attempt) => sum + attempt.activeTaskMs, 0)
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function comparableAttemptKey(attempt: AttemptRecord) {
  return [
    attempt.formFamily ?? attempt.contentId,
    attempt.pace,
    attempt.tier,
    attempt.protocolId ?? 'unversioned'
  ].join('|');
}

export function correctLatency(attempts: AttemptRecord[], requestedKey?: string) {
  const groups = new Set(attempts.map(comparableAttemptKey));
  const selectedKey = requestedKey ?? (groups.size === 1 ? [...groups][0] : undefined);
  const values = attempts
    .filter((attempt) => selectedKey !== undefined && comparableAttemptKey(attempt) === selectedKey)
    .filter((attempt) => attempt.outcome === 'correct' && !attempt.assisted)
    .map((attempt) => attempt.responseMs);
  return {
    eligibleCount: values.length,
    medianMs: values.length >= 10 ? median(values) : undefined,
    trendEligible: values.length >= 20
  };
}

export function latencyGroups(attempts: AttemptRecord[]) {
  const keys = [...new Set(attempts.map(comparableAttemptKey))];
  return keys.map((key) => ({ key, ...correctLatency(attempts, key) }));
}

export function speedAccuracyBySession(attempts: AttemptRecord[], comparisonKey: string) {
  const groups = new Map<string, AttemptRecord[]>();
  for (const attempt of attempts.filter((candidate) => comparableAttemptKey(candidate) === comparisonKey)) {
    groups.set(attempt.sessionId, [...(groups.get(attempt.sessionId) ?? []), attempt]);
  }
  return [...groups.entries()].map(([sessionId, records]) => {
    const submitted = records.filter((attempt) => attempt.outcome === 'correct' || attempt.outcome === 'incorrect');
    const correctUnassisted = records.filter((attempt) => attempt.outcome === 'correct' && !attempt.assisted);
    return {
      sessionId,
      accuracy: submitted.length ? submitted.filter((attempt) => attempt.outcome === 'correct').length / submitted.length : undefined,
      medianCorrectResponseMs: correctUnassisted.length ? median(correctUnassisted.map((attempt) => attempt.responseMs)) : undefined,
      eligibleCount: correctUnassisted.length
    };
  });
}

export function localDayKey(timestampMs: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(timestampMs));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return [value('year'), value('month'), value('day')].join('-');
}

export function timeByLocalDay(history: SessionHistoryRecord[], timezone: string) {
  const days = new Map<string, {
    day: string;
    practiceActiveMs: number;
    checkActiveMs: number;
    feedbackMs: number;
    sessionCount: number;
  }>();
  for (const session of history) {
    const day = localDayKey(session.endedAtMs, timezone);
    const current = days.get(day) ?? { day, practiceActiveMs: 0, checkActiveMs: 0, feedbackMs: 0, sessionCount: 0 };
    if (session.kind === 'practice') current.practiceActiveMs += session.timing.activeTaskMs;
    else current.checkActiveMs += session.timing.activeTaskMs;
    current.feedbackMs += session.timing.feedbackMs;
    current.sessionCount += 1;
    days.set(day, current);
  }
  return [...days.values()].sort((left, right) => left.day.localeCompare(right.day));
}

export function practiceStreak(history: SessionHistoryRecord[], timezone: string, asOfMs: number) {
  const practiced = new Set(history.filter((session) => session.kind === 'practice').map((session) => localDayKey(session.endedAtMs, timezone)));
  let cursor = new Date(localDayKey(asOfMs, timezone) + 'T12:00:00Z');
  let count = 0;
  while (practiced.has(localDayKey(cursor.getTime(), timezone))) {
    count += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60_000);
  }
  return count;
}
