import type { CognitiveDomain, PuzzleRound } from '../types';
import { gradeNumericResponse, type NumericAnswerPolicy } from '../content/answers';

export type Pace = 'fast' | 'slow';
export type DifficultyTier = 'easy' | 'medium' | 'hard';
export type SessionStatus = 'instructions' | 'active' | 'feedback' | 'paused' | 'summary' | 'review';
export type ItemPhase = 'ready' | 'study' | 'interference' | 'responding';
export type AttemptOutcome = 'correct' | 'incorrect' | 'skipped' | 'timedOut' | 'interrupted';

export interface SessionChoice {
  id: string;
  label: string;
}

export interface SessionItem {
  instanceId: string;
  contentId: string;
  contentVersion: number;
  prompt: string;
  choices: SessionChoice[];
  correctChoiceIds: string[];
  explanation: string;
  domain: CognitiveDomain;
  pace: Pace;
  tier: DifficultyTier;
  responsePolicy: 'ordinary' | 'no-go';
  protocolId?: string;
  formFamily?: string;
  sourceId?: string;
  effortRangeMinutes?: readonly [number, number];
  responseSchema?:
    | { kind: 'single-select' }
    | { kind: 'numeric'; policy: NumericAnswerPolicy; inputLabel: string; correctResponseLabel: string }
    | { kind: 'ordered'; correctResponseLabel: string };
  initialPhase?: ItemPhase;
  round?: PuzzleRound;
}

export interface AttemptRecord {
  sessionId: string;
  kind: 'practice' | 'check';
  instanceId: string;
  contentId: string;
  contentVersion: number;
  domain: CognitiveDomain;
  pace: Pace;
  tier: DifficultyTier;
  responseId?: string;
  outcome: AttemptOutcome;
  assisted: boolean;
  responseMs: number;
  activeTaskMs: number;
  committedAtMs: number;
  displayedChoices: SessionChoice[];
  prompt: string;
  correctChoiceIds: string[];
  explanation: string;
  protocolId?: string;
  formFamily?: string;
  sourceId?: string;
  notes?: string;
  correctResponseLabel?: string;
}

export interface SessionTiming {
  instructionsMs: number;
  activeTaskMs: number;
  studyMs: number;
  interferenceMs: number;
  responseMs: number;
  feedbackMs: number;
  engagedMs: number;
  wallElapsedMs: number;
}

export interface SessionState {
  sessionId: string;
  kind: 'practice' | 'check';
  status: SessionStatus;
  pausedFrom?: 'active' | 'feedback';
  phase: ItemPhase;
  pace: Pace;
  tier: DifficultyTier;
  categories: CognitiveDomain[];
  items: SessionItem[];
  currentIndex: number;
  attempts: AttemptRecord[];
  abandonedInstanceIds: string[];
  drafts: Record<string, { responseText?: string; notes?: string }>;
  missCount: number;
  threeMisses: boolean;
  budgetMs?: number;
  softTargetMs?: number;
  startedAtMs: number;
  lastEventAtMs: number;
  timing: SessionTiming;
  itemTimingBaseline: { activeTaskMs: number; responseMs: number };
  canContinue: boolean;
}

export interface CreateSessionInput {
  sessionId: string;
  kind: 'practice' | 'check';
  items: SessionItem[];
  pace: Pace;
  tier: DifficultyTier;
  categories: CognitiveDomain[];
  startedAtMs: number;
  budgetMs?: number;
  softTargetMs?: number;
  threeMisses?: boolean;
}

