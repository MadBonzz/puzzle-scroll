import { createAppStore, appBackupKey, appStagingKey, appStorageKey, type StorageAdapter } from '../../src/store/appStore';
import { createSessionState, type SessionItem } from '../../src/session/sessionMachine';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('durable app store', () => {
  test('M04/E02: synchronous page-hide flush writes the latest state without weakening ordered async saves', async () => {
    const bytes = new Map<string, string>();
    const syncWrites: string[] = [];
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      setItemSync: (key, value) => {
        syncWrites.push(value);
        bytes.set(key, value);
      },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const store = createAppStore(storage);
    await store.hydrate();
    store.updatePreferences({ pace: 'slow' });
    store.updatePreferences({ tier: 'hard' });
    store.flushWritesSync();
    expect(syncWrites).toHaveLength(1);
    expect(JSON.parse(bytes.get(appStorageKey)!).preferences).toMatchObject({ pace: 'slow', tier: 'hard' });
    await store.flushWrites();
    expect(JSON.parse(bytes.get(appStorageKey)!).preferences).toMatchObject({ pace: 'slow', tier: 'hard' });
  });

  test('M01: delayed hydration cannot be overwritten by defaults', async () => {
    const read = deferred<string | null>();
    const writes: string[] = [];
    const storage: StorageAdapter = {
      getItem: jest.fn(() => read.promise),
      setItem: jest.fn(async (_key, value) => { writes.push(value); }),
      removeItem: jest.fn(async () => undefined)
    };
    const store = createAppStore(storage);
    const hydrating = store.hydrate();
    expect(store.getSnapshot().hydration).toBe('loading');
    expect(store.updatePreferences({ pace: 'slow' })).toBe(false);
    expect(writes).toEqual([]);
    read.resolve(JSON.stringify({
      attempts: [],
      assessments: [],
      feedSettings: {
        enabledDomains: ['reasoning'],
        enabledPuzzleTypes: ['implication-chain'],
        mode: 'hardLogic',
        sessionGoal: 'standard'
      },
      totalTrainingMinutes: 0
    }));
    await hydrating;
    expect(store.getSnapshot()).toMatchObject({
      hydration: 'ready',
      preferences: { pace: 'slow', tier: 'hard', categories: ['reasoning'] }
    });
  });

  test('M04: writes are serialized so an older write cannot win', async () => {
    const firstWrite = deferred<void>();
    const payloads: string[] = [];
    let calls = 0;
    const storage: StorageAdapter = {
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async (_key, value) => {
        payloads.push(value);
        calls += 1;
        if (calls === 1) await firstWrite.promise;
      }),
      removeItem: jest.fn(async () => undefined)
    };
    const store = createAppStore(storage);
    await store.hydrate();
    store.updatePreferences({ pace: 'slow' });
    store.updatePreferences({ tier: 'hard' });
    await Promise.resolve();
    await Promise.resolve();
    expect(payloads).toHaveLength(1);
    firstWrite.resolve();
    await store.flushWrites();
    expect(payloads).toHaveLength(2);
    expect(JSON.parse(payloads[1]!).preferences).toMatchObject({ pace: 'slow', tier: 'hard' });
  });

  test('M03/M06: failed reset preserves state and exposes an error', async () => {
    const storage: StorageAdapter = {
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => undefined),
      removeItem: jest.fn(async (key) => {
        expect(key).toBe(appStorageKey);
        throw new Error('reset denied');
      })
    };
    const store = createAppStore(storage);
    await store.hydrate();
    store.updatePreferences({ pace: 'slow' });
    await store.flushWrites();
    expect(await store.resetLocalData()).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ preferences: { pace: 'slow' }, storageError: 'reset denied' });
  });

  test('S03/T07: reload preserves the exact committed review snapshot and retry gets a new identity', async () => {
    const bytes = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const fixture: SessionItem = {
      instanceId: 'original',
      contentId: 'stable-content',
      contentVersion: 4,
      prompt: 'Original persisted prompt',
      choices: [
        { id: 'correct-id', label: 'Original correct choice' },
        { id: 'wrong-id', label: 'Original wrong choice' }
      ],
      correctChoiceIds: ['correct-id'],
      explanation: 'Original independently verified explanation.',
      domain: 'reasoning',
      pace: 'fast',
      tier: 'easy',
      responsePolicy: 'ordinary'
    };
    const first = createAppStore(storage);
    await first.hydrate();
    first.startSession(createSessionState({
      sessionId: 'persisted-session',
      kind: 'practice',
      items: [fixture],
      pace: 'fast',
      tier: 'easy',
      categories: ['reasoning'],
      startedAtMs: 0
    }));
    first.dispatchSession({ type: 'START', atMs: 0 });
    first.dispatchSession({ type: 'SUBMIT', atMs: 10, responseId: 'wrong-id', itemInstanceId: 'original' });
    first.dispatchSession({ type: 'NEXT', atMs: 20 });
    await first.flushWrites();

    const reloaded = createAppStore(storage);
    await reloaded.hydrate();
    expect(reloaded.getSnapshot().activeSession?.status).toBe('summary');
    const snapshot = reloaded.getSnapshot().activeSession?.attempts[0];
    expect(snapshot).toMatchObject({
      prompt: 'Original persisted prompt',
      responseId: 'wrong-id',
      correctChoiceIds: ['correct-id'],
      outcome: 'incorrect'
    });
    reloaded.dispatchSession({ type: 'SHOW_REVIEW', atMs: 30 });
    reloaded.dispatchSession({ type: 'RETRY_ITEM', atMs: 40, instanceId: 'original' });
    expect(reloaded.getSnapshot().activeSession?.items.at(-1)?.instanceId).toBe('original-retry-1');
    expect(reloaded.getSnapshot().activeSession?.attempts[0]).toEqual(snapshot);
  });

  test('T07: repeated callbacks and follow-up events contribute one attempt to global aggregates', async () => {
    const storage: StorageAdapter = {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined
    };
    const fixture: SessionItem = {
      instanceId: 'only',
      contentId: 'idempotent',
      contentVersion: 1,
      prompt: 'Choose A.',
      choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      correctChoiceIds: ['a'],
      explanation: 'A is fixed by the fixture.',
      domain: 'reasoning',
      pace: 'fast',
      tier: 'easy',
      responsePolicy: 'ordinary'
    };
    const store = createAppStore(storage);
    await store.hydrate();
    store.startSession(createSessionState({
      sessionId: 'idempotent-session',
      kind: 'practice',
      items: [fixture],
      pace: 'fast',
      tier: 'easy',
      categories: ['reasoning'],
      startedAtMs: 0
    }));
    store.dispatchSession({ type: 'START', atMs: 0 });
    store.dispatchSession({ type: 'SUBMIT', atMs: 10, responseId: 'a', itemInstanceId: 'only' });
    store.dispatchSession({ type: 'SUBMIT', atMs: 11, responseId: 'a', itemInstanceId: 'only' });
    store.dispatchSession({ type: 'NEXT', atMs: 12 });
    expect(store.getSnapshot().attempts).toHaveLength(1);
    expect(store.getSnapshot().activeSession?.attempts).toHaveLength(1);
  });

  test('M03: a crash before activation preserves original bytes and a later launch resumes staged migration', async () => {
    const legacyBytes = JSON.stringify({
      attempts: [],
      assessments: [],
      feedSettings: { enabledDomains: ['reasoning'], enabledPuzzleTypes: ['implication-chain'], mode: 'hardLogic' },
      totalTrainingMinutes: 2
    });
    const bytes = new Map<string, string>([[appStorageKey, legacyBytes]]);
    let failActivation = true;
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => {
        if (key === appStorageKey && failActivation) throw new Error('simulated activation crash');
        bytes.set(key, value);
      },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const first = createAppStore(storage);
    await first.hydrate();
    expect(first.getSnapshot().hydration).toBe('error');
    expect(bytes.get(appStorageKey)).toBe(legacyBytes);
    expect(bytes.get(appBackupKey)).toBe(legacyBytes);
    expect(bytes.get(appStagingKey)).toBeTruthy();

    failActivation = false;
    const resumed = createAppStore(storage);
    await resumed.hydrate();
    expect(resumed.getSnapshot()).toMatchObject({
      hydration: 'ready',
      preferences: { pace: 'slow', tier: 'hard' }
    });
    expect(JSON.parse(bytes.get(appStorageKey)!).version).toBe(2);
    expect(bytes.has(appStagingKey)).toBe(false);
    expect(bytes.get(appBackupKey)).toBe(legacyBytes);
  });

  test('T04: restart pauses practice without process downtime and adds exactly two seconds of new response work', async () => {
    const bytes = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const studyItem: SessionItem = {
      instanceId: 'timed',
      contentId: 'timed-content',
      contentVersion: 1,
      prompt: 'Respond after study',
      choices: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
      correctChoiceIds: ['yes'],
      explanation: 'Fixture',
      domain: 'workingMemory',
      pace: 'fast',
      tier: 'medium',
      responsePolicy: 'ordinary',
      initialPhase: 'study'
    };
    const first = createAppStore(storage);
    await first.hydrate();
    first.startSession(createSessionState({
      sessionId: 'restart',
      kind: 'practice',
      items: [studyItem],
      pace: 'fast',
      tier: 'medium',
      categories: ['workingMemory'],
      startedAtMs: 0
    }));
    first.dispatchSession({ type: 'START', atMs: 0, phase: 'study' });
    first.dispatchSession({ type: 'TICK', atMs: 1_000, itemInstanceId: 'timed' });
    await first.flushWrites();

    const second = createAppStore(storage, { now: () => 1_000_000 });
    await second.hydrate();
    expect(second.getSnapshot().activeSession).toMatchObject({
      status: 'paused',
      timing: { activeTaskMs: 1_000, responseMs: 0 }
    });
    second.dispatchSession({ type: 'RESUME', atMs: 1_000_000 });
    second.dispatchSession({ type: 'SET_PHASE', atMs: 1_000_000, phase: 'responding', itemInstanceId: 'timed' });
    second.dispatchSession({ type: 'SUBMIT', atMs: 1_002_000, responseId: 'yes', itemInstanceId: 'timed' });
    expect(second.getSnapshot().activeSession).toMatchObject({
      timing: { activeTaskMs: 3_000, responseMs: 2_000 },
      attempts: [{ activeTaskMs: 3_000, responseMs: 2_000, outcome: 'correct' }]
    });
  });

  test('T04: restart during a check trial records one interrupted attempt and cannot replay it', async () => {
    const bytes = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const checkItem: SessionItem = {
      instanceId: 'check-trial',
      contentId: 'check-content',
      contentVersion: 1,
      prompt: 'Timed check',
      choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      correctChoiceIds: ['a'],
      explanation: 'Fixture',
      domain: 'attention',
      pace: 'fast',
      tier: 'easy',
      responsePolicy: 'ordinary',
      initialPhase: 'study'
    };
    const first = createAppStore(storage);
    await first.hydrate();
    first.startSession(createSessionState({
      sessionId: 'check-restart',
      kind: 'check',
      items: [checkItem],
      pace: 'fast',
      tier: 'easy',
      categories: ['attention'],
      startedAtMs: 0
    }));
    first.dispatchSession({ type: 'START', atMs: 0, phase: 'study' });
    first.dispatchSession({ type: 'TICK', atMs: 400, itemInstanceId: 'check-trial' });
    await first.flushWrites();
    const reloaded = createAppStore(storage, { now: () => 50_000 });
    await reloaded.hydrate();
    expect(reloaded.getSnapshot().activeSession).toMatchObject({
      status: 'feedback',
      attempts: [{ instanceId: 'check-trial', outcome: 'interrupted' }]
    });
    reloaded.dispatchSession({ type: 'SUBMIT', atMs: 51_000, responseId: 'a', itemInstanceId: 'check-trial' });
    expect(reloaded.getSnapshot().activeSession?.attempts).toHaveLength(1);
  });

  test('M06: confirmed reset removes only app-owned keys and leaves unrelated storage untouched', async () => {
    const bytes = new Map<string, string>([['unrelated-sentinel', 'keep']]);
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const store = createAppStore(storage);
    await store.hydrate();
    bytes.set(appStorageKey, 'app');
    bytes.set(appStagingKey, 'stage');
    bytes.set(appBackupKey, 'backup');
    expect(await store.resetLocalData()).toBe(true);
    expect(bytes.has(appStorageKey)).toBe(false);
    expect(bytes.has(appStagingKey)).toBe(false);
    expect(bytes.has(appBackupKey)).toBe(false);
    expect(bytes.get('unrelated-sentinel')).toBe('keep');
  });

  test('E02: long-case version, options, numeric draft, and notes restore exactly after process restart', async () => {
    const bytes = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const longCase: SessionItem = {
      instanceId: 'long-case-instance',
      contentId: 'long-case-exact',
      contentVersion: 7,
      prompt: 'Derive the exact utilization ratio.',
      choices: [],
      correctChoiceIds: [],
      explanation: 'The verified result is one half.',
      domain: 'planning',
      pace: 'slow',
      tier: 'hard',
      responsePolicy: 'ordinary',
      responseSchema: {
        kind: 'numeric',
        policy: { kind: 'exact', accepted: ['1/2'] },
        inputLabel: 'Exact value',
        correctResponseLabel: '1/2'
      }
    };
    const first = createAppStore(storage);
    await first.hydrate();
    first.startSession(createSessionState({
      sessionId: 'long-resume',
      kind: 'practice',
      items: [longCase],
      pace: 'slow',
      tier: 'hard',
      categories: ['planning'],
      startedAtMs: 0,
      softTargetMs: 900_000
    }));
    first.dispatchSession({ type: 'START', atMs: 0 });
    first.dispatchSession({ type: 'SET_DRAFT_RESPONSE', atMs: 100, responseText: '2/4', itemInstanceId: 'long-case-instance' });
    first.dispatchSession({ type: 'SET_NOTES', atMs: 200, notes: 'Capacity 4; used 2.', itemInstanceId: 'long-case-instance' });
    await first.flushWrites();

    const resumed = createAppStore(storage, { now: () => 90_000 });
    await resumed.hydrate();
    expect(resumed.getSnapshot().activeSession).toMatchObject({
      status: 'paused',
      items: [{ contentId: 'long-case-exact', contentVersion: 7, instanceId: 'long-case-instance' }],
      drafts: { 'long-case-instance': { responseText: '2/4', notes: 'Capacity 4; used 2.' } }
    });
  });

  test('UX-25: reporting is version-specific, idempotent, and persists across reload', async () => {
    const bytes = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const first = createAppStore(storage);
    await first.hydrate();

    expect(first.reportContentProblem({
      contentId: 'disputed-item',
      contentVersion: 3,
      instanceId: 'disputed-instance',
      reportedAtMs: 1234
    })).toBe(true);
    expect(first.reportContentProblem({
      contentId: 'disputed-item',
      contentVersion: 3,
      instanceId: 'duplicate-instance',
      reportedAtMs: 9999
    })).toBe(false);
    expect(first.getSnapshot().contentReports).toEqual([expect.objectContaining({
      contentId: 'disputed-item',
      contentVersion: 3,
      instanceId: 'disputed-instance',
      reportedAtMs: 1234,
      status: 'pending-local-review'
    })]);
    await first.flushWrites();

    const reloaded = createAppStore(storage);
    await reloaded.hydrate();
    expect(reloaded.getSnapshot().contentReports).toEqual(first.getSnapshot().contentReports);
    expect(reloaded.isContentVersionExcluded('disputed-item', 3)).toBe(true);
    expect(reloaded.isContentVersionExcluded('disputed-item', 4)).toBe(false);
  });

  test('Phase E: a slow challenge is saved once as an immutable snapshot and survives reload', async () => {
    const bytes = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: async (key) => bytes.get(key) ?? null,
      setItem: async (key, value) => { bytes.set(key, value); },
      removeItem: async (key) => { bytes.delete(key); }
    };
    const slowItem: SessionItem = {
      instanceId: 'slow-save',
      contentId: 'slow-case',
      contentVersion: 2,
      prompt: 'Original slow case',
      choices: [{ id: 'right', label: 'Right' }, { id: 'wrong', label: 'Wrong' }],
      correctChoiceIds: ['right'],
      explanation: 'Verified reasoning.',
      domain: 'reasoning',
      pace: 'slow',
      tier: 'hard',
      responsePolicy: 'ordinary'
    };
    const first = createAppStore(storage);
    await first.hydrate();
    first.startSession(createSessionState({
      sessionId: 'slow-save-session', kind: 'practice', items: [slowItem], pace: 'slow', tier: 'hard',
      categories: ['reasoning'], startedAtMs: 0
    }));
    first.dispatchSession({ type: 'START', atMs: 0 });
    first.dispatchSession({ type: 'SUBMIT', atMs: 100, responseId: 'wrong', itemInstanceId: 'slow-save' });
    const snapshot = first.getSnapshot().attempts[0]!;
    expect(first.saveChallenge(snapshot)).toBe(true);
    expect(first.saveChallenge({ ...snapshot, explanation: 'Mutated duplicate' })).toBe(false);
    expect(first.getSnapshot().savedChallenges).toEqual([snapshot]);
    await first.flushWrites();

    const reloaded = createAppStore(storage);
    await reloaded.hydrate();
    expect(reloaded.getSnapshot().savedChallenges).toEqual([snapshot]);
    expect(reloaded.isChallengeSaved('slow-save')).toBe(true);
  });
});
