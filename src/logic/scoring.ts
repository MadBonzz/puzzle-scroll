import type { AssessmentScore, CognitiveDomain, DomainScore } from '../types';
import { domainIds } from '../data/domains';

export const initialDomainScore = (): DomainScore => ({
  currentLevel: 5,
  baselineScore: 50,
  latestScore: 50,
  bestScore: 50,
  trend: 'stable',
  totalPuzzlesCompleted: 0
});

export const createInitialScores = () =>
  Object.fromEntries(domainIds.map((domain) => [domain, initialDomainScore()])) as Record<CognitiveDomain, DomainScore>;

export function computeCompositeScore(accuracy: number, reactionTimeMs: number, expectedMs: number) {
  const speedScore = Math.max(0, Math.min(1, expectedMs / Math.max(650, reactionTimeMs)));
  return Math.round((accuracy * 0.68 + speedScore * 0.32) * 100);
}

export function scoreAssessment(domain: CognitiveDomain, accuracy: number, reactionTimeMs: number): AssessmentScore {
  const expectedByDomain: Record<CognitiveDomain, number> = {
    processingSpeed: 1800,
    workingMemory: 4200,
    attention: 2400,
    flexibility: 3800,
    reasoning: 5200,
    language: 4200,
    planning: 6500,
    quantitative: 5400
  };

  return {
    accuracy,
    reactionTimeMs,
    compositeScore: computeCompositeScore(accuracy, reactionTimeMs, expectedByDomain[domain])
  };
}

export function adjustDifficulty(currentLevel: number, accuracy: number, reactionTimeMs: number, expectedMs: number) {
  const fastEnough = reactionTimeMs <= expectedMs;
  const next = accuracy >= 1 && fastEnough ? currentLevel + 1 : accuracy < 1 ? currentLevel - 1 : currentLevel;
  return Math.max(1, Math.min(20, next));
}

export function trendFromScores(previous: number, next: number) {
  if (next - previous >= 4) return 'improving';
  if (previous - next >= 4) return 'declining';
  return 'stable';
}