export type SessionEvent =
  | { type: 'START'; atMs: number; phase?: ItemPhase }
  | { type: 'SET_PHASE'; atMs: number; phase: ItemPhase; itemInstanceId?: string }
  | { type: 'SUBMIT'; atMs: number; responseId: string; assisted?: boolean; itemInstanceId?: string }
  | { type: 'SET_DRAFT_RESPONSE'; atMs: number; responseText: string; itemInstanceId: string }
  | { type: 'SET_NOTES'; atMs: number; notes: string; itemInstanceId: string }
  | { type: 'NO_GO_COMPLETE'; atMs: number; itemInstanceId?: string }
  | { type: 'SKIP'; atMs: number; itemInstanceId?: string }
  | { type: 'INTERRUPT'; atMs: number; itemInstanceId?: string }
  | { type: 'PAUSE'; atMs: number }
  | { type: 'RESUME'; atMs: number }
  | { type: 'NEXT'; atMs: number }
  | { type: 'END_SESSION'; atMs: number }
  | { type: 'SHOW_REVIEW'; atMs: number }
  | { type: 'BACK_TO_SUMMARY'; atMs: number }
  | { type: 'RETRY_ITEM'; atMs: number; instanceId: string }
  | { type: 'TICK'; atMs: number; itemInstanceId?: string };

const emptyTiming = (): SessionTiming => ({
  instructionsMs: 0,
  activeTaskMs: 0,
  studyMs: 0,
  interferenceMs: 0,
  responseMs: 0,
  feedbackMs: 0,
  engagedMs: 0,
  wallElapsedMs: 0
});

export function createSessionState(input: CreateSessionInput): SessionState {
  if (!input.items.length) throw new Error('Cannot create a session without eligible items');
  return {
    sessionId: input.sessionId,
    kind: input.kind,
    status: 'instructions',
    phase: input.items[0]?.initialPhase ?? 'responding',
    pace: input.pace,
    tier: input.tier,
    categories: [...input.categories],
    items: [...input.items],
    currentIndex: 0,
    attempts: [],
    abandonedInstanceIds: [],
    drafts: {},
    missCount: 0,
    threeMisses: input.threeMisses ?? false,
    budgetMs: input.budgetMs,
    softTargetMs: input.softTargetMs,
    startedAtMs: input.startedAtMs,
    lastEventAtMs: input.startedAtMs,
    timing: emptyTiming(),
    itemTimingBaseline: { activeTaskMs: 0, responseMs: 0 },
    canContinue: input.items.length > 1
  };
}

function accrue(state: SessionState, atMs: number): SessionState {
  const safeAt = Math.max(atMs, state.lastEventAtMs);
  const rawDelta = safeAt - state.lastEventAtMs;
  const timing = { ...state.timing, wallElapsedMs: Math.max(0, safeAt - state.startedAtMs) };
  if (state.status === 'instructions') {
    timing.instructionsMs += rawDelta;
  } else if (state.status === 'active') {
    const remaining = state.budgetMs === undefined ? rawDelta : Math.max(0, state.budgetMs - timing.activeTaskMs);
    const delta = Math.min(rawDelta, remaining);
    timing.activeTaskMs += delta;
    if (state.phase === 'study') timing.studyMs += delta;
    if (state.phase === 'interference') timing.interferenceMs += delta;
    if (state.phase === 'responding') timing.responseMs += delta;
  } else if (state.status === 'feedback') {
    timing.feedbackMs += rawDelta;
  }
  timing.engagedMs = timing.instructionsMs + timing.activeTaskMs + timing.feedbackMs;
  return { ...state, lastEventAtMs: safeAt, timing };
}

function deadlineReached(state: SessionState, atMs: number) {
  if (state.budgetMs === undefined) return false;
  const pending = state.status === 'active' ? Math.max(0, atMs - state.lastEventAtMs) : 0;
  return state.timing.activeTaskMs + pending >= state.budgetMs;
}

