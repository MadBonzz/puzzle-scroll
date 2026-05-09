import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { domainIds } from '../data/domains';
import { allTrainingPuzzleTypeIds } from '../logic/puzzleGenerators';
import type { Assessment, CognitiveDomain, DomainScore, FeedSettings, PuzzleAttempt } from '../types';
import { adjustDifficulty, createInitialScores, scoreAssessment, trendFromScores } from '../logic/scoring';

interface AppStore {
  domains: Record<CognitiveDomain, DomainScore>;
  attempts: PuzzleAttempt[];
  assessments: Assessment[];
  feedSettings: FeedSettings;
  streakDays: number;
  totalTrainingMinutes: number;
  lastPracticeDate?: string;
  recordAttempt: (attempt: PuzzleAttempt) => void;
  recordAssessment: (assessment: Assessment) => void;
  toggleFeedDomain: (domain: CognitiveDomain) => void;
  toggleFeedPuzzleType: (typeId: string) => void;
  enableAllFeedPuzzles: () => void;
  enableHardFeedPuzzles: () => void;
  resetProgress: () => void;
}

type PersistedState = Omit<AppStore, 'recordAttempt' | 'recordAssessment' | 'toggleFeedDomain' | 'toggleFeedPuzzleType' | 'enableAllFeedPuzzles' | 'enableHardFeedPuzzles' | 'resetProgress'>;

const storageKey = 'puzzle-scroll-progress';
const listeners = new Set<() => void>();

const todayKey = () => new Date().toISOString().slice(0, 10);
const defaultFeedSettings = (): FeedSettings => ({
  enabledDomains: [...domainIds],
  enabledPuzzleTypes: [...allTrainingPuzzleTypeIds]
});

function normalizeFeedSettings(settings?: Partial<FeedSettings>): FeedSettings {
  const validDomains = new Set(domainIds);
  const validTypes = new Set(allTrainingPuzzleTypeIds);
  const enabledDomains = (settings?.enabledDomains ?? domainIds).filter((domain) => validDomains.has(domain));
  const enabledPuzzleTypes = (settings?.enabledPuzzleTypes ?? allTrainingPuzzleTypeIds).filter((typeId) => validTypes.has(typeId));
  return {
    enabledDomains: enabledDomains.length ? enabledDomains : [...domainIds],
    enabledPuzzleTypes: enabledPuzzleTypes.length ? enabledPuzzleTypes : [...allTrainingPuzzleTypeIds]
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
    lastPracticeDate: current.lastPracticeDate
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
  toggleFeedDomain: (domain: CognitiveDomain) => {
    const current = store.feedSettings.enabledDomains;
    const enabledDomains = current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain];
    setStore({
      feedSettings: {
        ...store.feedSettings,
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
        enabledPuzzleTypes: enabledPuzzleTypes.length ? enabledPuzzleTypes : [typeId]
      }
    });
  },
  enableAllFeedPuzzles: () => {
    setStore({ feedSettings: defaultFeedSettings() });
  },
  enableHardFeedPuzzles: () => {
    const hardDomains: CognitiveDomain[] = ['reasoning', 'planning', 'quantitative', 'language'];
    const hardTypes = [
      'interleaved-sequence',
      'logic-lock',
      'balance-code',
      'logic-grid',
      'conditional-syllogism',
      'spatial-transform',
      'suspect-deduction',
      'verbal-analogy',
      'constraint-clue',
      'critical-assumption',
      'cryptic-clue',
      'resource-schedule',
      'planning-grid',
      'seating-deduction',
      'weighing-puzzle',
      'river-crossing-plan',
      'symbolic-pattern',
      'quant-balance',
      'data-sufficiency',
      'work-rate'
    ];
    setStore({ feedSettings: { enabledDomains: hardDomains, enabledPuzzleTypes: hardTypes } });
  },
  resetProgress: () => {
    setStore({
      domains: createInitialScores(),
      attempts: [],
      assessments: [],
      feedSettings: defaultFeedSettings(),
      streakDays: 0,
      totalTrainingMinutes: 0,
      lastPracticeDate: undefined
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
