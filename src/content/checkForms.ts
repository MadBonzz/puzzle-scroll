import type { CognitiveDomain, PuzzleRound } from '../types';
import type { SessionItem } from '../session/sessionMachine';
import { stableChoiceId } from './catalog';

interface CheckFixture {
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
  round?: Partial<PuzzleRound>;
}

const fixtures: Record<CognitiveDomain, readonly CheckFixture[]> = {
  processingSpeed: [
    { prompt: 'Are these codes identical: K7M2 and K7M2?', choices: ['Same', 'Different'], answer: 'Same', explanation: 'Every character and position matches.' },
    { prompt: 'Are these codes identical: 8QPF and 8QFP?', choices: ['Same', 'Different'], answer: 'Different', explanation: 'The final two letters exchange positions.' }
  ],
  workingMemory: [
    {
      prompt: 'Choose the exact sequence shown.',
      choices: ['4-1-7', '7-1-4', '4-7-1', '1-4-7'],
      answer: '4-1-7',
      explanation: 'The displayed order was 4, then 1, then 7.',
      round: {
        requiresReady: true,
        studyPrompt: 'Memorize these numbers from left to right.',
        studyVisual: { mode: 'tiles', tokens: [{ label: '4' }, { label: '1' }, { label: '7' }], columns: 3 },
        studyDurationMs: 2_000
      }
    },
    {
      prompt: 'Choose the reverse of the sequence shown.',
      choices: ['2-8-5', '5-8-2', '8-2-5', '5-2-8'],
      answer: '5-8-2',
      explanation: 'The shown order 2-8-5 reversed is 5-8-2.',
      round: {
        requiresReady: true,
        studyPrompt: 'Memorize 2-8-5; you will answer in reverse.',
        studyVisual: { mode: 'tiles', tokens: [{ label: '2' }, { label: '8' }, { label: '5' }], columns: 3 },
        studyDurationMs: 2_000
      }
    }
  ],
  attention: [
    { prompt: 'Count only exact A7 pairs: A7, A1, B7, A7, 7A.', choices: ['1', '2', '3', '4'], answer: '2', explanation: 'Only the first and fourth pairs are exactly A7.' },
    { prompt: 'Count the word BLUE only when followed by a star: BLUE ★, BLUE ●, RED ★, BLUE ★.', choices: ['1', '2', '3', '4'], answer: '2', explanation: 'The first and fourth entries match both features.' }
  ],
  flexibility: [
    { prompt: 'Active rule: choose the shape, not the color. The item is a red triangle.', choices: ['red', 'triangle', 'color', 'circle'], answer: 'triangle', explanation: 'The active rule requests the shape.' },
    { prompt: 'Rule 1 says add 2. The rule switches before the last step to subtract 1. Start at 5 and take two steps.', choices: ['6', '7', '8', '9'], answer: '6', explanation: 'Apply +2 once (5→7), then −1 (7→6).' }
  ],
  reasoning: [
    { prompt: 'All rules hold: If P then Q. If Q then R. R is false. What must follow?', choices: ['P and Q are false', 'P is true', 'Q is true', 'Nothing follows'], answer: 'P and Q are false', explanation: 'False R makes Q false by contrapositive; false Q then makes P false.' },
    { prompt: 'Exactly one of Ada or Ben is selected. Ada is not selected. Who is selected?', choices: ['Ada', 'Ben', 'Both', 'Neither'], answer: 'Ben', explanation: 'Exactly one must be selected, and Ada is excluded.' }
  ],
  language: [
    { prompt: 'Thermometer is to temperature as compass is to…', choices: ['direction', 'volume', 'pressure', 'weight'], answer: 'direction', explanation: 'Each instrument measures or indicates the named property.' },
    { prompt: 'Which word best completes: The evidence was ___, so the conclusion remained uncertain.', choices: ['inconclusive', 'decisive', 'complete', 'unanimous'], answer: 'inconclusive', explanation: 'Inconclusive evidence explains why uncertainty remains.' }
  ],
  planning: [
    { prompt: 'Design takes 2 days, then Build (3) and Test (5) run in parallel. Deploy waits for both. Which branch controls Deploy?', choices: ['Design', 'Build', 'Test', 'Neither'], answer: 'Test', explanation: 'Test is the longer parallel branch.' },
    { prompt: 'Tasks A before C, B before C, and C before D. Which schedule is valid?', choices: ['A, B, C, D', 'C, A, B, D', 'A, C, B, D', 'D, A, B, C'], answer: 'A, B, C, D', explanation: 'Both prerequisites precede C, which precedes D.' }
  ],
  quantitative: [
    { prompt: 'X + Y = 10 and X − Y = 2. What is X?', choices: ['4', '5', '6', '8'], answer: '6', explanation: 'Adding gives 2X=12, so X=6.' },
    { prompt: 'A:B = 2:3 and A+B=25. What is B?', choices: ['10', '12', '15', '18'], answer: '15', explanation: 'Five parts total means 5 per part; B is three parts, or 15.' }
  ]
};

export function buildCheckItems(categories: CognitiveDomain[], seed: number) {
  const selected = [...new Set(categories)].slice(0, 3);
  return selected.flatMap((domain, domainIndex) =>
    fixtures[domain].map((fixture, fixtureIndex): SessionItem => {
      const choices = fixture.choices.map((label) => ({ id: stableChoiceId(label), label }));
      const instanceId = `check-v1-${domain}-${seed}-${domainIndex}-${fixtureIndex}`;
      const round = fixture.round ? {
        id: instanceId,
        domain,
        typeId: `check-${domain}`,
        typeName: 'Progress check',
        subtitle: 'Independent check form',
        difficulty: 10,
        isAssessment: true,
        prompt: fixture.prompt,
        choices: fixture.choices,
        correctIndex: fixture.choices.indexOf(fixture.answer),
        explanation: fixture.explanation,
        ...fixture.round
      } as PuzzleRound : undefined;
      return {
        instanceId,
        contentId: `check-v1-${domain}-${fixtureIndex + 1}`,
        contentVersion: 1,
        prompt: fixture.prompt,
        choices,
        correctChoiceIds: [stableChoiceId(fixture.answer)],
        explanation: fixture.explanation,
        domain,
        pace: 'fast',
        tier: 'medium',
        responsePolicy: 'ordinary',
        initialPhase: round?.requiresReady ? 'ready' : 'responding',
        round,
        protocolId: 'quick-check-v1',
        formFamily: `quick-check-${domain}`,
        sourceId: 'puzzlescroll-original-check-v1',
        effortRangeMinutes: [0.1, 0.5]
      };
    })
  );
}

export const checkFormCoverage = Object.freeze(
  Object.fromEntries(Object.entries(fixtures).map(([domain, entries]) => [domain, entries.length]))
);
