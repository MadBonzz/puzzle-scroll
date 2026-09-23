import type { CognitiveDomain } from '../types';
import type { DifficultyTier, Pace, SessionEvent, SessionState, AttemptRecord } from '../session/sessionMachine';
import { sessionReducer } from '../session/sessionMachine';
import { migratePersistedState, type PersistedV2 } from './migration';
import { domainIds } from '../data/domains';
import { assessmentResultsForSession, type AssessmentResult } from '../analytics/assessments';

export const appStorageKey = 'puzzle-scroll-progress';
export const appStagingKey = 'puzzle-scroll-progress-v2-staging';
export const appBackupKey = 'puzzle-scroll-progress-legacy-backup';

export interface Preferences {
  pace: Pace;
  tier: DifficultyTier;
  categories: CognitiveDomain[];
  allCategories: boolean;
  custom: {
    active: boolean;
    durationMs?: number;
    untimed: boolean;
    threeMisses: boolean;
    familyIds?: string[];
    hints: boolean;
  };
}

export interface SessionHistoryRecord {
  sessionId: string;
  kind: SessionState['kind'];
  pace: Pace;
  tier: DifficultyTier;
  categories: CognitiveDomain[];
  startedAtMs: number;
  endedAtMs: number;
  timing: SessionState['timing'];
  attemptInstanceIds: string[];
  abandonedInstanceIds: string[];
}

export interface ContentProblemReport {
  contentId: string;
  contentVersion: number;
  instanceId: string;
  reportedAtMs: number;
  status: 'pending-local-review';
}

export const contentVersionKey = (contentId: string, contentVersion: number) => `${contentId}:v${contentVersion}`;

export interface StoreState {
  hydration: 'loading' | 'ready' | 'error';
  storageError?: string;
  preferences: Preferences;
  activeSession?: SessionState;
  attempts: AttemptRecord[];
  sessionHistory: SessionHistoryRecord[];
  assessmentResults: AssessmentResult[];
  contentReports: ContentProblemReport[];
  savedChallenges: AttemptRecord[];
  legacy?: PersistedV2['legacy'];
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  setItemSync?(key: string, value: string): void;
}

export interface AppStore {
  getSnapshot(): StoreState;
  subscribe(listener: () => void): () => void;
  hydrate(): Promise<void>;
  updatePreferences(update: Partial<Preferences>): boolean;
  applyCustom(update: Preferences['custom']): boolean;
  startSession(session: SessionState): boolean;
  dispatchSession(event: SessionEvent): boolean;
  finishSession(): boolean;
  discardSession(): boolean;
  reportContentProblem(report: Omit<ContentProblemReport, 'status'>): boolean;
  isContentVersionExcluded(contentId: string, contentVersion: number): boolean;
  saveChallenge(attempt: AttemptRecord): boolean;
  isChallengeSaved(instanceId: string): boolean;
  resetLocalData(): Promise<boolean>;
  flushWrites(): Promise<void>;
  flushWritesSync(): void;
}

export const defaultPreferences = (): Preferences => ({
  pace: 'fast',
  tier: 'easy',
  categories: [...domainIds],
  allCategories: true,
  custom: {
    active: false,
    untimed: false,
    threeMisses: false,
    hints: true
  }
});

function normalizePreferences(raw?: Partial<Preferences>): Preferences {
  const defaults = defaultPreferences();
  const validDomains = new Set(domainIds);
  const categories = (raw?.categories ?? defaults.categories).filter((domain) => validDomains.has(domain));
  return {
    pace: raw?.pace === 'slow' ? 'slow' : 'fast',
    tier: raw?.tier === 'medium' || raw?.tier === 'hard' ? raw.tier : 'easy',
    categories: categories.length ? categories : defaults.categories,
    allCategories: raw?.allCategories ?? categories.length === domainIds.length,
    custom: {
      ...defaults.custom,
      ...(raw?.custom ?? {}),
      familyIds: raw?.custom?.familyIds ? [...raw.custom.familyIds] : undefined
    }
  };
}

