import { domainIds } from '../data/domains';
import type { CognitiveDomain } from '../types';
import type { DifficultyTier, Pace } from '../session/sessionMachine';

interface LegacyAttempt {
  puzzleId: string;
  puzzleType: string;
  domain: CognitiveDomain;
  difficulty: number;
  accuracy: number;
  reactionTimeMs: number;
  completedAt: number;
  isAssessment: boolean;
}

interface MigratedLegacyAttempt extends LegacyAttempt {
  responseAvailable: false;
  timingKind: 'legacyEstimate';
}

export interface PersistedV2 {
  version: 2;
  preferences: {
    pace: Pace;
    tier: DifficultyTier;
    categories: CognitiveDomain[];
    explicitPuzzleTypes?: string[];
    [key: string]: unknown;
  };
  activeSession?: unknown;
  sessions: unknown[];
  sessionHistory?: unknown[];
  attempts: unknown[];
  assessments: unknown[];
  contentReports?: unknown[];
  savedChallenges?: unknown[];
  legacy?: {
    estimatedTrainingMinutes: number;
    attempts: MigratedLegacyAttempt[];
    assessments: unknown[];
    domainScores: Partial<Record<CognitiveDomain, unknown>>;
    initialScoreIsUnknown: true;
    knownAttemptTotal: number;
    knownAssessmentTotal: number;
    detailRetentionGap: { attempts: number; assessments: number };
    historicalDayConvention: 'uncertain-legacy';
    sourcePreset?: string;
  };
}

function parse(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      return parsed as Record<string, unknown>;
    } catch {
      throw new Error('Invalid persisted data');
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid persisted data');
  return raw as Record<string, unknown>;
}

function validatedV2(parsed: Record<string, unknown>): PersistedV2 {
  if (!parsed.preferences || typeof parsed.preferences !== 'object' || Array.isArray(parsed.preferences)) {
    throw new Error('Invalid version 2 preferences');
  }
  if (!Array.isArray(parsed.attempts) || !Array.isArray(parsed.assessments)) {
    throw new Error('Invalid version 2 history');
  }
  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions
    : Array.isArray(parsed.sessionHistory) ? parsed.sessionHistory : [];
  return {
    ...(parsed as unknown as PersistedV2),
    version: 2,
    sessions,
    attempts: parsed.attempts,
    assessments: parsed.assessments
  };
}

function mappedMode(mode: string): { pace: Pace; tier: DifficultyTier } {
  switch (mode) {
    case 'deepReasoning':
    case 'hardLogic':
      return { pace: 'slow', tier: 'hard' };
    case 'mathSprint':
    case 'memory':
      return { pace: 'fast', tier: 'medium' };
    case 'calmFocus':
      return { pace: 'slow', tier: 'easy' };
    case 'fastReflex':
      return { pace: 'fast', tier: 'easy' };
    default:
      return { pace: 'fast', tier: 'easy' };
  }
}

export function migratePersistedState(raw: unknown): PersistedV2 {
  const parsed = parse(raw);
  if (parsed.version === 2) return validatedV2(parsed);
  if (parsed.version !== undefined) throw new Error('Unsupported storage version');

  const settings = (parsed.feedSettings ?? {}) as Record<string, unknown>;
  const legacyMode = typeof settings.mode === 'string' ? settings.mode : 'mixed';
  const { pace, tier } = mappedMode(legacyMode);
  const categories = Array.isArray(settings.enabledDomains)
    ? settings.enabledDomains.filter((domain): domain is CognitiveDomain => domainIds.includes(domain as CognitiveDomain))
    : [];
  const rawAttempts = Array.isArray(parsed.attempts) ? parsed.attempts as LegacyAttempt[] : [];
  const rawAssessments = Array.isArray(parsed.assessments) ? parsed.assessments : [];
  const domains = parsed.domains && typeof parsed.domains === 'object' && !Array.isArray(parsed.domains)
    ? parsed.domains as Partial<Record<CognitiveDomain, { totalPuzzlesCompleted?: number }>>
    : {};
  const domainKnownTotal = domainIds.reduce(
    (sum, domain) => sum + Math.max(0, Number(domains[domain]?.totalPuzzlesCompleted ?? 0)),
    0
  );
  const nonAssessmentDetails = rawAttempts.filter((attempt) => !attempt.isAssessment).length;
  const knownAttemptTotal = Math.max(domainKnownTotal, nonAssessmentDetails);
  const knownAssessmentTotal = rawAssessments.length;
  const retainedAttempts = rawAttempts.slice(0, 300);
  const retainedAssessments = rawAssessments.slice(0, 50);
  const explicitPuzzleTypes = Array.isArray(settings.enabledPuzzleTypes)
    ? settings.enabledPuzzleTypes.filter((value): value is string => typeof value === 'string')
    : undefined;

  return {
    version: 2,
    preferences: {
      pace,
      tier,
      categories,
      explicitPuzzleTypes
    },
    sessions: [],
    attempts: [],
    assessments: [],
    contentReports: [],
    savedChallenges: [],
    legacy: {
      estimatedTrainingMinutes: typeof parsed.totalTrainingMinutes === 'number' ? parsed.totalTrainingMinutes : 0,
      attempts: retainedAttempts.map((attempt) => ({ ...attempt, responseAvailable: false, timingKind: 'legacyEstimate' })),
      assessments: retainedAssessments,
      domainScores: domains,
      initialScoreIsUnknown: true,
      knownAttemptTotal,
      knownAssessmentTotal,
      detailRetentionGap: {
        attempts: Math.max(0, knownAttemptTotal - retainedAttempts.filter((attempt) => !attempt.isAssessment).length),
        assessments: Math.max(0, knownAssessmentTotal - retainedAssessments.length)
      },
      historicalDayConvention: 'uncertain-legacy',
      sourcePreset: legacyMode
    }
  };
}
