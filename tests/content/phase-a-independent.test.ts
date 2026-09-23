import {
  buildSessionItems,
  familyDispositions,
  publicationEligibilityProblems,
  publicationProblems,
  stableChoiceId
} from '../../src/content/catalog';
import { trainingGeneratorEntries } from '../../src/logic/puzzleGenerators';
import { createSessionState, sessionReducer } from '../../src/session/sessionMachine';
import type { CognitiveDomain, PuzzleRound } from '../../src/types';

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generated(domain: CognitiveDomain, typeId: string, seed = 1, difficulty = 10) {
  const entry = trainingGeneratorEntries[domain].find((candidate) => candidate.typeId === typeId);
  if (!entry) throw new Error(`Missing production generator ${domain}/${typeId}`);
  const original = Math.random;
  Math.random = seeded(seed);
  try {
    return entry.generator(difficulty, false);
  } finally {
    Math.random = original;
  }
}

function keyed(round: PuzzleRound) {
  return round.choices[round.correctIndex];
}

function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((tail) => [value, ...tail])
  );
}

describe('independent content oracles for the released Phase A scope', () => {
  test('Q01: implication key follows from the complete truth table, while not-A does not imply not-B generally', () => {
    const satisfying: Array<[boolean, boolean, boolean]> = [];
    for (const a of [false, true]) for (const b of [false, true]) for (const c of [false, true]) {
      const aImpliesB = !a || b;
      const bImpliesC = !b || c;
      if (aImpliesB && bImpliesC && !c) satisfying.push([a, b, c]);
    }
    expect(satisfying).toEqual([[false, false, false]]);
    expect((!false || true) && (!true || true)).toBe(true);
    const round = generated('reasoning', 'implication-chain');
    expect(keyed(round)).toBe('A and B are both false');
    expect(round.explanation).toMatch(/If B were true.*C.*contradict/i);
    expect(round.explanation).toMatch(/If A were true.*B/i);
  });

  test('Q02: all stated Trail constraints leave one of 24 permutations', () => {
    const tiles = ['A', 'B', '1', '2'];
    const valid = permutations(tiles).filter((path) =>
      path[0] === 'A' &&
      path.every((tile, index) => index === 0 || /[A-Z]/.test(tile) !== /[A-Z]/.test(path[index - 1]!)) &&
      path.filter((tile) => /[A-Z]/.test(tile)).join('') === 'AB' &&
      path.filter((tile) => /\d/.test(tile)).join('') === '12'
    );
    expect(valid).toEqual([['A', '1', 'B', '2']]);
    expect(valid).not.toContainEqual(['A', '2', 'B', '1']);
    const round = generated('flexibility', 'trail-blaze', 4, 1);
    expect(keyed(round)).toBe('A-1-B-2');
  });

  test('Q05: Equation System keys agree with an independent exact solve over fixed seeds', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const round = generated('quantitative', 'equation-system', seed, 10);
      const lines = round.visual?.lines ?? [];
      const sum = Number(lines[0]?.match(/=\s*(-?\d+)/)?.[1]);
      const difference = Number(lines[1]?.match(/=\s*(-?\d+)/)?.[1]);
      const independentlySolvedX = (sum + difference) / 2;
      expect(Number(keyed(round))).toBe(independentlySolvedX);
      expect(round.choices).toHaveLength(4);
      expect(new Set(round.choices).size).toBe(4);
    }
  });

  test('Q06: the controlling parallel branch is Test and total duration is 8 days in the revised graph', () => {
    const design = 2;
    const build = 3;
    const test = 5;
    const deploy = 1;
    expect(design + Math.max(build, test) + deploy).toBe(8);
    expect(design + Math.max(build, test - 1) + deploy).toBe(7);
    expect(design + Math.max(build - 1, test) + deploy).toBe(8);
    const round = generated('planning', 'bottleneck-plan');
    expect(keyed(round)).toBe('Test');
    expect(round.prompt).toMatch(/parallel branch/i);
  });

  test('Q07: explicit one-to-one day/lab rules force only Nia in Lab 2 on Tuesday', () => {
    const people = ['Nia', 'Omar', 'Pia', 'Ravi'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const labs = ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4'];
    const models: Array<Record<string, { day: string; lab: string }>> = [];
    for (const dayOrder of permutations(days)) for (const labOrder of permutations(labs)) {
      const model = Object.fromEntries(people.map((person, index) => [person, { day: dayOrder[index]!, lab: labOrder[index]! }]));
      const lab2 = people.find((person) => model[person]!.lab === 'Lab 2')!;
      const omarDay = days.indexOf(model.Omar!.day);
      if (
        model.Nia!.lab !== 'Lab 1' &&
        model.Nia!.lab !== 'Lab 4' &&
        model.Pia!.day === 'Wednesday' &&
        model.Pia!.lab !== 'Lab 2' &&
        model.Ravi!.day === 'Thursday' &&
        model.Omar!.lab === 'Lab 1' &&
        days.indexOf(model[lab2]!.day) === omarDay + 1
      ) models.push(model);
    }
    expect(models.length).toBeGreaterThan(0);
    expect(new Set(models.map((model) => `${model.Nia!.lab}|${model.Nia!.day}`))).toEqual(new Set(['Lab 2|Tuesday']));
    expect(keyed(generated('planning', 'long-case-deduction'))).toBe('Nia in Lab 2 on Tuesday');

    const withoutDifferentDayRule = [
      { Nia: 'Tuesday', Omar: 'Monday', Pia: 'Wednesday', Ravi: 'Thursday' },
      { Nia: 'Wednesday', Omar: 'Tuesday', Pia: 'Wednesday', Ravi: 'Thursday' }
    ];
    expect(new Set(withoutDifferentDayRule.map((model) => model.Nia)).size).toBe(2);
  });

  test('Q08: Rule Cascade key is derived only from the three visible rules at both boundary lengths and parities', () => {
    const covered = new Set<string>();
    for (let seed = 1; seed <= 500; seed += 1) {
      const round = generated('flexibility', 'rule-cascade', seed, 10);
      const note = round.visual?.note ?? '';
      const match = note.match(/^(\d+)\s+(\w+)\s+(\w+)$/);
      expect(match).toBeTruthy();
      const number = Number(match![1]);
      const color = match![2]!;
      const shape = match![3]!;
      const first = number % 2 === 0 ? 'color' : 'shape';
      const final = color.length > 4 ? 'number' : first;
      const expected = final === 'color' ? color : final === 'shape' ? shape : number % 2 === 0 ? 'even' : 'odd';
      expect(keyed(round)).toBe(expected);
      expect((round.visual?.lines ?? []).join(' ')).toMatch(/label it even or odd/i);
      covered.add(`${color.length > 4 ? 'switch' : 'stay'}|${number % 2 ? 'odd' : 'even'}`);
    }
    expect(covered).toEqual(new Set(['stay|odd', 'stay|even', 'switch|odd', 'switch|even']));
  });

  test('Q09: Operation Span recomputes truth and ordered recall, including edge cases, across fixed seeds', () => {
    const cases = new Set<string>();
    for (let seed = 1; seed <= 3000; seed += 1) {
      const round = generated('workingMemory', 'operation-span', seed, 18);
      const tokens = round.studyVisual?.tokens ?? [];
      const validLetters = tokens.flatMap((token) => {
        const [letter, equation] = token.label.split('\n');
        const match = equation?.match(/^(\d+)\+(\d+)=(\d+)$/);
        if (!letter || !match) throw new Error('Malformed operation-span row');
        return Number(match[1]) + Number(match[2]) === Number(match[3]) ? [letter] : [];
      });
      const expected = validLetters.length ? validLetters.join('-') : 'none';
      expect(keyed(round)).toBe(expected);
      expect(round.choices).toHaveLength(4);
      expect(new Set(round.choices).size).toBe(4);
      if (validLetters.length === tokens.length) cases.add('all-true');
      if (validLetters.length === 0) cases.add('all-false');
      if (new Set(tokens.map((token) => token.label[0])).size < tokens.length) cases.add('repeated-symbol');
      if (validLetters.length >= 3 && validLetters.join('') === [...validLetters].reverse().join('')) cases.add('palindrome');
      if (round.choices.filter((choice) => choice === expected).length !== 1) cases.add('duplicate-answer');
    }
    expect(cases).toEqual(new Set(['all-true', 'all-false', 'repeated-symbol', 'palindrome']));
  });

  test('Q09: Delayed Recall key exactly preserves the displayed study sequence through interference', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const round = generated('workingMemory', 'delayed-recall', seed, 10);
      const expected = (round.studyVisual?.tokens ?? []).map((token) => token.label).join('');
      expect(keyed(round)).toBe(expected);
      expect(round.interferencePrompt).toMatch(/interference/i);
      expect(round.interferenceVisual).toBeTruthy();
      expect(round.choices).toHaveLength(4);
      expect(new Set(round.choices).size).toBe(4);
    }
  });

  test('Q11: semantic choice IDs survive reorder and equivalent numeric choices fail publication', () => {
    const item = buildSessionItems({ pace: 'fast', tier: 'medium', categories: ['quantitative'] }, 1, 12)[0]!;
    const correctId = item.correctChoiceIds[0]!;
    const reordered = { ...item, choices: [...item.choices].reverse() };
    expect(reordered.choices.find((choice) => choice.id === correctId)?.label).toBe(
      item.choices.find((choice) => choice.id === correctId)?.label
    );
    const state = sessionReducer(
      sessionReducer(createSessionState({
        sessionId: 'choice-id',
        kind: 'practice',
        items: [reordered],
        pace: item.pace,
        tier: item.tier,
        categories: [item.domain],
        startedAtMs: 0
      }), { type: 'START', atMs: 0 }),
      { type: 'SUBMIT', atMs: 10, responseId: correctId }
    );
    expect(state.attempts[0]?.outcome).toBe('correct');
    expect(stableChoiceId('Same answer')).toBe(stableChoiceId(' same   answer '));
    expect(publicationProblems({
      ...item.round!,
      choices: ['0.5', '1/2', '1', '2'],
      correctIndex: 0
    })).toContain('answer-equivalent choices');
  });

  test('Q12: publication fails closed for every mandatory gate and quarantine never becomes eligible', () => {
    const approved = familyDispositions.find((family) => family.typeId === 'equation-system')!;
    const round = generated('quantitative', 'equation-system');
    expect(publicationEligibilityProblems(round, approved)).toEqual([]);
    const variants = [
      { ...approved, approved: false as const },
      { ...approved, qaStatus: 'quarantined' as const },
      { ...approved, verificationMethod: undefined },
      { ...approved, reasoningOutline: undefined },
      { ...approved, rightsStatus: 'missing' as const, rightsEvidence: undefined },
      { ...approved, effortRangeMinutes: undefined }
    ];
    for (const variant of variants) expect(publicationEligibilityProblems(round, variant).length).toBeGreaterThan(0);
    expect(buildSessionItems({
      pace: 'fast',
      tier: 'hard',
      categories: ['language'],
      familyIds: ['critical-assumption']
    }, 3, 2)).toEqual([]);
  });
});