function normalizeContentReports(raw: unknown): ContentProblemReport[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is ContentProblemReport => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const report = value as Partial<ContentProblemReport>;
    return typeof report.contentId === 'string' &&
      Number.isInteger(report.contentVersion) &&
      typeof report.instanceId === 'string' &&
      Number.isFinite(report.reportedAtMs) &&
      report.status === 'pending-local-review';
  }).slice(-500);
}

function normalizeSavedChallenges(raw: unknown): AttemptRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is AttemptRecord => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const attempt = value as Partial<AttemptRecord>;
    return attempt.pace === 'slow' &&
      typeof attempt.instanceId === 'string' &&
      typeof attempt.contentId === 'string' &&
      Number.isInteger(attempt.contentVersion) &&
      typeof attempt.prompt === 'string' &&
      typeof attempt.explanation === 'string' &&
      Array.isArray(attempt.displayedChoices) &&
      Array.isArray(attempt.correctChoiceIds);
  }).slice(-50);
}

function serializable(state: StoreState) {
  return {
    version: 2 as const,
    preferences: state.preferences,
    activeSession: state.activeSession,
    attempts: state.attempts,
    contentReports: state.contentReports,
    savedChallenges: state.savedChallenges,
    sessionHistory: state.sessionHistory,
    assessments: state.assessmentResults,
    sessions: state.sessionHistory,
    legacy: state.legacy
  };
}

function restoredSession(raw: SessionState | undefined, restoredAtMs: number) {
  if (!raw) return undefined;
  const itemsById = new Map(raw.items.map((item) => [item.instanceId, item]));
  const normalized: SessionState = {
    ...raw,
    abandonedInstanceIds: Array.isArray(raw.abandonedInstanceIds) ? [...raw.abandonedInstanceIds] : [],
    drafts: raw.drafts && typeof raw.drafts === 'object' ? { ...raw.drafts } : {},
    attempts: raw.attempts.map((attempt) => {
      const item = itemsById.get(attempt.instanceId);
      return {
        ...attempt,
        prompt: attempt.prompt ?? item?.prompt ?? 'Unavailable legacy prompt',
        correctChoiceIds: attempt.correctChoiceIds ?? item?.correctChoiceIds ?? []
      };
    }),
    lastEventAtMs: restoredAtMs
  };
  if (normalized.status === 'active') {
    if (normalized.kind === 'check') {
      return sessionReducer(normalized, {
        type: 'INTERRUPT',
        atMs: restoredAtMs,
        itemInstanceId: normalized.items[normalized.currentIndex]?.instanceId
      });
    }
    return { ...normalized, status: 'paused' as const, pausedFrom: 'active' as const };
  }
  return normalized;
}

