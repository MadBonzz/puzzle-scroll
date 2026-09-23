import type { CognitiveDomain } from '../types';
import type { SessionState } from '../session/sessionMachine';

export interface AssessmentResult {
  resultId: string;
  sessionId: string;
  protocolId: string;
  formFamily: string;
  domain: CognitiveDomain;
  pace: SessionState['pace'];
  tier: SessionState['tier'];
  completedAtMs: number;
  eligibleTrialCount: number;
  accuracy?: number;
  medianCorrectResponseMs?: number;
  complete: boolean;
  interrupted: boolean;
  isBaseline: boolean;
  baselineResultId?: string;
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function assessmentResultsForSession(session: SessionState, existing: AssessmentResult[]) {
  if (session.kind !== 'check' || session.status !== 'summary') return [];
  return session.categories.flatMap((domain): AssessmentResult[] => {
    const items = session.items.filter((item) => item.domain === domain);
    const attempts = session.attempts.filter((attempt) => attempt.domain === domain);
    if (!items.length) return [];
    const submitted = attempts.filter((attempt) => attempt.outcome === 'correct' || attempt.outcome === 'incorrect');
    const correct = submitted.filter((attempt) => attempt.outcome === 'correct');
    const interrupted = attempts.some((attempt) => attempt.outcome === 'interrupted');
    const protocolId = items[0]?.protocolId ?? 'unknown-check-protocol';
    const formFamily = items[0]?.formFamily ?? `unknown-${domain}`;
    const complete = attempts.length === items.length && !interrupted;
    const compatibleBaseline = existing.find((result) =>
      result.domain === domain &&
      result.protocolId === protocolId &&
      result.formFamily === formFamily &&
      result.pace === session.pace &&
      result.tier === session.tier &&
      result.complete &&
      !result.interrupted
    );
    const eligibleForBaseline = complete && submitted.length === items.length;
    const resultId = `${session.sessionId}:${domain}`;
    return [{
      resultId,
      sessionId: session.sessionId,
      protocolId,
      formFamily,
      domain,
      pace: session.pace,
      tier: session.tier,
      completedAtMs: session.lastEventAtMs,
      eligibleTrialCount: submitted.length,
      accuracy: submitted.length ? correct.length / submitted.length : undefined,
      medianCorrectResponseMs: correct.length ? median(correct.map((attempt) => attempt.responseMs)) : undefined,
      complete,
      interrupted,
      isBaseline: eligibleForBaseline && !compatibleBaseline,
      baselineResultId: compatibleBaseline?.isBaseline
        ? compatibleBaseline.resultId
        : compatibleBaseline?.baselineResultId
    }];
  });
}
