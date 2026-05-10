import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { domainIds } from '../data/domains';
import { allTrainingPuzzleTypeIds, trainingGeneratorEntries } from '../logic/puzzleGenerators';
import type { Assessment, CognitiveDomain, DomainScore, FeedMode, FeedSettings, PuzzleAttempt, SessionGoal } from '../types';
import { adjustDifficulty, createInitialScores, scoreAssessment, trendFromScores } from '../logic/scoring';

interface AppStore {
  domains: Record<CognitiveDomain, DomainScore>;
  attempts: PuzzleAttempt[];
  assessments: Assessment[];
  feedSettings: FeedSettings;
  streakDays: number;
  totalTrainingMinutes: number;
  lastPracticeDate?: string;
  lastBrainCheckPromptDate?: string;
  recordAttempt: (attempt: PuzzleAttempt) => void;
  recordAssessment: (assessment: Assessment) => void;
  setFeedMode: (mode: FeedMode) => void;
  setSessionGoal: (goal: SessionGoal) => void;
  toggleFeedDomain: (domain: CognitiveDomain) => void;
  toggleFeedPuzzleType: (typeId: string) => void;
  enableAllFeedPuzzles: () => void;
  enableHardFeedPuzzles: () => void;
  markBrainCheckPromptSeen: () => void;
  resetProgress: () => void;
}

type PersistedState = Omit<
  AppStore,
  | 'recordAttempt'
  | 'recordAssessment'
  | 'setFeedMode'
  | 'setSessionGoal'
  | 'toggleFeedDomain'
  | 'toggleFeedPuzzleType'
  | 'enableAllFeedPuzzles'
  | 'enableHardFeedPuzzles'
  | 'markBrainCheckPromptSeen'
  | 'resetProgress'
>;

const storageKey = 'puzzle-scroll-progress';
const listeners = new Set<() => void>();

const todayKey = () => new Date().toISOString().slice(0, 10);
const defaultFeedSettings = (): FeedSettings => ({
  enabledDomains: [...domainIds],
  enabledPuzzleTypes: [...allTrainingPuzzleTypeIds],
  mode: 'mixed',
  sessionGoal: 'standard'
});

function hardTypesFor(domains: CognitiveDomain[]) {
  return domains.flatMap((domain) => trainingGeneratorEntries[domain].filter((entry) => entry.complexity === 'Hard').map((entry) => entry.typeId));
}

function modePreset(mode: FeedMode, sessionGoal: SessionGoal): FeedSettings {
  if (mode === 'fastReflex') {
    return {
      enabledDomains: ['processingSpeed', 'attention', 'flexibility'],
      enabledPuzzleTypes: ['speed-match', 'peripheral-catch', 'pattern-flash', 'color-rush', 'symbol-scan', 'focus-fire', 'stop-signal', 'odd-pulse', 'rule-flip', 'switch-math'],
      mode,
      sessionGoal
    };
  }
  if (mode === 'deepReasoning') {
    const enabledDomains: CognitiveDomain[] = ['reasoning', 'planning', 'quantitative', 'language'];
    return { enabledDomains, enabledPuzzleTypes: hardTypesFor(enabledDomains), mode, sessionGoal };
  }
  if (mode === 'mathSprint') {
    return {
      enabledDomains: ['quantitative', 'reasoning', 'flexibility'],
      enabledPuzzleTypes: ['equation-system', 'ratio-puzzle', 'quant-balance', 'data-sufficiency', 'work-rate', 'mixture-puzzle', 'speed-distance', 'probability-draw', 'remainder-system', 'profit-discount', 'overlapping-sets', 'switch-math', 'balance-code'],
      mode,
      sessionGoal
    };
  }
  if (mode === 'memory') {
    return {
      enabledDomains: ['workingMemory', 'attention'],
      enabledPuzzleTypes: ['sequence-recall', 'number-chain', 'dual-track', 'memory-grid', 'operation-span', 'delayed-recall', 'color-word', 'conflict-grid'],
      mode,
      sessionGoal
    };
  }
  if (mode === 'calmFocus') {
    return {
      enabledDomains: ['attention', 'workingMemory', 'language'],
      enabledPuzzleTypes: ['color-word', 'focus-fire', 'conflict-grid', 'noise-filter', 'memory-grid', 'word-chain', 'quick-clue', 'constraint-clue'],
      mode,
      sessionGoal
    };
  }
  if (mode === 'hardLogic') {
    const enabledDomains: CognitiveDomain[] = ['reasoning', 'planning', 'quantitative', 'language'];
    return { enabledDomains, enabledPuzzleTypes: hardTypesFor(enabledDomains), mode, sessionGoal };
  }
  return { ...defaultFeedSettings(), mode, sessionGoal };
}

