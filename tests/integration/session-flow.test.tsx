import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { PuzzleApp } from '../../src/screens/PuzzleApp';
import { buildSessionItems } from '../../src/content/catalog';
import { createSessionState, type SessionItem } from '../../src/session/sessionMachine';
import { createAppStore, type StorageAdapter } from '../../src/store/appStore';

// This is a wall-clock allowance for the React Native renderer on cold CI hosts.
// Behavioral timing remains deterministic through fake timers and exact assertions below.
jest.setTimeout(15_000);

const memoryStorage = (): StorageAdapter => {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); }
  };
};

const item = (id: string): SessionItem => ({
  instanceId: id,
  contentId: 'fixture-' + id,
  contentVersion: 1,
  prompt: 'Choose the verified answer.',
  choices: [
    { id: 'correct', label: 'Verified answer' },
    { id: 'wrong', label: 'Plausible distractor' }
  ],
  correctChoiceIds: ['correct'],
  explanation: 'The independent fixture establishes why the first option is correct.',
  domain: 'reasoning',
  pace: 'fast',
  tier: 'easy',
  responsePolicy: 'ordinary'
});

async function readyStore(items = [item('only')]) {
  const store = createAppStore(memoryStorage());
  await store.hydrate();
  const startedAtMs = Date.now();
  store.startSession(createSessionState({
    sessionId: 'integration-session',
    kind: 'practice',
    items,
    pace: 'fast',
    tier: 'easy',
    categories: ['reasoning'],
    startedAtMs,
    budgetMs: 300_000
  }));
  return store;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(async () => {
  await act(async () => { cleanup(); });
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('rendered session flow', () => {
  test('S01/E01: final incorrect response shows feedback, then results, review, and Done', async () => {
    const store = await readyStore();
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Start' }));
    await fireEvent.press(await view.findByRole('radio', { name: 'Plausible distractor' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Submit' }));

    expect(await view.findByText('Incorrect')).toBeTruthy();
    expect(view.getByText('Your answer: Plausible distractor')).toBeTruthy();
    expect(view.getByText('Correct answer: Verified answer')).toBeTruthy();
    expect(view.queryByText('Session complete')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'View results' }));
    expect(await view.findByText('Session complete')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Done' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Review answers' })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Review answers' }));
    expect(await view.findByText('Review answers')).toBeTruthy();
    expect(view.getByText('Your answer: Plausible distractor')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Back to summary' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Done' }));
    expect(await view.findByText('Train clearly. Know what improved.')).toBeTruthy();
    expect(store.getSnapshot().activeSession).toBeUndefined();
    expect(store.getSnapshot().attempts).toHaveLength(1);
  });

  test('UX-25: feedback and review can report an exact version for local exclusion', async () => {
    const store = await readyStore();
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Start' }));
    await fireEvent.press(await view.findByRole('radio', { name: 'Plausible distractor' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Submit' }));

    await fireEvent.press(await view.findByRole('button', { name: 'Report a problem' }));
    expect(await view.findByText('Reported locally. This exact question version will be excluded from future sessions.')).toBeTruthy();
    expect(store.getSnapshot().contentReports).toEqual([
      expect.objectContaining({ contentId: 'fixture-only', contentVersion: 1, instanceId: 'only' })
    ]);

    await fireEvent.press(view.getByRole('button', { name: 'View results' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Review answers' }));
    expect(view.getByRole('button', { name: 'Problem reported' }).props.accessibilityState.disabled).toBe(true);
    expect(view.getByRole('button', { name: 'Retry question 1' }).props.accessibilityState.disabled).toBe(true);
  });

  test('Phase E: slow feedback exposes a persistent Save challenge action', async () => {
    const store = await readyStore([{ ...item('slow-save'), pace: 'slow', tier: 'hard' }]);
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Start' }));
    await fireEvent.press(await view.findByRole('radio', { name: 'Plausible distractor' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Submit' }));

    await fireEvent.press(await view.findByRole('button', { name: 'Save challenge' }));
    expect(await view.findByText('Saved for later practice on this device.')).toBeTruthy();
    expect(store.getSnapshot().savedChallenges).toHaveLength(1);
    expect(view.getByRole('button', { name: 'Challenge saved' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByRole('button', { name: 'View results' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Done' }));
    await fireEvent.press(view.getByRole('button', { name: 'Progress' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Practice saved challenges (1)' }));
    expect(await view.findByText('Before you begin')).toBeTruthy();
    expect(store.getSnapshot().activeSession?.items[0]).toMatchObject({ prompt: 'Choose the verified answer.', pace: 'slow', tier: 'hard' });
  });

  test('S04: visible close pauses an active session and End reaches an escapable summary', async () => {
    const store = await readyStore([item('1'), item('2')]);
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Start' }));
    const close = await view.findByRole('button', { name: 'Close session' });
    await fireEvent.press(close);
    expect(await view.findByText('Session paused')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Resume' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'End session' }));
    expect(await view.findByText('Session complete')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Done' }));
    expect(await view.findByText('Train clearly. Know what improved.')).toBeTruthy();
  });

  test('F02: default setup exposes only the required primary choices and Custom', async () => {
    const store = createAppStore(memoryStorage());
    await store.hydrate();
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Start practice' }));
    expect(await view.findByRole('radio', { name: 'Fast' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Slow' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Easy' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Medium' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Hard' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Custom' })).toBeTruthy();
    expect(view.queryByText('Complex puzzle placement')).toBeNull();
  });

  test('Q09: a production delayed-recall item renders study, interference, then the response', async () => {
    const generated = buildSessionItems({
      pace: 'fast',
      tier: 'medium',
      categories: ['workingMemory'],
      familyIds: ['delayed-recall']
    }, 1, 91)[0]!;
    const timed = {
      ...generated,
      round: {
        ...generated.round!,
        studyDurationMs: 100,
        interferenceDurationMs: 100
      }
    };
    const store = await readyStore([timed]);
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Start' }));
    await fireEvent.press(await view.findByRole('button', { name: "I'm ready" }));
    expect(await view.findByText(timed.round!.studyPrompt!)).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(120); });
    expect(await view.findByText(timed.round!.interferencePrompt!)).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(120); });
    expect(await view.findByText(timed.prompt)).toBeTruthy();
    expect(view.getAllByRole('radio')).toHaveLength(4);
  });

  test('UX-24: production Trail Blaze uses ordered construction and exact-sequence grading', async () => {
    const generated = buildSessionItems({
      pace: 'fast',
      tier: 'easy',
      categories: ['flexibility'],
      familyIds: ['trail-blaze']
    }, 1, 19)[0]!;
    expect(generated.responseSchema?.kind).toBe('ordered');
    const store = await readyStore([generated]);
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Start' }));

    for (const id of generated.correctChoiceIds) {
      const label = generated.choices.find((choice) => choice.id === id)!.label;
      await fireEvent.press(await view.findByRole('button', { name: `Add ${label} to order` }));
    }
    expect(view.getByText(`Your order: ${generated.responseSchema?.kind === 'ordered' ? generated.responseSchema.correctResponseLabel : ''}`)).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Submit' }));
    expect(await view.findByText('Correct')).toBeTruthy();
  });

  test('S04: platform Back from instructions returns safely without starting or scoring', async () => {
    const handlers: Array<() => boolean | null | undefined> = [];
    const listener = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      handlers.push(handler);
      return { remove: jest.fn() };
    });
    try {
      const store = await readyStore();
      const view = await render(<PuzzleApp store={store} />);
      await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
      expect(await view.findByText('Before you begin')).toBeTruthy();
      await act(async () => { handlers.at(-1)!(); });
      expect(await view.findByText('Train clearly. Know what improved.')).toBeTruthy();
      expect(store.getSnapshot().activeSession).toBeUndefined();
      expect(store.getSnapshot().attempts).toHaveLength(0);
    } finally {
      listener.mockRestore();
    }
  });

  test('S03/S04/S05: feedback survives close/resume; review is immutable and every terminal page has an exit', async () => {
    const store = await readyStore([item('1'), item('2')]);
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Resume session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Start' }));
    await fireEvent.press(await view.findByRole('radio', { name: 'Plausible distractor' }));
    await fireEvent.press(view.getByRole('button', { name: 'Submit' }));
    expect(await view.findByText('Incorrect')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Close session' }));
    expect(await view.findByText('Session paused')).toBeTruthy();
    expect(store.getSnapshot().activeSession?.attempts).toHaveLength(1);
    await fireEvent.press(view.getByRole('button', { name: 'Resume' }));
    expect(await view.findByText('Incorrect')).toBeTruthy();
    expect(view.getByText('Your answer: Plausible distractor')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Next question' }));
    await fireEvent.press(view.getByRole('button', { name: 'Close session' }));
    await fireEvent.press(await view.findByRole('button', { name: 'End session' }));
    expect(await view.findByText('Session complete')).toBeTruthy();
    expect(store.getSnapshot().activeSession?.abandonedInstanceIds).toEqual(['2']);
    await fireEvent.press(view.getByRole('button', { name: 'Review answers' }));
    expect(await view.findByText('Unanswered (not scored)')).toBeTruthy();
    expect(view.getByText('Your answer: Plausible distractor')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Close session' }));
    expect(await view.findByText('Session complete')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Close session' }));
    expect(await view.findByText('Train clearly. Know what improved.')).toBeTruthy();
  });

  test('F04: Custom Cancel discards the draft and Apply persists it explicitly', async () => {
    const store = createAppStore(memoryStorage());
    await store.hydrate();
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Start practice' }));
    await fireEvent.press(await view.findByRole('button', { name: 'Custom' }));
    await fireEvent.press(view.getByRole('switch', { name: 'Untimed' }));
    await fireEvent.press(view.getByRole('button', { name: 'Cancel' }));
    expect(store.getSnapshot().preferences.custom).toMatchObject({ active: false, untimed: false });

    await fireEvent.press(view.getByRole('button', { name: 'Custom' }));
    expect(view.getByRole('switch', { name: 'Untimed' }).props.accessibilityState.checked).toBe(false);
    await fireEvent.press(view.getByRole('switch', { name: 'Untimed' }));
    await fireEvent.press(view.getByRole('button', { name: 'Apply' }));
    expect(store.getSnapshot().preferences.custom).toMatchObject({ active: true, untimed: true });
    expect(await view.findByText('Custom filters active')).toBeTruthy();
  });

  test('F01/F04: unsupported selection shows a clear empty-pool message without fallback', async () => {
    const store = createAppStore(memoryStorage());
    await store.hydrate();
    store.updatePreferences({ pace: 'slow', tier: 'easy', categories: ['attention'], allCategories: false });
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: 'Start practice' }));
    expect(await view.findByText('0 approved families available for this selection.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Start' }));
    expect(await view.findByRole('alert')).toHaveTextContent(/No approved questions match/i);
    expect(store.getSnapshot().activeSession).toBeUndefined();
  });

  test('A06/F02: quick check explains its fixed protocol and prepares only three visible selected domains', async () => {
    const store = createAppStore(memoryStorage());
    await store.hydrate();
    const view = await render(<PuzzleApp store={store} />);
    await fireEvent.press(view.getByRole('button', { name: /Check progress/ }));
    expect(await view.findByText(/Quick check protocol: Fast/)).toBeTruthy();
    expect(view.getByText('6 independent check trials prepared.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Start' }));
    expect(await view.findByText('Before your check')).toBeTruthy();
    expect(store.getSnapshot().activeSession).toMatchObject({ kind: 'check', pace: 'fast', tier: 'medium' });
    expect(store.getSnapshot().activeSession?.items).toHaveLength(6);
    expect(new Set(store.getSnapshot().activeSession?.items.map((candidate) => candidate.protocolId))).toEqual(new Set(['quick-check-v1']));
  });
});
