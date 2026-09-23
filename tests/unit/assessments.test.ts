import { assessmentResultsForSession, type AssessmentResult } from '../../src/analytics/assessments';
import { buildCheckItems } from '../../src/content/checkForms';
import { createSessionState, sessionReducer } from '../../src/session/sessionMachine';

function completedCheck(sessionId: string, domains: ('reasoning' | 'planning')[]) {
  const items = buildCheckItems(domains, 1);
  let state = createSessionState({
    sessionId,
    kind: 'check',
    items,
    pace: 'fast',
    tier: 'medium',
    categories: domains,
    startedAtMs: 0
  });
  state = sessionReducer(state, { type: 'START', atMs: 0 });
  for (const item of items) {
    const correct = item.correctChoiceIds[0]!;
    state = sessionReducer(state, { type: 'SUBMIT', atMs: state.lastEventAtMs + 100, responseId: correct, itemInstanceId: item.instanceId });
    state = sessionReducer(state, { type: 'NEXT', atMs: state.lastEventAtMs + 10 });
  }
  return state;
}

describe('progress-check baselines', () => {
  test('A06: first compatible completed check establishes baseline only for covered domains', () => {
    const state = completedCheck('first', ['reasoning', 'planning']);
    const results = assessmentResultsForSession(state, []);
    expect(results.map((result) => result.domain)).toEqual(['reasoning', 'planning']);
    expect(results.every((result) => result.isBaseline && result.complete)).toBe(true);
    expect(results.every((result) => result.eligibleTrialCount === 2)).toBe(true);
    expect(results.some((result) => result.domain === 'quantitative')).toBe(false);
  });

  test('A06: later compatible result links to baseline while incompatible tier/form and practice do not merge', () => {
    const first = assessmentResultsForSession(completedCheck('first', ['reasoning']), []);
    const later = assessmentResultsForSession(completedCheck('later', ['reasoning']), first);
    expect(later[0]).toMatchObject({ isBaseline: false, baselineResultId: first[0]?.resultId });
    const incompatible: AssessmentResult[] = [{ ...first[0]!, resultId: 'hard', tier: 'hard' }];
    expect(assessmentResultsForSession(completedCheck('fresh', ['reasoning']), incompatible)[0]?.isBaseline).toBe(true);

    const practice = { ...completedCheck('practice', ['reasoning']), kind: 'practice' as const };
    expect(assessmentResultsForSession(practice, first)).toEqual([]);
  });

  test('A06: interrupted check cannot establish a timed baseline', () => {
    const items = buildCheckItems(['attention', 'reasoning'], 2);
    let state = createSessionState({
      sessionId: 'interrupted',
      kind: 'check',
      items,
      pace: 'fast',
      tier: 'medium',
      categories: ['attention', 'reasoning'],
      startedAtMs: 0
    });
    state = sessionReducer(state, { type: 'START', atMs: 0 });
    state = sessionReducer(state, { type: 'INTERRUPT', atMs: 50, itemInstanceId: items[0]!.instanceId });
    state = sessionReducer(state, { type: 'NEXT', atMs: 60 });
    expect(state.status).toBe('summary');
    const results = assessmentResultsForSession(state, []);
    expect(results.find((result) => result.domain === 'attention')).toMatchObject({
      interrupted: true,
      complete: false,
      isBaseline: false
    });
  });
});
