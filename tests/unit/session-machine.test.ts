import { createSessionState, sessionReducer, type SessionEvent, type SessionItem } from '../../src/session/sessionMachine';

const item = (id: string, answer = 'a'): SessionItem => ({
  instanceId: id,
  contentId: `content-${id}`,
  contentVersion: 1,
  prompt: `Question ${id}`,
  choices: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' }
  ],
  correctChoiceIds: [answer],
  explanation: 'Independent fixture explanation.',
  domain: 'reasoning',
  pace: 'fast',
  tier: 'easy',
  responsePolicy: 'ordinary'
});

function apply(events: SessionEvent[], options?: { items?: SessionItem[]; budgetMs?: number; threeMisses?: boolean }) {
  return events.reduce(
    sessionReducer,
    createSessionState({
      sessionId: 'session-1',
      kind: 'practice',
      items: options?.items ?? [item('1'), item('2')],
      pace: 'fast',
      tier: 'easy',
      categories: ['reasoning'],
      startedAtMs: 0,
      budgetMs: options?.budgetMs,
      threeMisses: options?.threeMisses
    })
  );
}

describe('session state machine', () => {
  test('UX-24: ordered responses require the exact full sequence', () => {
    const ordered: SessionItem = {
      ...item('ordered'),
      choices: [{ id: 'a', label: 'A' }, { id: 'one', label: '1' }, { id: 'b', label: 'B' }],
      correctChoiceIds: ['a', 'one', 'b'],
      responseSchema: { kind: 'ordered', correctResponseLabel: 'A-1-B' }
    };
    const start = () => sessionReducer(createSessionState({
      sessionId: 'ordered-session',
      kind: 'practice',
      items: [ordered],
      pace: 'fast',
      tier: 'easy',
      categories: ['reasoning'],
      startedAtMs: 0
    }), { type: 'START', atMs: 0 });

    expect(sessionReducer(start(), { type: 'SUBMIT', atMs: 10, responseId: 'a|one|b' }).attempts[0]).toMatchObject({
      outcome: 'correct',
      correctResponseLabel: 'A-1-B'
    });
    expect(sessionReducer(start(), { type: 'SUBMIT', atMs: 10, responseId: 'a|b|one' }).attempts[0]?.outcome).toBe('incorrect');
  });
  test('S01: final answer always enters feedback before summary', () => {
    const state = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'SUBMIT', atMs: 400, responseId: 'b' }
      ],
      { items: [item('only')] }
    );
    expect(state.status).toBe('feedback');
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]?.outcome).toBe('incorrect');
    expect(state.attempts[0]?.responseId).toBe('b');
    expect(state.canContinue).toBe(false);
    const summary = sessionReducer(state, { type: 'NEXT', atMs: 900 });
    expect(summary.status).toBe('summary');
    expect(summary.attempts).toHaveLength(1);
  });

  test('S02: third miss shows its feedback and does not create a fourth item', () => {
    const state = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'SUBMIT', atMs: 10, responseId: 'b' },
        { type: 'NEXT', atMs: 20 },
        { type: 'SUBMIT', atMs: 30, responseId: 'b' },
        { type: 'NEXT', atMs: 40 },
        { type: 'SUBMIT', atMs: 50, responseId: 'b' }
      ],
      { items: [item('1'), item('2'), item('3'), item('4')], threeMisses: true }
    );
    expect(state.status).toBe('feedback');
    expect(state.missCount).toBe(3);
    expect(state.canContinue).toBe(false);
    expect(state.currentIndex).toBe(2);
    expect(sessionReducer(state, { type: 'NEXT', atMs: 60 }).status).toBe('summary');
  });

  test('T01: exact active, phase, feedback, engaged, and wall timing', () => {
    const state = apply([
      { type: 'START', atMs: 2_000, phase: 'study' },
      { type: 'SET_PHASE', atMs: 5_000, phase: 'interference' },
      { type: 'SET_PHASE', atMs: 7_000, phase: 'responding' },
      { type: 'PAUSE', atMs: 11_000 },
      { type: 'RESUME', atMs: 18_000 },
      { type: 'SUBMIT', atMs: 19_000, responseId: 'a' },
      { type: 'NEXT', atMs: 24_000 }
    ]);
    expect(state.timing).toMatchObject({
      instructionsMs: 2_000,
      activeTaskMs: 10_000,
      studyMs: 3_000,
      interferenceMs: 2_000,
      responseMs: 5_000,
      feedbackMs: 5_000,
      engagedMs: 17_000,
      wallElapsedMs: 24_000
    });
  });

  test.each([
    [999, 'correct'],
    [1_000, 'timedOut'],
    [1_001, 'timedOut']
  ] as const)('T02: response at %ims resolves as %s', (atMs, expected) => {
    const state = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'SUBMIT', atMs, responseId: 'a' }
      ],
      { items: [item('only')], budgetMs: 1_000 }
    );
    expect(state.attempts[0]?.outcome).toBe(expected);
    expect(state.attempts).toHaveLength(1);
  });

  test('T02/T07: a timely nonfinal response cannot be overwritten by a delayed expiry callback', () => {
    let state = apply([
      { type: 'START', atMs: 0 },
      { type: 'SUBMIT', atMs: 999, responseId: 'a', itemInstanceId: '1' },
      { type: 'TICK', atMs: 1_001, itemInstanceId: '1' }
    ], { items: [item('1'), item('2')], budgetMs: 1_000 });
    expect(state.status).toBe('feedback');
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]?.outcome).toBe('correct');
    state = sessionReducer(state, { type: 'NEXT', atMs: 2_000 });
    expect(state.status).toBe('active');
    state = sessionReducer(state, { type: 'TICK', atMs: 2_001, itemInstanceId: '1' });
    expect(state.attempts).toHaveLength(1);
    expect(state.currentIndex).toBe(1);
  });

  test('T03/T07: pause and feedback consume no budget; duplicate commit is ignored', () => {
    let state = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'PAUSE', atMs: 200 },
        { type: 'RESUME', atMs: 60_200 },
        { type: 'SUBMIT', atMs: 60_999, responseId: 'a' }
      ],
      { items: [item('only')], budgetMs: 1_000 }
    );
    expect(state.timing.activeTaskMs).toBe(999);
    state = sessionReducer(state, { type: 'SUBMIT', atMs: 61_000, responseId: 'a' });
    state = sessionReducer(state, { type: 'NEXT', atMs: 120_999 });
    expect(state.attempts).toHaveLength(1);
    expect(state.timing.activeTaskMs).toBe(999);
    expect(state.timing.feedbackMs).toBe(60_000);
  });

  test('T06: no-go completion is distinct from ordinary timeout', () => {
    const noGo = { ...item('no-go'), responsePolicy: 'no-go' as const };
    const correct = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'NO_GO_COMPLETE', atMs: 1_000 }
      ],
      { items: [noGo] }
    );
    expect(correct.attempts[0]?.outcome).toBe('correct');
    const ordinary = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'NO_GO_COMPLETE', atMs: 1_000 }
      ],
      { items: [item('go')] }
    );
    expect(ordinary.attempts[0]?.outcome).toBe('timedOut');

    const prematureResponse = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'SUBMIT', atMs: 500, responseId: 'a' }
      ],
      { items: [noGo], budgetMs: 1_000 }
    );
    expect(prematureResponse.attempts[0]?.outcome).toBe('incorrect');

    const expiredNoGo = apply(
      [
        { type: 'START', atMs: 0 },
        { type: 'TICK', atMs: 1_000, itemInstanceId: 'no-go' }
      ],
      { items: [noGo], budgetMs: 1_000 }
    );
    expect(expiredNoGo.attempts[0]?.outcome).toBe('correct');
  });

  test('S03: retry creates a new item and attempt identity without mutating the review snapshot', () => {
    let state = apply([
      { type: 'START', atMs: 0 },
      { type: 'SUBMIT', atMs: 10, responseId: 'b' },
      { type: 'NEXT', atMs: 20 },
      { type: 'SHOW_REVIEW', atMs: 30 }
    ], { items: [item('only')] });
    const original = JSON.parse(JSON.stringify(state.attempts[0]));
    state = sessionReducer(state, { type: 'RETRY_ITEM', atMs: 40, instanceId: 'only' });
    expect(state.status).toBe('active');
    expect(state.items[state.currentIndex]?.instanceId).toBe('only-retry-1');
    expect(state.attempts[0]).toEqual(original);
    state = sessionReducer(state, { type: 'SUBMIT', atMs: 50, responseId: 'a', itemInstanceId: 'only-retry-1' });
    expect(state.attempts.map((attempt) => attempt.instanceId)).toEqual(['only', 'only-retry-1']);
    expect(state.attempts[0]).toEqual(original);
  });

  test('S05: early end records an unanswered item as abandoned, never incorrect', () => {
    let state = apply([
      { type: 'START', atMs: 0 },
      { type: 'SUBMIT', atMs: 10, responseId: 'a' },
      { type: 'NEXT', atMs: 20 },
      { type: 'END_SESSION', atMs: 30 }
    ]);
    expect(state.status).toBe('summary');
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]?.outcome).toBe('correct');
    expect(state.abandonedInstanceIds).toEqual(['2']);
    state = sessionReducer(state, { type: 'END_SESSION', atMs: 40 });
    expect(state.abandonedInstanceIds).toEqual(['2']);
  });

  test('S06/T07: illegal, stale, and duplicate events cannot alter another item or duplicate an attempt', () => {
    let state = apply([], { items: [item('1'), item('2')] });
    state = sessionReducer(state, { type: 'SUBMIT', atMs: 1, responseId: 'a', itemInstanceId: '1' });
    expect(state.attempts).toHaveLength(0);
    state = sessionReducer(state, { type: 'START', atMs: 2, phase: 'study' });
    state = sessionReducer(state, { type: 'SUBMIT', atMs: 3, responseId: 'a', itemInstanceId: '1' });
    expect(state.attempts).toHaveLength(0);
    state = sessionReducer(state, { type: 'SET_PHASE', atMs: 4, phase: 'responding', itemInstanceId: '1' });
    state = sessionReducer(state, { type: 'SUBMIT', atMs: 5, responseId: 'a', itemInstanceId: '1' });
    state = sessionReducer(state, { type: 'SUBMIT', atMs: 6, responseId: 'a', itemInstanceId: '1' });
    expect(state.attempts).toHaveLength(1);
    state = sessionReducer(state, { type: 'NEXT', atMs: 7 });
    expect(state.currentIndex).toBe(1);
    state = sessionReducer(state, { type: 'TICK', atMs: 10_000, itemInstanceId: '1' });
    state = sessionReducer(state, { type: 'SKIP', atMs: 10_001, itemInstanceId: '1' });
    expect(state.currentIndex).toBe(1);
    expect(state.attempts).toHaveLength(1);
    state = sessionReducer(state, { type: 'SKIP', atMs: 10_002, itemInstanceId: '2' });
    expect(state.attempts[1]?.outcome).toBe('skipped');
    expect(sessionReducer(sessionReducer(state, { type: 'NEXT', atMs: 10_003 }), { type: 'NEXT', atMs: 10_004 }).attempts).toHaveLength(2);
  });

  test('T05: Slow soft target permits the current answer but does not append a new case; untimed does not expire', () => {
    let slow = createSessionState({
      sessionId: 'slow',
      kind: 'practice',
      items: [item('1'), item('2')],
      pace: 'slow',
      tier: 'hard',
      categories: ['reasoning'],
      startedAtMs: 0,
      softTargetMs: 900_000
    });
    slow = sessionReducer(slow, { type: 'START', atMs: 0 });
    slow = sessionReducer(slow, { type: 'TICK', atMs: 900_000, itemInstanceId: '1' });
    expect(slow.status).toBe('active');
    slow = sessionReducer(slow, { type: 'SUBMIT', atMs: 901_000, responseId: 'a', itemInstanceId: '1' });
    expect(slow.status).toBe('feedback');
    expect(slow.canContinue).toBe(false);
    expect(sessionReducer(slow, { type: 'NEXT', atMs: 902_000 }).status).toBe('summary');

    let untimed = apply([{ type: 'START', atMs: 0 }, { type: 'TICK', atMs: 99_000_000, itemInstanceId: '1' }]);
    expect(untimed.status).toBe('active');
    expect(untimed.attempts).toHaveLength(0);
  });

  test('Q10/E02: numeric draft and scratchpad persist in state and commit an exact immutable response', () => {
    const numeric: SessionItem = {
      ...item('numeric'),
      pace: 'slow',
      tier: 'hard',
      choices: [],
      correctChoiceIds: [],
      responseSchema: {
        kind: 'numeric',
        policy: { kind: 'exact', accepted: ['1/2'] },
        inputLabel: 'Exact fraction or decimal',
        correctResponseLabel: '1/2'
      }
    };
    let state = createSessionState({
      sessionId: 'numeric-session',
      kind: 'practice',
      items: [numeric],
      pace: 'slow',
      tier: 'hard',
      categories: ['reasoning'],
      startedAtMs: 0
    });
    state = sessionReducer(state, { type: 'START', atMs: 0 });
    state = sessionReducer(state, { type: 'SET_DRAFT_RESPONSE', atMs: 10, responseText: '2/4', itemInstanceId: 'numeric' });
    state = sessionReducer(state, { type: 'SET_NOTES', atMs: 20, notes: 'Divide both sides by two.', itemInstanceId: 'numeric' });
    expect(state.drafts.numeric).toEqual({ responseText: '2/4', notes: 'Divide both sides by two.' });
    state = sessionReducer(state, { type: 'SUBMIT', atMs: 30, responseId: state.drafts.numeric!.responseText!, itemInstanceId: 'numeric' });
    expect(state.attempts[0]).toMatchObject({
      outcome: 'correct',
      responseId: '2/4',
      notes: 'Divide both sides by two.',
      correctResponseLabel: '1/2'
    });
  });

  test('S06/T07: bounded independent transition traces preserve state invariants on every declared edge', () => {
    const traces: Array<{ name: string; items: SessionItem[]; events: SessionEvent[]; expected: string[] }> = [
      {
        name: 'answer then review',
        items: [item('only')],
        events: [
          { type: 'START', atMs: 1 },
          { type: 'SUBMIT', atMs: 2, responseId: 'a', itemInstanceId: 'only' },
          { type: 'NEXT', atMs: 3 },
          { type: 'SHOW_REVIEW', atMs: 4 },
          { type: 'BACK_TO_SUMMARY', atMs: 5 }
        ],
        expected: ['active', 'feedback', 'summary', 'review', 'summary']
      },
      {
        name: 'pause resume and end',
        items: [item('only')],
        events: [
          { type: 'START', atMs: 1 },
          { type: 'PAUSE', atMs: 2 },
          { type: 'RESUME', atMs: 3 },
          { type: 'PAUSE', atMs: 4 },
          { type: 'END_SESSION', atMs: 5 }
        ],
        expected: ['active', 'paused', 'active', 'paused', 'summary']
      },
      {
        name: 'feedback to another item',
        items: [item('1'), item('2')],
        events: [
          { type: 'START', atMs: 1 },
          { type: 'SUBMIT', atMs: 2, responseId: 'a', itemInstanceId: '1' },
          { type: 'NEXT', atMs: 3 }
        ],
        expected: ['active', 'feedback', 'active']
      }
    ];
    for (const trace of traces) {
      let state = createSessionState({
        sessionId: trace.name,
        kind: 'practice',
        items: trace.items,
        pace: 'fast',
        tier: 'easy',
        categories: ['reasoning'],
        startedAtMs: 0
      });
      trace.events.forEach((event, index) => {
        state = sessionReducer(state, event);
        expect(state.status).toBe(trace.expected[index]);
        expect(Object.values(state.timing).every((value) => value >= 0)).toBe(true);
        expect(new Set(state.attempts.map((attempt) => attempt.instanceId)).size).toBe(state.attempts.length);
        expect(state.currentIndex).toBeGreaterThanOrEqual(0);
        expect(state.currentIndex).toBeLessThan(state.items.length);
        if (state.status === 'summary') expect(['summary']).toContain(state.status);
      });
    }
  });
});