function normalizeFeedSettings(settings?: Partial<FeedSettings>): FeedSettings {
  const validDomains = new Set(domainIds);
  const validTypes = new Set(allTrainingPuzzleTypeIds);
  const mode = settings?.mode ?? 'mixed';
  const sessionGoal = settings?.sessionGoal ?? 'standard';
  const enabledDomains = (settings?.enabledDomains ?? domainIds).filter((domain) => validDomains.has(domain));
  const rawTypes = settings?.enabledPuzzleTypes;
  const shouldRefreshFullTypeList = !rawTypes || rawTypes.length >= 50;
  const enabledPuzzleTypes = (shouldRefreshFullTypeList ? allTrainingPuzzleTypeIds : rawTypes).filter((typeId) => validTypes.has(typeId));
  return {
    enabledDomains: enabledDomains.length ? enabledDomains : [...domainIds],
    enabledPuzzleTypes: enabledPuzzleTypes.length ? enabledPuzzleTypes : [...allTrainingPuzzleTypeIds],
    mode,
    sessionGoal
  };
}

function nextStreak(previousDate: string | undefined, currentStreak: number) {
  const today = todayKey();
  if (previousDate === today) return currentStreak;
  if (!previousDate) return 1;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return previousDate === yesterday.toISOString().slice(0, 10) ? currentStreak + 1 : 1;
}

function persistable(current: AppStore): PersistedState {
  return {
    domains: current.domains,
    attempts: current.attempts,
    assessments: current.assessments,
    feedSettings: normalizeFeedSettings(current.feedSettings),
    streakDays: current.streakDays,
    totalTrainingMinutes: current.totalTrainingMinutes,
    lastPracticeDate: current.lastPracticeDate,
    lastBrainCheckPromptDate: current.lastBrainCheckPromptDate
  };
}

function emit() {
  for (const listener of listeners) listener();
  AsyncStorage.setItem(storageKey, JSON.stringify(persistable(store))).catch(() => undefined);
}

function setStore(partial: Partial<PersistedState>) {
  store = { ...store, ...partial, ...actions };
  emit();
}