function commit(
  original: SessionState,
  atMs: number,
  outcome: AttemptOutcome,
  responseId?: string,
  assisted = false
): SessionState {
  const current = original.items[original.currentIndex];
  if (!current || original.attempts.some((attempt) => attempt.instanceId === current.instanceId)) return accrue(original, atMs);
  const state = accrue(original, atMs);
  const responseMs = state.timing.responseMs - state.itemTimingBaseline.responseMs;
  const activeTaskMs = state.timing.activeTaskMs - state.itemTimingBaseline.activeTaskMs;
  const attempt: AttemptRecord = {
    sessionId: state.sessionId,
    kind: state.kind,
    instanceId: current.instanceId,
    contentId: current.contentId,
    contentVersion: current.contentVersion,
    domain: current.domain,
    pace: current.pace,
    tier: current.tier,
    responseId,
    outcome,
    assisted,
    responseMs,
    activeTaskMs,
    committedAtMs: state.lastEventAtMs,
    displayedChoices: current.choices.map((choice) => ({ ...choice })),
    prompt: current.prompt,
    correctChoiceIds: [...current.correctChoiceIds],
    explanation: current.explanation,
    protocolId: current.protocolId,
    formFamily: current.formFamily,
    sourceId: current.sourceId,
    notes: state.drafts[current.instanceId]?.notes,
    correctResponseLabel: current.responseSchema?.kind === 'numeric' || current.responseSchema?.kind === 'ordered'
      ? current.responseSchema.correctResponseLabel
      : undefined
  };
  const missCount = state.missCount + (outcome === 'incorrect' ? 1 : 0);
  const finalItem = state.currentIndex >= state.items.length - 1;
  const softTargetReached = state.softTargetMs !== undefined && state.timing.activeTaskMs >= state.softTargetMs;
  const canContinue = !finalItem && !(state.threeMisses && missCount >= 3) && outcome !== 'timedOut' && !(state.kind === 'check' && outcome === 'interrupted') && !softTargetReached;
  return {
    ...state,
    attempts: [...state.attempts, attempt],
    missCount,
    status: 'feedback',
    canContinue
  };
}

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  const itemScopedEvent = 'itemInstanceId' in event ? event.itemInstanceId : undefined;
  const currentInstanceId = state.items[state.currentIndex]?.instanceId;
  if (itemScopedEvent && itemScopedEvent !== currentInstanceId) return accrue(state, event.atMs);
  switch (event.type) {
    case 'START': {
      if (state.status !== 'instructions') return accrue(state, event.atMs);
      const accrued = accrue(state, event.atMs);
      return {
        ...accrued,
        status: 'active',
        phase: event.phase ?? accrued.items[accrued.currentIndex]?.initialPhase ?? 'responding',
        itemTimingBaseline: {
          activeTaskMs: accrued.timing.activeTaskMs,
          responseMs: accrued.timing.responseMs
        }
      };
    }
    case 'SET_PHASE': {
      if (state.status !== 'active') return accrue(state, event.atMs);
      return { ...accrue(state, event.atMs), phase: event.phase };
    }
    case 'SUBMIT': {
      if (state.status !== 'active' || state.phase !== 'responding') return accrue(state, event.atMs);
      if (deadlineReached(state, event.atMs)) return commit(state, event.atMs, 'timedOut');
      const current = state.items[state.currentIndex]!;
      const outcome: AttemptOutcome = current.responsePolicy === 'no-go'
        ? 'incorrect'
        : current.responseSchema?.kind === 'numeric'
          ? gradeNumericResponse(event.responseId, current.responseSchema.policy) ? 'correct' : 'incorrect'
          : current.responseSchema?.kind === 'ordered'
            ? event.responseId === current.correctChoiceIds.join('|') ? 'correct' : 'incorrect'
          : current.correctChoiceIds.includes(event.responseId) ? 'correct' : 'incorrect';
      return commit(state, event.atMs, outcome, event.responseId, event.assisted ?? false);
    }
    case 'SET_DRAFT_RESPONSE': {
      if (state.status !== 'active' || state.phase !== 'responding') return accrue(state, event.atMs);
      const accrued = accrue(state, event.atMs);
      return {
        ...accrued,
        drafts: {
          ...accrued.drafts,
          [event.itemInstanceId]: { ...accrued.drafts[event.itemInstanceId], responseText: event.responseText }
        }
      };
    }
    case 'SET_NOTES': {
      if (state.status !== 'active') return accrue(state, event.atMs);
      const accrued = accrue(state, event.atMs);
      return {
        ...accrued,
        drafts: {
          ...accrued.drafts,
          [event.itemInstanceId]: { ...accrued.drafts[event.itemInstanceId], notes: event.notes }
        }
      };
    }
    case 'NO_GO_COMPLETE': {
      if (state.status !== 'active') return accrue(state, event.atMs);
      const current = state.items[state.currentIndex]!;
      return commit(state, event.atMs, current.responsePolicy === 'no-go' ? 'correct' : 'timedOut');
    }
    case 'SKIP':
      return state.status === 'active' ? commit(state, event.atMs, 'skipped') : accrue(state, event.atMs);
    case 'INTERRUPT':
      return state.status === 'active' ? commit(state, event.atMs, 'interrupted') : accrue(state, event.atMs);
    case 'PAUSE': {
      if (state.status !== 'active' && state.status !== 'feedback') return accrue(state, event.atMs);
      const accrued = accrue(state, event.atMs);
      return { ...accrued, status: 'paused', pausedFrom: state.status };
    }
    case 'RESUME': {
      if (state.status !== 'paused') return accrue(state, event.atMs);
      const accrued = accrue(state, event.atMs);
      return { ...accrued, status: accrued.pausedFrom ?? 'active', pausedFrom: undefined };
    }
    case 'NEXT': {
      if (state.status !== 'feedback') return accrue(state, event.atMs);
      const accrued = accrue(state, event.atMs);
      if (!accrued.canContinue) return { ...accrued, status: 'summary' };
      const currentIndex = accrued.currentIndex + 1;
      return {
        ...accrued,
        status: 'active',
        phase: accrued.items[currentIndex]?.initialPhase ?? 'responding',
        currentIndex,
        itemTimingBaseline: {
          activeTaskMs: accrued.timing.activeTaskMs,
          responseMs: accrued.timing.responseMs
        },
        canContinue: currentIndex < accrued.items.length - 1
      };
    }
    case 'END_SESSION': {
      const current = state.items[state.currentIndex];
      const alreadyRecorded = current && state.attempts.some((attempt) => attempt.instanceId === current.instanceId);
      const abandonedInstanceIds = current && !alreadyRecorded && !state.abandonedInstanceIds.includes(current.instanceId)
        ? [...state.abandonedInstanceIds, current.instanceId]
        : state.abandonedInstanceIds;
      return { ...accrue(state, event.atMs), status: 'summary', canContinue: false, abandonedInstanceIds };
    }
    case 'SHOW_REVIEW':
      return state.status === 'summary' ? { ...accrue(state, event.atMs), status: 'review' } : accrue(state, event.atMs);
    case 'BACK_TO_SUMMARY':
      return state.status === 'review' ? { ...accrue(state, event.atMs), status: 'summary' } : accrue(state, event.atMs);
    case 'RETRY_ITEM': {
      if (state.status !== 'review' && state.status !== 'summary') return accrue(state, event.atMs);
      const original = state.items.find((item) => item.instanceId === event.instanceId);
      if (!original || !state.attempts.some((attempt) => attempt.instanceId === original.instanceId)) return accrue(state, event.atMs);
      const retryNumber = state.items.filter((item) => item.instanceId.startsWith(`${original.instanceId}-retry-`)).length + 1;
      const retry = {
        ...original,
        instanceId: `${original.instanceId}-retry-${retryNumber}`,
        choices: original.choices.map((choice) => ({ ...choice })),
        correctChoiceIds: [...original.correctChoiceIds]
      };
      const accrued = accrue(state, event.atMs);
      return {
        ...accrued,
        items: [...accrued.items, retry],
        currentIndex: accrued.items.length,
        status: 'active',
        phase: retry.initialPhase ?? 'responding',
        canContinue: false,
        itemTimingBaseline: {
          activeTaskMs: accrued.timing.activeTaskMs,
          responseMs: accrued.timing.responseMs
        }
      };
    }
    case 'TICK':
      if (state.status === 'active' && deadlineReached(state, event.atMs)) {
        const current = state.items[state.currentIndex];
        return commit(state, event.atMs, current?.responsePolicy === 'no-go' ? 'correct' : 'timedOut');
      }
      return accrue(state, event.atMs);
    default:
      return state;
  }
}
