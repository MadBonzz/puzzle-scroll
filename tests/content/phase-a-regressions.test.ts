import { allTrainingPuzzleTypeIds, generateDailySession, trainingGeneratorEntries } from '../../src/logic/puzzleGenerators';
import { normalizeFeedSettings } from '../../src/store/useAppStore';
import type { PuzzleRound } from '../../src/types';

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

function generator(domain: keyof typeof trainingGeneratorEntries, typeId: string) {
  const entry = trainingGeneratorEntries[domain].find((candidate) => candidate.typeId === typeId);
  if (!entry) throw new Error(`Missing production generator ${domain}/${typeId}`);
  return entry.generator;
}

function answer(round: PuzzleRound) {
  return round.choices[round.correctIndex];
}

describe('Phase A production-connected regressions', () => {
  test('F03: one explicit exclusion survives normalization', () => {
    const explicit = allTrainingPuzzleTypeIds.filter((typeId) => typeId !== 'speed-match');
    const normalized = normalizeFeedSettings({ enabledPuzzleTypes: explicit });
    expect(normalized.enabledPuzzleTypes).toHaveLength(explicit.length);
    expect(normalized.enabledPuzzleTypes).not.toContain('speed-match');
  });

  test('F01/F03: an empty domain/type intersection fails closed', () => {
    const levels = Object.fromEntries(Object.keys(trainingGeneratorEntries).map((domain) => [domain, 5])) as never;
    const result = generateDailySession(levels, 5, {
      enabledDomains: ['language'],
      enabledPuzzleTypes: ['speed-match']
    });
    expect(result).toEqual([]);
  });

  test('Q02: Trail states every rule needed for its unique key', () => {
    const round = generator('flexibility', 'trail-blaze')(1, false);
    const stated = `${round.prompt} ${round.studyPrompt ?? ''} ${round.visual?.note ?? ''} ${(round.visual?.lines ?? []).join(' ')}`.toLowerCase();
    expect(stated).toContain('start');
    expect(stated).toContain('alternate');
    expect(round.prompt).toMatch(/letters in alphabetical order/i);
    expect(round.prompt).toMatch(/numbers in increasing order/i);
    expect(answer(round)).toBe('A-1-B-2');
  });

  test('Q03: Dual Track key describes both observed features across seeded rounds', () => {
    const create = generator('workingMemory', 'dual-track');
    const originalRandom = Math.random;
    const failures: string[] = [];
    try {
      for (let seed = 1; seed <= 1000; seed += 1) {
        Math.random = seeded(seed);
        const round = create(seed % 2 ? 5 : 15, false);
        const tokens = round.studyVisual?.tokens ?? [];
        const distance = round.difficulty > 10 ? 2 : 1;
        const current = tokens.at(-1);
        const previous = tokens.at(-1 - distance);
        if (!current || !previous) throw new Error('Dual Track stimulus is missing');
        const positionMatch = current.label === previous.label;
        const colorMatch = current.color === previous.color;
        const expected = positionMatch && colorMatch ? 'Both match' : positionMatch ? 'Position match' : colorMatch ? 'Color match' : 'No match';
        if (answer(round) !== expected) failures.push(`${seed}: expected ${expected}, received ${answer(round)}`);
      }
    } finally {
      Math.random = originalRandom;
    }
    expect(failures).toEqual([]);
  });

  test('Q04: Peripheral Catch always renders exactly one visible target and exact location', () => {
    const create = generator('processingSpeed', 'peripheral-catch');
    const originalRandom = Math.random;
    try {
      for (let seed = 1; seed <= 300; seed += 1) {
        Math.random = seeded(seed);
        const round = create(8, false);
        const tokens = round.studyVisual?.tokens ?? [];
        expect(tokens.filter((item) => item.label === 'target')).toHaveLength(1);
        expect(answer(round)).toMatch(/Top left|Top center|Top right|Middle left|Middle right|Bottom left|Bottom center|Bottom right/);
      }
    } finally {
      Math.random = originalRandom;
    }
  });

  test('Q05: Equation System exposes four distinct answer-inequivalent choices', () => {
    const create = generator('quantitative', 'equation-system');
    const originalRandom = Math.random;
    try {
      for (let seed = 1; seed <= 200; seed += 1) {
        Math.random = seeded(seed);
        const round = create(10, false);
        expect(new Set(round.choices).size).toBe(4);
        expect(round.choices).toHaveLength(4);
      }
    } finally {
      Math.random = originalRandom;
    }
  });

  test('Q06: Bottleneck question uniquely asks for the controlling parallel branch', () => {
    const round = generator('planning', 'bottleneck-plan')(12, false);
    expect(round.prompt.toLowerCase()).toMatch(/parallel branch|controls.*deploy|delays.*deploy/);
    expect(answer(round)).toBe('Test');
  });
});