export function createAppStore(storage: StorageAdapter, options?: { now?: () => number }): AppStore {
  const listeners = new Set<() => void>();
  let hydrationPromise: Promise<void> | undefined;
  let writeQueue: Promise<void> = Promise.resolve();
  let latestPayload: string | undefined;
  let state: StoreState = {
    hydration: 'loading',
    preferences: defaultPreferences(),
    attempts: [],
    sessionHistory: [],
    assessmentResults: [],
    contentReports: [],
    savedChallenges: []
  };

  const notify = () => listeners.forEach((listener) => listener());
  const replace = (next: StoreState) => {
    state = next;
    notify();
  };
  const setStorageError = (message?: string) => {
    if (state.storageError === message) return;
    state = { ...state, storageError: message };
    notify();
  };
  const persist = () => {
    if (state.hydration !== 'ready') return;
    const payload = JSON.stringify(serializable(state));
    latestPayload = payload;
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(() => storage.setItem(appStorageKey, payload))
      .then(() => setStorageError(undefined))
      .catch((error: unknown) => {
        setStorageError(error instanceof Error ? error.message : 'Storage write failed');
        throw error;
      });
  };
  const change = (next: StoreState) => {
    replace(next);
    persist();
  };

  const hydrate = () => {
    if (hydrationPromise) return hydrationPromise;
    hydrationPromise = (async () => {
      let raw = await storage.getItem(appStorageKey);
      const staged = await storage.getItem(appStagingKey);
      const backup = await storage.getItem(appBackupKey);
      if (staged && backup) {
        const stagedState = migratePersistedState(staged);
        const encoded = JSON.stringify(stagedState);
        await storage.setItem(appStorageKey, encoded);
        await storage.removeItem(appStagingKey);
        raw = encoded;
      }
      if (!raw) {
        replace({ ...state, hydration: 'ready' });
        return;
      }

      const parsed = JSON.parse(raw) as { version?: unknown };
      const migrated = migratePersistedState(raw) as PersistedV2 & {
        preferences?: Partial<Preferences>;
        activeSession?: SessionState;
        attempts?: AttemptRecord[];
        sessionHistory?: SessionHistoryRecord[];
        contentReports?: ContentProblemReport[];
        savedChallenges?: AttemptRecord[];
      };
      if (parsed.version === undefined) {
        if (!backup) await storage.setItem(appBackupKey, raw);
        const encoded = JSON.stringify(migrated);
        await storage.setItem(appStagingKey, encoded);
        migratePersistedState(encoded);
        await storage.setItem(appStorageKey, encoded);
        await storage.removeItem(appStagingKey);
      }

      const activeSession = restoredSession(migrated.activeSession, options?.now?.() ?? Date.now());
      const migratedAttempts: AttemptRecord[] = Array.isArray(migrated.attempts) ? migrated.attempts as AttemptRecord[] : [];
      const activeAttempts = activeSession?.attempts ?? [];
      const attemptIds = new Set(migratedAttempts.map((attempt) => attempt.instanceId));
      const restoredAttempts = [
        ...migratedAttempts,
        ...activeAttempts.filter((attempt) => !attemptIds.has(attempt.instanceId))
      ];
      replace({
        hydration: 'ready',
        preferences: normalizePreferences(migrated.preferences as Partial<Preferences>),
        activeSession,
        attempts: restoredAttempts,
        sessionHistory: Array.isArray(migrated.sessionHistory)
          ? migrated.sessionHistory
          : Array.isArray(migrated.sessions)
            ? migrated.sessions as SessionHistoryRecord[]
            : [],
        assessmentResults: Array.isArray(migrated.assessments) ? migrated.assessments as AssessmentResult[] : [],
        contentReports: normalizeContentReports(migrated.contentReports),
        savedChallenges: normalizeSavedChallenges(migrated.savedChallenges),
        legacy: migrated.legacy
      });
      if (activeSession !== migrated.activeSession) persist();
    })().catch((error: unknown) => {
      replace({
        ...state,
        hydration: 'error',
        storageError: error instanceof Error ? error.message : 'Storage hydration failed'
      });
    });
    return hydrationPromise;
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      void hydrate();
      return () => listeners.delete(listener);
    },
    hydrate,
    updatePreferences(update) {
      if (state.hydration !== 'ready') return false;
      change({ ...state, preferences: normalizePreferences({ ...state.preferences, ...update }) });
      return true;
    },
    applyCustom(custom) {
      if (state.hydration !== 'ready') return false;
      change({
        ...state,
        preferences: normalizePreferences({
          ...state.preferences,
          custom: { ...custom, active: true }
        })
      });
      return true;
    },
    startSession(session) {
      if (state.hydration !== 'ready' || state.activeSession) return false;
      change({ ...state, activeSession: session });
      return true;
    },
    dispatchSession(event) {
      if (state.hydration !== 'ready' || !state.activeSession) return false;
      if (event.type === 'RETRY_ITEM') {
        const retryItem = state.activeSession.items.find((item) => item.instanceId === event.instanceId);
        if (retryItem && state.contentReports.some(
          (report) => contentVersionKey(report.contentId, report.contentVersion) === contentVersionKey(retryItem.contentId, retryItem.contentVersion)
        )) return false;
      }
      const previous = state.activeSession;
      const activeSession = sessionReducer(previous, event);
      const previousIds = new Set(previous.attempts.map((attempt) => attempt.instanceId));
      const newAttempts = activeSession.attempts.filter((attempt) => !previousIds.has(attempt.instanceId));
      let sessionHistory = state.sessionHistory;
      let assessmentResults = state.assessmentResults;
      if (activeSession.status === 'summary' && !sessionHistory.some((session) => session.sessionId === activeSession.sessionId)) {
        sessionHistory = [
          {
            sessionId: activeSession.sessionId,
            kind: activeSession.kind,
            pace: activeSession.pace,
            tier: activeSession.tier,
            categories: activeSession.categories,
            startedAtMs: activeSession.startedAtMs,
            endedAtMs: activeSession.lastEventAtMs,
            timing: activeSession.timing,
            attemptInstanceIds: activeSession.attempts.map((attempt) => attempt.instanceId),
            abandonedInstanceIds: [...activeSession.abandonedInstanceIds]
          },
          ...sessionHistory
        ];
        if (activeSession.kind === 'check') {
          assessmentResults = [
            ...assessmentResultsForSession(activeSession, assessmentResults),
            ...assessmentResults
          ];
        }
      }
      change({
        ...state,
        activeSession,
        attempts: [...state.attempts, ...newAttempts],
        sessionHistory,
        assessmentResults
      });
      return true;
    },
    finishSession() {
      if (state.hydration !== 'ready' || !state.activeSession || state.activeSession.status !== 'summary') return false;
      change({ ...state, activeSession: undefined });
      return true;
    },
    discardSession() {
      if (state.hydration !== 'ready' || !state.activeSession) return false;
      change({ ...state, activeSession: undefined });
      return true;
    },
    reportContentProblem(report) {
      if (state.hydration !== 'ready') return false;
      const key = contentVersionKey(report.contentId, report.contentVersion);
      if (state.contentReports.some((existing) => contentVersionKey(existing.contentId, existing.contentVersion) === key)) return false;
      change({
        ...state,
        contentReports: [...state.contentReports, { ...report, status: 'pending-local-review' as const }].slice(-500)
      });
      return true;
    },
    isContentVersionExcluded(contentId, contentVersion) {
      const key = contentVersionKey(contentId, contentVersion);
      return state.contentReports.some((report) => contentVersionKey(report.contentId, report.contentVersion) === key);
    },
    saveChallenge(attempt) {
      if (state.hydration !== 'ready' || attempt.pace !== 'slow') return false;
      if (state.savedChallenges.some((saved) => saved.instanceId === attempt.instanceId)) return false;
      const snapshot: AttemptRecord = {
        ...attempt,
        displayedChoices: attempt.displayedChoices.map((choice) => ({ ...choice })),
        correctChoiceIds: [...attempt.correctChoiceIds]
      };
      change({ ...state, savedChallenges: [...state.savedChallenges, snapshot].slice(-50) });
      return true;
    },
    isChallengeSaved(instanceId) {
      return state.savedChallenges.some((attempt) => attempt.instanceId === instanceId);
    },
    async resetLocalData() {
      if (state.hydration !== 'ready') return false;
      try {
        await writeQueue.catch(() => undefined);
        await storage.removeItem(appStorageKey);
        await storage.removeItem(appStagingKey);
        await storage.removeItem(appBackupKey);
        latestPayload = undefined;
        replace({
          hydration: 'ready',
          preferences: defaultPreferences(),
          attempts: [],
          sessionHistory: [],
          assessmentResults: [],
          contentReports: [],
          savedChallenges: []
        });
        return true;
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'Storage reset failed');
        return false;
      }
    },
    async flushWrites() {
      await writeQueue;
    },
    flushWritesSync() {
      if (state.hydration !== 'ready' || !latestPayload || !storage.setItemSync) return;
      try {
        storage.setItemSync(appStorageKey, latestPayload);
      } catch {
        // The asynchronous queue remains authoritative and exposes any write error in app state.
      }
    }
  };
}