const actions = {
  recordAttempt: (attempt: PuzzleAttempt) => {
    const previous = store.domains[attempt.domain] ?? createInitialScores()[attempt.domain];
    const expectedMs =
      attempt.domain === 'processingSpeed'
        ? 1800
        : attempt.domain === 'reasoning'
          ? 5200
          : attempt.domain === 'planning'
            ? 6500
            : attempt.domain === 'quantitative'
              ? 5400
              : 3600;
    const nextLevel = adjustDifficulty(previous.currentLevel, attempt.accuracy, attempt.reactionTimeMs, expectedMs);
    const latestScore = attempt.isAssessment ? previous.latestScore : Math.round(previous.latestScore * 0.92 + attempt.accuracy * 100 * 0.08);

    setStore({
      attempts: [attempt, ...store.attempts].slice(0, 300),
      domains: {
        ...store.domains,
        [attempt.domain]: {
          ...previous,
          currentLevel: nextLevel,
          latestScore,
          bestScore: Math.max(previous.bestScore, latestScore),
          trend: trendFromScores(previous.latestScore, latestScore),
          totalPuzzlesCompleted: previous.totalPuzzlesCompleted + (attempt.isAssessment ? 0 : 1)
        }
      },
      streakDays: attempt.isAssessment ? store.streakDays : nextStreak(store.lastPracticeDate, store.streakDays),
      totalTrainingMinutes: store.totalTrainingMinutes + (attempt.isAssessment ? 0 : Math.max(0.25, attempt.reactionTimeMs / 60000)),
      lastPracticeDate: attempt.isAssessment ? store.lastPracticeDate : todayKey()
    });
  },
  recordAssessment: (assessment: Assessment) => {
    const nextDomains = { ...store.domains };
    for (const [domain, rawScore] of Object.entries(assessment.scores) as [
      CognitiveDomain,
      { accuracy: number; reactionTimeMs: number; compositeScore: number }
    ][]) {
      const previous = nextDomains[domain];
      const scored = rawScore.compositeScore ? rawScore : scoreAssessment(domain, rawScore.accuracy, rawScore.reactionTimeMs);
      nextDomains[domain] = {
        ...previous,
        baselineScore: assessment.type === 'baseline' ? scored.compositeScore : previous.baselineScore,
        latestScore: scored.compositeScore,
        bestScore: Math.max(previous.bestScore, scored.compositeScore),
        trend: trendFromScores(previous.latestScore, scored.compositeScore),
        lastAssessedAt: assessment.date
      };
    }
    setStore({ domains: nextDomains, assessments: [assessment, ...store.assessments].slice(0, 50) });
  },
  setFeedMode: (mode: FeedMode) => {
    setStore({ feedSettings: modePreset(mode, store.feedSettings.sessionGoal) });
  },
  setSessionGoal: (goal: SessionGoal) => {
    setStore({ feedSettings: { ...store.feedSettings, sessionGoal: goal } });
  },
  toggleFeedDomain: (domain: CognitiveDomain) => {
    const current = store.feedSettings.enabledDomains;
    const enabledDomains = current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain];
    setStore({
      feedSettings: {
        ...store.feedSettings,
        mode: 'mixed',
        enabledDomains: enabledDomains.length ? enabledDomains : [domain]
      }
    });
  },
  toggleFeedPuzzleType: (typeId: string) => {
    const current = store.feedSettings.enabledPuzzleTypes;
    const enabledPuzzleTypes = current.includes(typeId) ? current.filter((item) => item !== typeId) : [...current, typeId];
    setStore({
      feedSettings: {
        ...store.feedSettings,
        mode: 'mixed',
        enabledPuzzleTypes: enabledPuzzleTypes.length ? enabledPuzzleTypes : [typeId]
      }
    });
  },
  enableAllFeedPuzzles: () => {
    setStore({ feedSettings: { ...defaultFeedSettings(), sessionGoal: store.feedSettings.sessionGoal } });
  },
  enableHardFeedPuzzles: () => {
    setStore({ feedSettings: modePreset('hardLogic', store.feedSettings.sessionGoal) });
  },
  markBrainCheckPromptSeen: () => {
    setStore({ lastBrainCheckPromptDate: todayKey() });
  },
  resetProgress: () => {
    setStore({
      domains: createInitialScores(),
      attempts: [],
      assessments: [],
      feedSettings: defaultFeedSettings(),
      streakDays: 0,
      totalTrainingMinutes: 0,
      lastPracticeDate: undefined,
      lastBrainCheckPromptDate: undefined
    });
  }
};

let store: AppStore = {
  domains: createInitialScores(),
  attempts: [],
  assessments: [],
  feedSettings: defaultFeedSettings(),
  streakDays: 0,
  totalTrainingMinutes: 0,
  ...actions
};

let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(storageKey)
    .then((value) => {
      if (!value) return;
      const parsed = JSON.parse(value) as Partial<PersistedState>;
      store = {
        ...store,
        ...parsed,
        domains: { ...createInitialScores(), ...(parsed.domains ?? {}) },
        feedSettings: normalizeFeedSettings(parsed.feedSettings),
        ...actions
      };
      for (const listener of listeners) listener();
    })
    .catch(() => undefined);
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  hydrate();
  return store;
}

export function useAppStore<T>(selector: (state: AppStore) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot())
  );
}
