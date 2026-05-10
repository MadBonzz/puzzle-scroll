import { domainIds } from '../data/domains';
import { publicDomainSources } from '../data/sourcePuzzles';
import type { CognitiveDomain, PuzzleRound, VisualToken } from '../types';

type Generator = (difficulty: number, isAssessment?: boolean) => PuzzleRound;
export type GeneratorEntry = {
  typeId: string;
  typeName: string;
  generator: Generator;
  complexity: 'Core' | 'Hard';
};

const colors = [
  { name: 'red', value: '#D94A38' },
  { name: 'blue', value: '#3178C6' },
  { name: 'green', value: '#2F8B57' },
  { name: 'yellow', value: '#D2A51F' },
  { name: 'purple', value: '#7D5BBE' },
  { name: 'black', value: '#20242A' }
];

const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hex'];
const animals = ['otter', 'falcon', 'panda', 'tiger', 'koala', 'lemur', 'zebra', 'eagle'];
const foods = ['olive', 'mango', 'pasta', 'lentil', 'waffle', 'pepper', 'melon', 'bagel'];
const objects = ['lamp', 'anchor', 'button', 'ladder', 'magnet', 'wallet', 'pencil', 'window'];
const clueBank = [
  { clue: 'Opposite of ancient', answer: 'modern', distractors: ['silent', 'narrow', 'wooden'] },
  { clue: 'A word for a quick look', answer: 'glance', distractors: ['thread', 'bottle', 'planet'] },
  { clue: 'To make something clearer', answer: 'explain', distractors: ['contain', 'divide', 'arrive'] },
  { clue: 'A small stream', answer: 'brook', distractors: ['brick', 'broom', 'blush'] },
  { clue: 'Able to bend without breaking', answer: 'flexible', distractors: ['fragile', 'formal', 'famous'] },
  { clue: 'A careful estimate', answer: 'approximation', distractors: ['celebration', 'conversation', 'destination'] }
];

const people = ['Ari', 'Bea', 'Cy', 'Dev'];

let counter = 0;

function id(typeId: string) {
  counter += 1;
  return `${typeId}-${Date.now()}-${counter}`;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!;
}

function sample<T>(items: readonly T[], count: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  while (copy.length && out.length < count) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]!);
  }
  return out;
}

function shuffle<T>(items: readonly T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function withAnswer(options: string[], answer: string) {
  const choices = shuffle(Array.from(new Set([answer, ...options]))).slice(0, 4);
  if (!choices.includes(answer)) choices[Math.floor(Math.random() * choices.length)] = answer;
  return { choices, correctIndex: choices.indexOf(answer) };
}

function token(label: string, color?: string): VisualToken {
  return { label, color, tone: color ? 'solid' : 'outline' };
}

function arithmeticProgression(level: number) {
  const start = 1 + Math.floor(Math.random() * 6);
  const step = 1 + Math.floor(level / 4) + Math.floor(Math.random() * 3);
  const length = 4 + Math.min(2, Math.floor(level / 7));
  const sequence = Array.from({ length }, (_, index) => start + index * step);
  return { sequence, answer: start + length * step, rule: `add ${step}` };
}

function hiddenTokens(count: number, color = '#CDD3DA') {
  return Array.from({ length: count }, (_, index) => token(String(index + 1), color));
}

function hiddenSequence(count: number, color = '#CDD3DA') {
  return Array.from({ length: count }, (_, index) => token(`#${index + 1}`, color));
}

function studyMs(difficulty: number, base = 2600) {
  return Math.max(900, base - difficulty * 70);
}

function sequenceDistractors(answer: string, values: string[]) {
  return [
    shuffle(values).join('-'),
    values.slice().reverse().join('-'),
    values.map((value) => String(((Number(value) + 1) % 9) + 1)).join('-')
  ];
}

function speedMatch(difficulty: number, isAssessment = false): PuzzleRound {
  const left = sample(shapes, 3).map((shape) => token(shape, pick(colors).value));
  const shouldMatch = Math.random() > 0.45;
  const right = shouldMatch ? left.map((item) => ({ ...item })) : left.map((item, index) => (index === 1 ? token(pick(shapes), pick(colors).value) : { ...item }));
  const { choices, correctIndex } = withAnswer(['Different'], shouldMatch ? 'Same' : 'Different');
  return {
    id: id(isAssessment ? 'feature-match' : 'speed-match'),
    domain: 'processingSpeed',
    typeId: isAssessment ? 'feature-match' : 'speed-match',
    typeName: isAssessment ? 'Feature Match' : 'Speed Match',
    subtitle: isAssessment ? 'Assessment: compare untrained objects' : 'Rapid same/different judgment',
    difficulty,
    isAssessment,
    prompt: 'Are the two visual sets identical?',
    visual: { mode: 'comparison', left: hiddenTokens(left.length), right: hiddenTokens(right.length), note: 'Stimulus hidden' },
    requiresReady: true,
    studyPrompt: 'Compare both sides quickly. They will disappear.',
    studyVisual: { mode: 'comparison', left, right, note: difficulty > 10 ? 'Brief exposure target' : undefined },
    studyDurationMs: studyMs(difficulty, isAssessment ? 2200 : 1800),
    choices,
    correctIndex,
    explanation: shouldMatch ? 'Every feature matches.' : 'At least one shape or color changed.'
  };
}

function peripheralCatch(difficulty: number): PuzzleRound {
  const center = pick(shapes);
  const targetIndex = Math.floor(Math.random() * 9);
  const targetColor = pick(colors);
  const tokens = Array.from({ length: 9 }, (_, index) => (index === targetIndex ? token('target', targetColor.value) : token('.', '#D6D9DD')));
  const zone = targetIndex < 3 ? (targetIndex === 0 ? 'Top left' : targetIndex === 2 ? 'Top right' : 'Center') : targetIndex > 5 ? (targetIndex === 6 ? 'Bottom left' : targetIndex === 8 ? 'Bottom right' : 'Center') : 'Center';
  const answer = `${center} / ${zone}`;
  const { choices, correctIndex } = withAnswer(
    [`${pick(shapes)} / ${zone}`, `${center} / ${pick(['Top left', 'Top right', 'Bottom left', 'Bottom right'])}`, `${pick(shapes)} / Center`],
    answer
  );
  return {
    id: id('peripheral-catch'),
    domain: 'processingSpeed',
    typeId: 'peripheral-catch',
    typeName: 'Peripheral Catch',
    subtitle: 'Central identity plus peripheral localization',
    difficulty,
    isAssessment: false,
    prompt: 'What center shape and target location were shown?',
    visual: { mode: 'grid', tokens: hiddenTokens(9), columns: 3 },
    requiresReady: true,
    studyPrompt: 'Identify the center shape and peripheral target location.',
    studyVisual: { mode: 'grid', tokens: tokens.map((item, index) => (index === 4 ? token(center, '#20242A') : item)), columns: 3 },
    studyDurationMs: studyMs(difficulty, 2200),
    choices,
    correctIndex,
    explanation: `The center was ${center}; the target appeared in the ${zone.toLowerCase()} zone.`
  };
}

function patternFlash(difficulty: number): PuzzleRound {
  const base = sample(shapes, 4 + Math.min(2, Math.floor(difficulty / 8))).map((shape) => `${shape}-${pick(colors).name}`);
  const answer = base.join(', ');
  const distractors = [shuffle(base).join(', '), base.slice().reverse().join(', '), sample(shapes, base.length).join(', ')];
  const { choices, correctIndex } = withAnswer(distractors, answer);
  return {
    id: id('pattern-flash'),
    domain: 'processingSpeed',
    typeId: 'pattern-flash',
    typeName: 'Pattern Flash',
    subtitle: 'Fast pattern encoding',
    difficulty,
    isAssessment: false,
    prompt: 'Pick the exact flashed pattern.',
    visual: { mode: 'tiles', tokens: hiddenTokens(base.length), columns: 3 },
    requiresReady: true,
    studyPrompt: 'Memorize the order, shape, and color of the flashed pattern.',
    studyVisual: { mode: 'tiles', tokens: base.map((part) => token(part.split('-')[0]!, colors.find((color) => color.name === part.split('-')[1])?.value)), columns: 3 },
    studyDurationMs: studyMs(difficulty, 2400),
    choices,
    correctIndex,
    explanation: 'The correct option preserves both order and features.'
  };
}

function symbolScan(difficulty: number): PuzzleRound {
  const targetShape = pick(shapes);
  const targetColor = pick(colors);
  const count = 10 + Math.floor(difficulty / 2);
  const tokens = Array.from({ length: count }, () => token(pick(shapes), pick(colors).value));
  const guaranteed = Math.max(2, Math.floor(difficulty / 6) + 1);
  for (let index = 0; index < guaranteed && index < tokens.length; index += 1) {
    tokens[index] = token(targetShape, targetColor.value);
  }
  const shuffledTokens = shuffle(tokens);
  const answer = String(shuffledTokens.filter((item) => item.label === targetShape && item.color === targetColor.value).length);
  const { choices, correctIndex } = withAnswer([String(Number(answer) - 1), String(Number(answer) + 1), String(Number(answer) + 2)], answer);
  return {
    id: id('symbol-scan'),
    domain: 'processingSpeed',
    typeId: 'symbol-scan',
    typeName: 'Symbol Scan',
    subtitle: 'Two-feature visual search',
    difficulty,
    isAssessment: false,
    prompt: `How many items are ${targetColor.name} ${targetShape}s?`,
    visual: { mode: 'grid', tokens: hiddenTokens(shuffledTokens.length), columns: 4 },
    requiresReady: true,
    studyPrompt: `Count ${targetColor.name} ${targetShape}s. The grid will disappear.`,
    studyVisual: { mode: 'grid', tokens: shuffledTokens, columns: 4 },
    studyDurationMs: studyMs(difficulty, 2600),
    choices,
    correctIndex,
    explanation: `Only items matching both features count: ${targetColor.name} and ${targetShape}.`
  };
}

function colorRush(difficulty: number): PuzzleRound {
  const target = pick(colors);
  const stream = Array.from({ length: 8 + Math.floor(difficulty / 3) }, () => pick(colors));
  stream[Math.floor(Math.random() * stream.length)] = target;
  const count = stream.filter((color) => color.name === target.name).length;
  const { choices, correctIndex } = withAnswer([String(count - 1), String(count + 1), String(count + 2)], String(count));
  return {
    id: id('color-rush'),
    domain: 'processingSpeed',
    typeId: 'color-rush',
    typeName: 'Color Rush',
    subtitle: 'Selective taps under speed pressure',
    difficulty,
    isAssessment: false,
    prompt: `How many ${target.name} dots are in the stream?`,
    visual: { mode: 'tiles', tokens: hiddenTokens(stream.length), columns: 6 },
    requiresReady: true,
    studyPrompt: `Count only ${target.name} dots. The stream will disappear.`,
    studyVisual: { mode: 'tiles', tokens: stream.map((color) => token('', color.value)), columns: 6 },
    studyDurationMs: studyMs(difficulty, 2200),
    choices,
    correctIndex,
    explanation: `There are ${count} ${target.name} dots.`
  };
}

function sequenceRecall(difficulty: number, isAssessment = false): PuzzleRound {
  const length = 3 + Math.floor(difficulty / 5);
  const sequence = Array.from({ length }, () => String(1 + Math.floor(Math.random() * 9)));
  const answer = sequence.join('-');
  const { choices, correctIndex } = withAnswer([shuffle(sequence).join('-'), sequence.slice().reverse().join('-'), sequence.map((n) => String(((Number(n) + 1) % 9) + 1)).join('-')], answer);
  return {
    id: id(isAssessment ? 'spatial-span' : 'sequence-recall'),
    domain: 'workingMemory',
    typeId: isAssessment ? 'spatial-span' : 'sequence-recall',
    typeName: isAssessment ? 'Spatial Span' : 'Sequence Recall',
    subtitle: isAssessment ? 'Assessment: Corsi-style span' : 'Repeat the tile order',
    difficulty,
    isAssessment,
    prompt: 'Choose the numbers in the exact shown order, first to last.',
    visual: { mode: 'tiles', tokens: hiddenSequence(sequence.length), columns: sequence.length },
    requiresReady: true,
    studyPrompt: 'Memorize left to right. Do not read by grid rows.',
    studyVisual: { mode: 'tiles', tokens: sequence.map((value, index) => token(`${index + 1}: ${value}`, '#2E6F95')), columns: sequence.length },
    studyDurationMs: studyMs(difficulty, 2600),
    choices,
    correctIndex,
    explanation: `The sequence was ${answer}.`
  };
}

function numberChain(difficulty: number, isAssessment = false): PuzzleRound {
  const length = 4 + Math.floor(difficulty / 6);
  const chain = Array.from({ length }, () => String(Math.floor(Math.random() * 10)));
  const reverse = difficulty > 8 || isAssessment;
  const answer = (reverse ? chain.slice().reverse() : chain).join('');
  const { choices, correctIndex } = withAnswer([shuffle(chain).join(''), chain.join(''), chain.slice(1).concat(chain[0]!).join('')], answer);
  return {
    id: id(isAssessment ? 'digit-span' : 'number-chain'),
    domain: isAssessment ? 'language' : 'workingMemory',
    typeId: isAssessment ? 'digit-span' : 'number-chain',
    typeName: isAssessment ? 'Digit Span' : 'Number Chain',
    subtitle: reverse ? 'Recall in reverse order' : 'Recall in order',
    difficulty,
    isAssessment,
    prompt: reverse ? 'Pick the reverse of the number chain.' : 'Pick the exact number chain.',
    visual: { mode: 'tiles', tokens: hiddenTokens(length), columns: length },
    requiresReady: true,
    studyPrompt: `Memorize this number chain${reverse ? '; you will answer in reverse.' : '.'}`,
    studyVisual: { mode: 'tiles', tokens: chain.map((value) => token(value, '#2E6F95')), columns: length },
    studyDurationMs: studyMs(difficulty, 2400),
    choices,
    correctIndex,
    explanation: `The correct recall is ${answer}.`
  };
}

function dualTrack(difficulty: number): PuzzleRound {
  const n = difficulty > 10 ? 2 : 1;
  const series = Array.from({ length: n + 2 }, () => ({ pos: 1 + Math.floor(Math.random() * 9), color: pick(colors) }));
  const matchKind = pick(['position', 'color', 'none'] as const);
  const previous = series[series.length - 1 - n]!;
  const current = series[series.length - 1]!;
  if (matchKind === 'position') current.pos = previous.pos;
  if (matchKind === 'color') current.color = previous.color;
  if (matchKind === 'none' && current.pos === previous.pos) current.pos = (current.pos % 9) + 1;
  const answer = matchKind === 'none' ? 'No match' : matchKind === 'position' ? 'Position match' : 'Color match';
  const { choices, correctIndex } = withAnswer(['Position match', 'Color match', 'No match'], answer);
  return {
    id: id('dual-track'),
    domain: 'workingMemory',
    typeId: 'dual-track',
    typeName: 'Dual Track',
    subtitle: `${n}-back position and color`,
    difficulty,
    isAssessment: false,
    prompt: `Compare the last tile with the one ${n} step back.`,
    visual: { mode: 'tiles', tokens: hiddenTokens(series.length), columns: series.length },
    requiresReady: true,
    studyPrompt: `Track position and color across the ${series.length}-item stream.`,
    studyVisual: { mode: 'tiles', tokens: series.map((item) => token(String(item.pos), item.color.value)), columns: series.length },
    studyDurationMs: studyMs(difficulty, 2800),
    choices,
    correctIndex,
    explanation: answer === 'No match' ? 'Neither tracked feature repeated.' : `${answer} repeated ${n} step back.`
  };
}

function memoryGrid(difficulty: number): PuzzleRound {
  const pair = pick(objects);
  const gridSize = 6 + Math.min(6, Math.floor(difficulty / 3));
  const targetSlots = sample(Array.from({ length: gridSize }, (_, index) => index + 1), 2).sort((a, b) => a - b);
  const answer = targetSlots.join(' and ');
  const distractors = [sample(Array.from({ length: gridSize }, (_, index) => index + 1), 2).sort((a, b) => a - b).join(' and '), '1 and 2', `${gridSize - 1} and ${gridSize}`];
  const { choices, correctIndex } = withAnswer(distractors, answer);
  return {
    id: id('memory-grid'),
    domain: 'workingMemory',
    typeId: 'memory-grid',
    typeName: 'Memory Grid',
    subtitle: 'Brief pair-location memory',
    difficulty,
    isAssessment: false,
    prompt: `The matching ${pair} cards were shown. Which positions held the pair?`,
    visual: { mode: 'grid', tokens: hiddenTokens(gridSize), columns: 3 },
    requiresReady: true,
    studyPrompt: `Memorize where the two ${pair} cards appear.`,
    studyVisual: { mode: 'grid', tokens: Array.from({ length: gridSize }, (_, index) => token(targetSlots.includes(index + 1) ? pair : String(index + 1), targetSlots.includes(index + 1) ? '#2E6F95' : '#CED6DF')), columns: 3 },
    studyDurationMs: studyMs(difficulty, 2500),
    choices,
    correctIndex,
    explanation: `The pair appeared at positions ${answer}.`
  };
}

function operationSpan(difficulty: number): PuzzleRound {
  const length = 3 + Math.floor(difficulty / 6);
  const letters = sample('RKTMSLP'.split(''), length);
  const rows = letters.map((letter) => {
    const a = 2 + Math.floor(Math.random() * 7);
    const b = 1 + Math.floor(Math.random() * 5);
    const trueValue = a + b;
    const shownValue = Math.random() > 0.35 ? trueValue : trueValue + pick([-2, -1, 1, 2]);
    return { letter, text: `${a}+${b}=${shownValue}`, valid: trueValue === shownValue };
  });
  const answerLetters = rows.filter((row) => row.valid).map((row) => row.letter);
  const answer = answerLetters.length ? answerLetters.join('-') : 'none';
  const allLetters = rows.map((row) => row.letter);
  const { choices, correctIndex } = withAnswer([shuffle(allLetters).join('-'), allLetters.slice().reverse().join('-'), 'none'], answer);
  return {
    id: id('operation-span'),
    domain: 'workingMemory',
    typeId: 'operation-span',
    typeName: 'Operation Span',
    subtitle: 'Storage plus mental verification',
    difficulty,
    isAssessment: false,
    prompt: 'Recall the letters paired with true equations.',
    visual: { mode: 'tiles', tokens: hiddenTokens(rows.length), columns: rows.length },
    requiresReady: true,
    studyPrompt: 'Check each equation and remember only the letters on true equations.',
    studyVisual: { mode: 'tiles', tokens: rows.map((row) => token(`${row.text} ${row.letter}`, row.valid ? '#2E6F95' : '#A8B4BF')), columns: 1 },
    studyDurationMs: studyMs(difficulty, 3600),
    choices,
    correctIndex,
    explanation: answer === 'none' ? 'None of the displayed equations were true.' : `The true equations carried letters ${answer}.`
  };
}

function delayedRecall(difficulty: number): PuzzleRound {
  const code = sample('RKTMSLPQ'.split(''), 4 + Math.min(2, Math.floor(difficulty / 8)));
  const answer = code.join('');
  const distractors = [code.slice().reverse().join(''), shuffle(code).join(''), code.slice(1).concat(code[0]!).join('')];
  const { choices, correctIndex } = withAnswer(distractors, answer);
  const a = 12 + Math.floor(Math.random() * 9);
  const b = 4 + Math.floor(Math.random() * 8);
  return {
    id: id('delayed-recall'),
    domain: 'workingMemory',
    typeId: 'delayed-recall',
    typeName: 'Delayed Recall',
    subtitle: 'Hold information through interference',
    difficulty,
    isAssessment: false,
    prompt: 'Now recall the original code in order.',
    visual: { mode: 'tiles', tokens: hiddenSequence(code.length), columns: code.length },
    requiresReady: true,
    studyPrompt: 'Memorize this code. A distraction task appears before the answer choices.',
    studyVisual: { mode: 'tiles', tokens: code.map((letter, index) => token(`${index + 1}: ${letter}`, '#2E6F95')), columns: code.length },
    studyDurationMs: studyMs(difficulty, 2300),
    interferencePrompt: 'Interference: solve this, then keep holding the code.',
    interferenceVisual: { mode: 'statement', note: `${a} + ${b} = ${a + b}` },
    interferenceDurationMs: Math.max(1400, 2600 - difficulty * 45),
    choices,
    correctIndex,
    explanation: `The original code was ${answer}. The arithmetic screen was only a distraction.`
  };
}

function colorWord(difficulty: number, isAssessment = false): PuzzleRound {
  const word = pick(colors);
  let ink = pick(colors);
  if (difficulty > 3) while (ink.name === word.name) ink = pick(colors);
  const { choices, correctIndex } = withAnswer(colors.map((color) => color.name), ink.name);
  return {
    id: id(isAssessment ? 'double-trouble' : 'color-word'),
    domain: 'attention',
    typeId: isAssessment ? 'double-trouble' : 'color-word',
    typeName: isAssessment ? 'Double Trouble' : 'Color Word',
    subtitle: isAssessment ? 'Assessment: Stroop interference' : 'Tap the ink color, not the word',
    difficulty,
    isAssessment,
    prompt: 'What color is the ink?',
    visual: { mode: 'statement', note: word.name.toUpperCase(), tokens: [token(word.name.toUpperCase(), ink.value)] },
    choices,
    correctIndex,
    explanation: `The word meaning is ignored; the ink is ${ink.name}.`
  };
}

function noiseFilter(difficulty: number): PuzzleRound {
  const targetShape = pick(['circle', 'square', 'triangle']);
  const targetColor = pick(colors);
  const count = 12 + Math.floor(difficulty / 3);
  const tokens = Array.from({ length: count }, () => token(pick(shapes), pick(colors).value));
  const targetCount = 2 + Math.floor(Math.random() * 3);
  for (let index = 0; index < targetCount; index += 1) {
    tokens[index] = token(targetShape, targetColor.value);
  }
  const shuffled = shuffle(tokens);
  const answer = String(shuffled.filter((item) => item.label === targetShape && item.color === targetColor.value).length);
  const { choices, correctIndex } = withAnswer([String(Number(answer) - 1), String(Number(answer) + 1), String(Number(answer) + 2)], answer);
  return {
    id: id('noise-filter'),
    domain: 'attention',
    typeId: 'noise-filter',
    typeName: 'Noise Filter',
    subtitle: 'Distraction resistance',
    difficulty,
    isAssessment: false,
    prompt: `How many items match BOTH: ${targetColor.name} and ${targetShape}?`,
    visual: { mode: 'grid', tokens: hiddenTokens(shuffled.length), columns: 4 },
    requiresReady: true,
    studyPrompt: `Ignore every partial match. Count only ${targetColor.name} ${targetShape}s.`,
    studyVisual: { mode: 'grid', tokens: shuffled, columns: 4, note: 'Distractors share either color or shape.' },
    studyDurationMs: studyMs(difficulty, 2600),
    choices,
    correctIndex,
    explanation: `The answer counts only items matching both features, not just ${targetColor.name} items or just ${targetShape}s.`
  };
}

function focusFire(difficulty: number): PuzzleRound {
  const directions = ['left', 'right', 'up', 'down'];
  const center = pick(directions);
  const flanker = difficulty > 4 ? pick(directions.filter((direction) => direction !== center)) : center;
  const symbols: Record<string, string> = { left: '<', right: '>', up: '^', down: 'v' };
  const row = [flanker, flanker, center, flanker, flanker].map((direction) => token(symbols[direction]!, direction === center ? '#277A5B' : '#A7B3AD'));
  const { choices, correctIndex } = withAnswer(directions, center);
  return {
    id: id('focus-fire'),
    domain: 'attention',
    typeId: 'focus-fire',
    typeName: 'Focus Fire',
    subtitle: 'Flanker-style selective attention',
    difficulty,
    isAssessment: false,
    prompt: 'Which way does the center arrow point?',
    visual: { mode: 'tiles', tokens: row, columns: 5 },
    choices,
    correctIndex,
    explanation: `The center arrow points ${center}.`
  };
}

function stopSignal(difficulty: number): PuzzleRound {
  const items = sample(['circle', 'square', 'circle', 'triangle', 'circle', 'square'], 5 + Math.floor(difficulty / 6));
  const goCount = items.filter((item) => item === 'circle').length;
  const { choices, correctIndex } = withAnswer([String(goCount - 1), String(goCount + 1), '0'], String(goCount));
  return {
    id: id('stop-signal'),
    domain: 'attention',
    typeId: 'stop-signal',
    typeName: 'Stop Signal',
    subtitle: 'Go/no-go response inhibition',
    difficulty,
    isAssessment: false,
    prompt: 'Tap circles only. How many taps should you make?',
    visual: { mode: 'tiles', tokens: hiddenTokens(items.length), columns: items.length },
    requiresReady: true,
    studyPrompt: 'Count only the go targets. Ignore the no-go shapes.',
    studyVisual: { mode: 'tiles', tokens: items.map((item) => token(item, item === 'circle' ? '#277A5B' : '#C8D0CC')), columns: items.length },
    studyDurationMs: studyMs(difficulty, 2200),
    choices,
    correctIndex,
    explanation: `Only circles count, so the answer is ${goCount}.`
  };
}

function oddPulse(difficulty: number): PuzzleRound {
  const beats = Array.from({ length: 6 + Math.floor(difficulty / 5) }, (_, index) => (index + 1) % 4 === 0 ? 'rest' : 'tap');
  const answer = String(beats.filter((beat) => beat === 'tap').length);
  const { choices, correctIndex } = withAnswer([String(Number(answer) - 1), String(Number(answer) + 1), String(beats.length)], answer);
  return {
    id: id('odd-pulse'),
    domain: 'attention',
    typeId: 'odd-pulse',
    typeName: 'Odd Pulse',
    subtitle: 'Rhythm inhibition without audio dependency',
    difficulty,
    isAssessment: false,
    prompt: 'Tap on regular beats and stop on rest beats. How many taps?',
    visual: { mode: 'tiles', tokens: hiddenTokens(beats.length), columns: 4 },
    requiresReady: true,
    studyPrompt: 'Count TAP beats and inhibit REST beats.',
    studyVisual: { mode: 'tiles', tokens: beats.map((beat) => token(beat === 'tap' ? 'TAP' : 'REST', beat === 'tap' ? '#277A5B' : '#D9B657')), columns: 4 },
    studyDurationMs: studyMs(difficulty, 2400),
    choices,
    correctIndex,
    explanation: `There are ${answer} regular tap beats.`
  };
}

function conflictGrid(difficulty: number): PuzzleRound {
  const targetInk = pick(colors);
  const targetWord = pick(colors.filter((color) => color.name !== targetInk.name));
  const count = 9 + Math.floor(difficulty / 3);
  const tokens = Array.from({ length: count }, () => {
    const word = pick(colors);
    const ink = pick(colors);
    return token(word.name.toUpperCase(), ink.value);
  });
  tokens[0] = token(targetWord.name.toUpperCase(), targetInk.value);
  if (difficulty > 8) tokens[1] = token(targetWord.name.toUpperCase(), targetInk.value);
  const shuffledTokens = shuffle(tokens);
  const answer = String(shuffledTokens.filter((item) => item.label.toLowerCase() === targetWord.name && item.color === targetInk.value).length);
  const { choices, correctIndex } = withAnswer([String(Number(answer) - 1), String(Number(answer) + 1), String(Number(answer) + 2)], answer);
  return {
    id: id('conflict-grid'),
    domain: 'attention',
    typeId: 'conflict-grid',
    typeName: 'Conflict Grid',
    subtitle: 'Selective attention under Stroop conflict',
    difficulty,
    isAssessment: false,
    prompt: `Count words that say ${targetWord.name.toUpperCase()} in ${targetInk.name} ink.`,
    visual: { mode: 'grid', tokens: hiddenTokens(shuffledTokens.length), columns: 3 },
    requiresReady: true,
    studyPrompt: `Count ${targetWord.name.toUpperCase()} words in ${targetInk.name} ink.`,
    studyVisual: { mode: 'grid', tokens: shuffledTokens, columns: 3 },
    studyDurationMs: studyMs(difficulty, 2600),
    choices,
    correctIndex,
    explanation: `A correct item must match both the written word and the ink color.`
  };
}

function ruleFlip(difficulty: number): PuzzleRound {
  const sortBy = pick(['color', 'shape'] as const);
  const item = { shape: pick(shapes), color: pick(colors) };
  const answer = sortBy === 'color' ? item.color.name : item.shape;
  const distractors = sortBy === 'color' ? colors.map((color) => color.name) : shapes;
  const { choices, correctIndex } = withAnswer(distractors, answer);
  return {
    id: id('rule-flip'),
    domain: 'flexibility',
    typeId: 'rule-flip',
    typeName: 'Rule Flip',
    subtitle: 'Sort by the active rule',
    difficulty,
    isAssessment: false,
    prompt: `Rule changed: sort by ${sortBy}.`,
    visual: { mode: 'tiles', tokens: [token(item.shape, item.color.value)] },
    choices,
    correctIndex,
    explanation: `The active rule is ${sortBy}, so the correct choice is ${answer}.`
  };
}

function trailBlaze(difficulty: number, isAssessment = false): PuzzleRound {
  const length = 4 + Math.floor(difficulty / 5);
  const sequence = Array.from({ length }, (_, index) => (index % 2 === 0 ? String(index / 2 + 1) : String.fromCharCode(65 + Math.floor(index / 2))));
  const answer = sequence.join('-');
  const { choices, correctIndex } = withAnswer([sequence.slice().reverse().join('-'), shuffle(sequence).join('-'), sequence.join('')], answer);
  return {
    id: id(isAssessment ? 'trail-making' : 'trail-blaze'),
    domain: 'flexibility',
    typeId: isAssessment ? 'trail-making' : 'trail-blaze',
    typeName: isAssessment ? 'Trail Making' : 'Trail Blaze',
    subtitle: isAssessment ? 'Assessment: alternate symbol sets' : 'Alternate numbers and letters',
    difficulty,
    isAssessment,
    prompt: 'Choose the correct alternating trail.',
    visual: { mode: 'trail', tokens: shuffle(sequence).map((value) => token(value, '#7B5E2F')), columns: 4 },
    choices,
    correctIndex,
    explanation: `The alternating path is ${answer}.`
  };
}

function switchMath(difficulty: number): PuzzleRound {
  const base = 8 + Math.floor(Math.random() * 8);
  const a = 1 + Math.floor(difficulty / 4);
  const b = 2 + Math.floor(Math.random() * 5);
  const answer = base + a - b;
  const { choices, correctIndex } = withAnswer([String(answer + 1), String(answer - 2), String(base + a + b)], String(answer));
  return {
    id: id('switch-math'),
    domain: 'flexibility',
    typeId: 'switch-math',
    typeName: 'Switch Math',
    subtitle: 'Alternate operations',
    difficulty,
    isAssessment: false,
    prompt: `Start at ${base}. Add ${a}, then subtract ${b}.`,
    visual: { mode: 'statement', note: `${base} + ${a} - ${b}` },
    choices,
    correctIndex,
    explanation: `${base} + ${a} - ${b} = ${answer}.`
  };
}

function categorySwap(difficulty: number): PuzzleRound {
  const rule = pick(['animal', 'food', 'object'] as const);
  const banks = { animal: animals, food: foods, object: objects };
  const answer = pick(banks[rule]);
  const distractors = shuffle([...animals, ...foods, ...objects].filter((item) => !banks[rule].includes(item)));
  const { choices, correctIndex } = withAnswer(distractors, answer);
  return {
    id: id('category-swap'),
    domain: 'flexibility',
    typeId: 'category-swap',
    typeName: 'Category Swap',
    subtitle: 'Apply the newest category rule',
    difficulty,
    isAssessment: false,
    prompt: `Rule now: choose the ${rule}.`,
    visual: { mode: 'tiles', tokens: choices.map((choice) => token(choice, choice === answer ? '#7B5E2F' : '#D9CDB9')), columns: 2 },
    choices,
    correctIndex,
    explanation: `${answer} fits the current ${rule} rule.`
  };
}

function ruleCascade(difficulty: number): PuzzleRound {
  const item = { shape: pick(shapes), color: pick(colors), number: 2 + Math.floor(Math.random() * 8) };
  const firstRule = item.number % 2 === 0 ? 'color' : 'shape';
  const secondRule = item.color.name.length > 4 ? 'number' : firstRule;
  const answer = secondRule === 'color' ? item.color.name : secondRule === 'shape' ? item.shape : item.number % 2 === 0 ? 'even' : 'odd';
  const options = secondRule === 'color' ? colors.map((color) => color.name) : secondRule === 'shape' ? shapes : ['even', 'odd', 'prime', 'square'];
  const { choices, correctIndex } = withAnswer(options, answer);
  return {
    id: id('rule-cascade'),
    domain: 'flexibility',
    typeId: 'rule-cascade',
    typeName: 'Rule Cascade',
    subtitle: 'Nested rule switching',
    difficulty,
    isAssessment: false,
    prompt: 'Apply the rule cascade. What final label applies?',
    visual: {
      mode: 'rules',
      note: `${item.number} ${item.color.name} ${item.shape}`,
      lines: ['If number is even, use color; otherwise use shape.', 'If the color name has more than 4 letters, switch to number.']
    },
    choices,
    correctIndex,
    explanation: `The first rule points to ${firstRule}; the second rule resolves to ${secondRule}, so the answer is ${answer}.`
  };
}

function nextInLine(difficulty: number): PuzzleRound {
  const { sequence, answer, rule } = arithmeticProgression(difficulty);
  const { choices, correctIndex } = withAnswer([String(answer + 1), String(answer - 2), String(answer + 3)], String(answer));
  return {
    id: id('next-in-line'),
    domain: 'reasoning',
    typeId: 'next-in-line',
    typeName: 'Next in Line',
    subtitle: 'Serial pattern completion',
    difficulty,
    isAssessment: false,
    prompt: 'What comes next?',
    visual: { mode: 'tiles', tokens: sequence.map((value) => token(String(value), '#5D5BB4')), columns: sequence.length },
    choices,
    correctIndex,
    explanation: `The rule is ${rule}.`
  };
}

function interleavedSequence(difficulty: number): PuzzleRound {
  const aStart = 2 + Math.floor(Math.random() * 5);
  const bStart = 3 + Math.floor(Math.random() * 5);
  const aStep = 2 + Math.floor(difficulty / 6);
  const bStep = 3 + Math.floor(difficulty / 7);
  const sequence = [aStart, bStart, aStart + aStep, bStart * 2, aStart + aStep * 2, bStart * 2 + bStep];
  const answer = aStart + aStep * 3;
  const { choices, correctIndex } = withAnswer([String(answer + aStep), String(sequence[5]! + bStep), String(answer - 1)], String(answer));
  return {
    id: id('interleaved-sequence'),
    domain: 'reasoning',
    typeId: 'interleaved-sequence',
    typeName: 'Interleaved Sequence',
    subtitle: 'Separate two hidden rules',
    difficulty,
    isAssessment: false,
    prompt: 'What number comes next in this interleaved pattern?',
    visual: { mode: 'tiles', tokens: sequence.map((value) => token(String(value), '#5D5BB4')), columns: 6 },
    choices,
    correctIndex,
    explanation: `Odd positions add ${aStep}: ${aStart}, ${aStart + aStep}, ${aStart + aStep * 2}, ${answer}.`
  };
}

function matrixPick(difficulty: number): PuzzleRound {
  const rowA = sample(shapes, 3);
  const rowB = [rowA[1]!, rowA[2]!, rowA[0]!];
  const rowC = [rowB[1]!, rowB[2]!, '?'];
  const missing = rowB[0]!;
  const shown = [...rowA, ...rowB, ...rowC];
  const { choices, correctIndex } = withAnswer([pick(shapes), rowA[2]!, rowB[2]!], missing);
  return {
    id: id('matrix-pick'),
    domain: 'reasoning',
    typeId: 'matrix-pick',
    typeName: 'Matrix Pick',
    subtitle: 'Infer row and column transformations',
    difficulty,
    isAssessment: false,
    prompt: 'Complete the 3x3 matrix.',
    visual: { mode: 'grid', tokens: shown.map((value) => token(value, '#5D5BB4')), columns: 3 },
    choices,
    correctIndex,
    explanation: 'Each row shifts the previous row left by one position.'
  };
}

function oddOneOut(difficulty: number): PuzzleRound {
  const group = pick([animals, foods, objects]);
  const other = pick([animals, foods, objects].filter((bank) => bank !== group));
  const answer = pick(other);
  const choicesRaw = shuffle([...sample(group, 3), answer]);
  return {
    id: id('odd-one-out'),
    domain: 'reasoning',
    typeId: 'odd-one-out',
    typeName: 'Odd One Out',
    subtitle: 'Abstract category reasoning',
    difficulty,
    isAssessment: false,
    prompt: 'Which item does not belong?',
    visual: { mode: 'tiles', tokens: choicesRaw.map((choice) => token(choice, choice === answer ? '#5D5BB4' : '#D7D6F0')), columns: 2 },
    choices: choicesRaw,
    correctIndex: choicesRaw.indexOf(answer),
    explanation: `${answer} comes from a different category.`
  };
}

function logicLock(difficulty: number): PuzzleRound {
  const answer = pick(['A-B-C-D', 'B-D-A-C', 'C-A-D-B']);
  const [first, second, third, fourth] = answer.split('-');
  const { choices, correctIndex } = withAnswer(['A-D-B-C', 'B-A-C-D', 'D-C-A-B'], answer);
  return {
    id: id('logic-lock'),
    domain: 'reasoning',
    typeId: 'logic-lock',
    typeName: 'Logic Lock',
    subtitle: 'Constraint satisfaction',
    difficulty,
    isAssessment: false,
    prompt: `${second} is immediately right of ${first}. ${fourth} is right of ${third}. ${third} is not first. Which order works?`,
    visual: { mode: 'statement', note: 'Positions 1 | 2 | 3 | 4' },
    choices,
    correctIndex,
    explanation: `${answer} satisfies all three positional constraints.`
  };
}

function balanceCode(difficulty: number): PuzzleRound {
  const leftA = 2 + Math.floor(Math.random() * 5);
  const leftB = 1 + Math.floor(Math.random() * 4);
  const rightA = 1 + Math.floor(Math.random() * 5);
  const answer = leftA + leftB - rightA;
  const { choices, correctIndex } = withAnswer([String(answer + 1), String(answer - 1), String(answer + 2)], String(answer));
  return {
    id: id('balance-code'),
    domain: 'reasoning',
    typeId: 'balance-code',
    typeName: 'Balance Code',
    subtitle: 'Algebraic constraint reasoning',
    difficulty,
    isAssessment: false,
    prompt: `Find X so the balance holds: ${leftA} + ${leftB} = ${rightA} + X`,
    visual: { mode: 'statement', note: `${leftA} + ${leftB}  =  ${rightA} + X` },
    choices,
    correctIndex,
    explanation: `X must be ${leftA + leftB} - ${rightA}, so X = ${answer}.`
  };
}

function quantitativeBalance(difficulty: number): PuzzleRound {
  const puzzle = balanceCode(difficulty);
  return {
    ...puzzle,
    id: id('quant-balance'),
    domain: 'quantitative',
    typeId: 'quant-balance',
    typeName: 'Quant Balance',
    subtitle: 'Algebraic balance reasoning'
  };
}

function logicGrid(difficulty: number, isAssessment = false): PuzzleRound {
  const answer = pick(['Ari-red-1', 'Bea-blue-2', 'Cy-green-3']);
  const [person, color, rank] = answer.split('-');
  const { choices, correctIndex } = withAnswer(['Ari-blue-2', 'Bea-green-1', 'Cy-red-2'], answer);
  return {
    id: id(isAssessment ? 'deduction-check' : 'logic-grid'),
    domain: isAssessment ? 'planning' : 'reasoning',
    typeId: isAssessment ? 'deduction-check' : 'logic-grid',
    typeName: isAssessment ? 'Deduction Check' : 'Logic Grid',
    subtitle: 'Multi-clue elimination',
    difficulty,
    isAssessment,
    prompt: 'Which assignment is forced by the clues?',
    visual: {
      mode: 'rules',
      note: 'Clues',
      lines: [
        `${person} is paired with ${color}.`,
        `The ${color} item is ranked ${rank}.`,
        `${pick(people.filter((name) => name !== person))} is not paired with ${color}.`,
        `Only one option can satisfy all clues.`
      ]
    },
    choices,
    correctIndex,
    explanation: `${answer} is the only option that keeps the person-color and color-rank clues together.`
  };
}

function planningGrid(difficulty: number): PuzzleRound {
  const puzzle = logicGrid(difficulty, false);
  return {
    ...puzzle,
    id: id('planning-grid'),
    domain: 'planning',
    typeId: 'planning-grid',
    typeName: 'Planning Grid',
    subtitle: 'Deduction for action selection'
  };
}

function conditionalSyllogism(difficulty: number): PuzzleRound {
  const answer = pick(['Mira studies logic', 'The task is skipped', 'The score is reviewed']);
  const middle = answer === 'Mira studies logic' ? 'Mira solves matrices' : answer === 'The task is skipped' ? 'The timer expires' : 'Accuracy drops';
  const { choices, correctIndex } = withAnswer(['The first rule is false', 'The opposite conclusion follows', 'No conclusion follows'], answer);
  return {
    id: id('conditional-syllogism'),
    domain: 'reasoning',
    typeId: 'conditional-syllogism',
    typeName: 'Conditional Chain',
    subtitle: 'Two-step verbal deduction',
    difficulty,
    isAssessment: false,
    prompt: 'What must be true?',
    visual: {
      mode: 'rules',
      note: 'Rules',
      lines: [`If ${middle}, then ${answer}.`, `The condition is true: ${middle}.`, 'Apply only valid logical steps.']
    },
    choices,
    correctIndex,
    explanation: `Modus ponens applies: if ${middle} implies ${answer}, and ${middle} is true, then ${answer} must be true.`
  };
}

function spatialTransform(difficulty: number): PuzzleRound {
  const source = ['A', '.', 'B', '.', 'C', '.'];
  const rotated = ['.', 'C', '.', 'B', '.', 'A'];
  const answer = rotated.join('');
  const { choices, correctIndex } = withAnswer(['A.B.C.', '.A.B.C', 'C.B.A.'], answer);
  return {
    id: id('spatial-transform'),
    domain: 'reasoning',
    typeId: 'spatial-transform',
    typeName: 'Spatial Transform',
    subtitle: 'Mental rotation and reversal',
    difficulty,
    isAssessment: false,
    prompt: 'Reverse the row and preserve blanks. Which result matches?',
    visual: { mode: 'grid', tokens: source.map((value) => token(value, value === '.' ? '#D5D9DF' : '#5D5BB4')), columns: 6 },
    choices,
    correctIndex,
    explanation: 'A full reversal changes A . B . C . into . C . B . A.'
  };
}

function grammaticalReasoning(difficulty: number): PuzzleRound {
  const leftShape = pick(['circle', 'square']);
  const rightShape = leftShape === 'circle' ? 'square' : 'circle';
  const relationTrue = Math.random() > 0.5;
  const statement = relationTrue
    ? `The ${leftShape} is not the same as the ${rightShape}.`
    : `The ${leftShape} is the same as the ${rightShape}.`;
  const answer = relationTrue ? 'True' : 'False';
  const { choices, correctIndex } = withAnswer(['True', 'False'], answer);
  return {
    id: id('grammatical-reasoning'),
    domain: 'reasoning',
    typeId: 'grammatical-reasoning',
    typeName: 'Grammatical Reasoning',
    subtitle: 'Assessment: verbal logic',
    difficulty,
    isAssessment: true,
    prompt: statement,
    visual: { mode: 'comparison', left: [token(leftShape, '#5D5BB4')], right: [token(rightShape, '#A8A7D9')] },
    choices,
    correctIndex,
    explanation: `The statement is ${answer.toLowerCase()}.`
  };
}

function wordScramble(difficulty: number): PuzzleRound {
  const answer = pick(['planet', 'signal', 'memory', 'reason', 'switch', 'focus', 'garden', 'silver']);
  const scrambled = shuffle(answer.split('')).join('');
  const { choices, correctIndex } = withAnswer(['stream', 'button', 'orange', 'castle', 'motion'], answer);
  return {
    id: id('word-scramble'),
    domain: 'language',
    typeId: 'word-scramble',
    typeName: 'Word Scramble',
    subtitle: 'Anagram solving',
    difficulty,
    isAssessment: false,
    prompt: 'Unscramble the letters.',
    visual: { mode: 'tiles', tokens: scrambled.split('').map((letter) => token(letter.toUpperCase(), '#A03C6D')), columns: scrambled.length },
    choices,
    correctIndex,
    explanation: `${scrambled.toUpperCase()} unscrambles to ${answer}.`
  };
}

function quickClue(difficulty: number): PuzzleRound {
  const item = pick(clueBank);
  const { choices, correctIndex } = withAnswer(item.distractors, item.answer);
  return {
    id: id('quick-clue'),
    domain: 'language',
    typeId: 'quick-clue',
    typeName: 'Quick Clue',
    subtitle: 'Crossword-style clue',
    difficulty,
    isAssessment: false,
    prompt: item.clue,
    visual: { mode: 'statement', note: `${item.answer.length} letters` },
    choices,
    correctIndex,
    explanation: `The clue points to "${item.answer}".`
  };
}

function letterFlow(difficulty: number): PuzzleRound {
  const category = pick(['animal', 'food'] as const);
  const bank = category === 'animal' ? animals : foods;
  const answer = pick(bank);
  const start = answer[0]!;
  const distractors = shuffle([...animals, ...foods, ...objects].filter((word) => word[0] !== start || !bank.includes(word)));
  const { choices, correctIndex } = withAnswer(distractors, answer);
  return {
    id: id('letter-flow'),
    domain: 'language',
    typeId: 'letter-flow',
    typeName: 'Letter Flow',
    subtitle: 'Category plus initial letter',
    difficulty,
    isAssessment: false,
    prompt: `Choose a ${category} starting with "${start.toUpperCase()}".`,
    visual: { mode: 'statement', note: `${category.toUpperCase()} / ${start.toUpperCase()}` },
    choices,
    correctIndex,
    explanation: `${answer} is a ${category} that starts with ${start.toUpperCase()}.`
  };
}

function wordChain(difficulty: number): PuzzleRound {
  const chains = [
    ['mango', 'olive', 'eagle'],
    ['lamp', 'pencil', 'lentil'],
    ['anchor', 'reason', 'notion'],
    ['pasta', 'apple', 'eagle']
  ];
  const chain = pick(chains);
  const last = chain[chain.length - 1]!;
  const required = last[last.length - 1]!;
  const pool = [...animals, ...foods, ...objects, 'ember', 'logic', 'nectar', 'orbit'];
  const answer = pool.find((word) => word[0] === required && !chain.includes(word)) ?? 'ember';
  const distractors = pool.filter((word) => word[0] !== required && !chain.includes(word)).slice(0, 8);
  const { choices, correctIndex } = withAnswer(distractors, answer);
  return {
    id: id('word-chain'),
    domain: 'language',
    typeId: 'word-chain',
    typeName: 'Word Chain',
    subtitle: 'Last-letter verbal sequencing',
    difficulty,
    isAssessment: false,
    prompt: 'Continue the last-letter chain.',
    visual: { mode: 'statement', note: `${chain.join(' -> ')} -> ?` },
    choices,
    correctIndex,
    explanation: `${answer} starts with ${required.toUpperCase()}, the last letter of ${last}.`
  };
}

function verbalAnalogy(difficulty: number): PuzzleRound {
  const analogies = [
    { prompt: 'seed is to sprout as spark is to', answer: 'flame', distractors: ['stone', 'branch', 'cloud'] },
    { prompt: 'author is to novel as composer is to', answer: 'symphony', distractors: ['gallery', 'engine', 'harbor'] },
    { prompt: 'thermometer is to temperature as compass is to', answer: 'direction', distractors: ['pressure', 'distance', 'volume'] },
    { prompt: 'premise is to conclusion as clue is to', answer: 'solution', distractors: ['texture', 'weather', 'margin'] }
  ];
  const item = pick(analogies);
  const { choices, correctIndex } = withAnswer(item.distractors, item.answer);
  return {
    id: id('verbal-analogy'),
    domain: 'language',
    typeId: 'verbal-analogy',
    typeName: 'Verbal Analogy',
    subtitle: 'Relational verbal reasoning',
    difficulty,
    isAssessment: false,
    prompt: item.prompt,
    visual: { mode: 'statement', note: 'A : B :: C : ?' },
    choices,
    correctIndex,
    explanation: `The same relationship gives ${item.answer}.`
  };
}

function constraintClue(difficulty: number): PuzzleRound {
  const candidates = ['planet', 'silver', 'garden', 'signal', 'memory', 'switch', 'reason', 'focus'];
  const answer = pick(candidates);
  const mustContain = answer[Math.floor(answer.length / 2)]!;
  const length = answer.length;
  const { choices, correctIndex } = withAnswer(
    shuffle(candidates.filter((word) => word !== answer && (word.length !== length || !word.includes(mustContain)))),
    answer
  );
  return {
    id: id('constraint-clue'),
    domain: 'language',
    typeId: 'constraint-clue',
    typeName: 'Constraint Clue',
    subtitle: 'Lexical search with multiple constraints',
    difficulty,
    isAssessment: false,
    prompt: 'Choose the word that satisfies all constraints.',
    visual: {
      mode: 'rules',
      note: 'Constraints',
      lines: [
        `${length} letters`,
        `Contains "${mustContain}"`,
        `Meaning: ${answer === 'planet' ? 'world' : answer === 'silver' ? 'metallic color' : answer === 'garden' ? 'place for plants' : answer === 'signal' ? 'meaningful sign' : answer === 'memory' ? 'stored recall' : answer === 'switch' ? 'change over' : answer === 'reason' ? 'logical cause' : 'attention target'}`
      ]
    },
    choices,
    correctIndex,
    explanation: `${answer} satisfies the length, letter, and meaning constraints.`
  };
}

function routePlanner(difficulty: number, isAssessment = false): PuzzleRound {
  const routes = [
    { name: 'A-C-D', time: 7, risk: 3, reward: 4 },
    { name: 'A-B-D', time: 6, risk: 5, reward: 3 },
    { name: 'A-E-D', time: 9, risk: 1, reward: 6 }
  ];
  const limit = difficulty > 8 ? 8 : 9;
  const feasible = routes.filter((route) => route.time <= limit);
  const best = feasible.sort((a, b) => b.reward - a.reward || a.risk - b.risk)[0]!;
  const { choices, correctIndex } = withAnswer(routes.map((route) => route.name), best.name);
  return {
    id: id(isAssessment ? 'route-assessment' : 'route-planner'),
    domain: 'planning',
    typeId: isAssessment ? 'route-assessment' : 'route-planner',
    typeName: isAssessment ? 'Route Check' : 'Route Planner',
    subtitle: 'Plan under constraints',
    difficulty,
    isAssessment,
    prompt: `Choose the highest reward route with time <= ${limit}. Break ties by lower risk.`,
    visual: {
      mode: 'rules',
      note: 'Routes',
      lines: routes.map((route) => `${route.name}: time ${route.time}, risk ${route.risk}, reward ${route.reward}`)
    },
    choices,
    correctIndex,
    explanation: `${best.name} is feasible and has the best reward under the time limit.`
  };
}

function resourceSchedule(difficulty: number): PuzzleRound {
  const tasks = [
    { name: 'Scan', time: 2, energy: 2, value: 3 },
    { name: 'Sort', time: 3, energy: 1, value: 4 },
    { name: 'Solve', time: 4, energy: 3, value: 7 },
    { name: 'Review', time: 2, energy: 1, value: 2 }
  ];
  const timeLimit = 6;
  const energyLimit = 4;
  const combos = [
    ['Scan', 'Sort'],
    ['Sort', 'Solve'],
    ['Scan', 'Review', 'Sort'],
    ['Solve', 'Review']
  ];
  const scoreCombo = (combo: string[]) => combo.reduce(
    (sum, name) => {
      const task = tasks.find((item) => item.name === name)!;
      return { time: sum.time + task.time, energy: sum.energy + task.energy, value: sum.value + task.value };
    },
    { time: 0, energy: 0, value: 0 }
  );
  const best = combos
    .map((combo) => ({ combo, score: scoreCombo(combo) }))
    .filter((item) => item.score.time <= timeLimit && item.score.energy <= energyLimit)
    .sort((a, b) => b.score.value - a.score.value)[0]!;
  const answer = best.combo.join(' + ');
  const { choices, correctIndex } = withAnswer(combos.map((combo) => combo.join(' + ')), answer);
  return {
    id: id('resource-schedule'),
    domain: 'planning',
    typeId: 'resource-schedule',
    typeName: 'Resource Schedule',
    subtitle: 'Working through tradeoffs',
    difficulty,
    isAssessment: false,
    prompt: `Maximize value with time <= ${timeLimit} and energy <= ${energyLimit}.`,
    visual: {
      mode: 'rules',
      note: 'Tasks',
      lines: tasks.map((task) => `${task.name}: time ${task.time}, energy ${task.energy}, value ${task.value}`)
    },
    choices,
    correctIndex,
    explanation: `${answer} fits both budgets and gives the highest listed value.`
  };
}

function towerMoves(difficulty: number): PuzzleRound {
  const answer = 'Small -> middle, large -> goal, small -> goal';
  const { choices, correctIndex } = withAnswer(
    ['Large -> goal, small -> goal, small -> middle', 'Small -> goal, large -> middle, small -> goal', 'Large -> middle, small -> goal, large -> goal'],
    answer
  );
  return {
    id: id('tower-moves'),
    domain: 'planning',
    typeId: 'tower-moves',
    typeName: 'Tower Moves',
    subtitle: 'Sequential planning',
    difficulty,
    isAssessment: false,
    prompt: 'Which move plan transfers the stack legally?',
    visual: { mode: 'rules', note: 'Start', lines: ['Start peg: small on large', 'Middle peg: empty', 'Goal peg: empty'] },
    choices,
    correctIndex,
    explanation: 'Move the small piece out of the way, move the large piece, then place the small piece on top.'
  };
}

function weighingPuzzle(difficulty: number): PuzzleRound {
  const answer = 'Coin 3';
  const { choices, correctIndex } = withAnswer(['Coin 1', 'Coin 2', 'Coin 4'], answer);
  return {
    id: id('weighing-puzzle'),
    domain: 'planning',
    typeId: 'weighing-puzzle',
    typeName: 'Weighing Puzzle',
    subtitle: 'Classic balance-scale deduction',
    difficulty,
    isAssessment: false,
    prompt: 'One coin is heavy. Use the weighings to identify it.',
    visual: {
      mode: 'rules',
      note: 'Weighings',
      lines: ['1 + 2 balances 4 + 5.', '1 + 3 is heavier than 2 + 4.', 'Only one coin is heavy; all others are normal.']
    },
    choices,
    correctIndex,
    explanation: 'The first weighing rules out 1, 2, 4, and 5 as uniquely heavy. The second can only be explained by coin 3 being heavy.',
    source: {
      title: publicDomainSources.dudeneyAmusements.title,
      url: publicDomainSources.dudeneyAmusements.url,
      note: 'Adapted from public-domain weighing/balance puzzle formats.'
    }
  };
}

function riverCrossingPlan(difficulty: number): PuzzleRound {
  const answer = 'Guard takes A, returns, takes B, returns, takes C';
  const { choices, correctIndex } = withAnswer(
    ['Guard takes A, takes B, takes C', 'A crosses alone, then B, then C', 'Guard takes A and B, returns, takes C'],
    answer
  );
  return {
    id: id('river-crossing-plan'),
    domain: 'planning',
    typeId: 'river-crossing-plan',
    typeName: 'River Plan',
    subtitle: 'Sequential constraint planning',
    difficulty,
    isAssessment: false,
    prompt: 'Only the guard can row. Boat holds guard plus one passenger. Which plan moves A, B, C across?',
    visual: { mode: 'rules', note: 'Rules', lines: ['Boat requires the guard.', 'Boat holds at most 2 people.', 'All passengers must end on the far side.'] },
    choices,
    correctIndex,
    explanation: 'The guard must shuttle each passenger one at a time, returning after A and B before taking C.',
    source: {
      title: publicDomainSources.dudeneyAmusements.title,
      url: publicDomainSources.dudeneyAmusements.url,
      note: 'Adapted from public-domain river-crossing puzzle formats.'
    }
  };
}

function equationSystem(difficulty: number, isAssessment = false): PuzzleRound {
  const x = 2 + Math.floor(Math.random() * 5);
  const y = 1 + Math.floor(Math.random() * 4);
  const sum = x + y;
  const diff = x - y;
  const answer = String(x);
  const { choices, correctIndex } = withAnswer([String(y), String(sum), String(diff + y)], answer);
  return {
    id: id(isAssessment ? 'equation-check' : 'equation-system'),
    domain: 'quantitative',
    typeId: isAssessment ? 'equation-check' : 'equation-system',
    typeName: isAssessment ? 'Equation Check' : 'Equation System',
    subtitle: 'Symbolic numerical reasoning',
    difficulty,
    isAssessment,
    prompt: 'Solve for X.',
    visual: { mode: 'rules', note: 'Equations', lines: [`X + Y = ${sum}`, `X - Y = ${diff}`] },
    choices,
    correctIndex,
    explanation: `Adding the equations gives 2X = ${sum + diff}, so X = ${x}.`,
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain algebraic recreation formats.'
    }
  };
}

function ratioPuzzle(difficulty: number): PuzzleRound {
  const a = 2 + Math.floor(Math.random() * 3);
  const b = a + 1;
  const total = (a + b) * 3;
  const answer = String(b * 3);
  const { choices, correctIndex } = withAnswer([String(a * 3), String(total - b), String(b * 2)], answer);
  return {
    id: id('ratio-puzzle'),
    domain: 'quantitative',
    typeId: 'ratio-puzzle',
    typeName: 'Ratio Split',
    subtitle: 'Proportional reasoning',
    difficulty,
    isAssessment: false,
    prompt: `A:B = ${a}:${b}. If total is ${total}, what is B?`,
    visual: { mode: 'statement', note: `${a} parts + ${b} parts = ${total}` },
    choices,
    correctIndex,
    explanation: `There are ${a + b} parts; each is ${total / (a + b)}, so B is ${b} parts = ${answer}.`,
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain proportion puzzle formats.'
    }
  };
}

function symbolicPattern(difficulty: number): PuzzleRound {
  const rules = [
    { symbol: 'triangle', value: 3 },
    { symbol: 'circle', value: 2 },
    { symbol: 'square', value: 4 }
  ];
  const answer = String(rules[0]!.value * rules[1]!.value + rules[2]!.value);
  const { choices, correctIndex } = withAnswer([String(Number(answer) + 2), String(Number(answer) - 1), String(rules[0]!.value + rules[1]!.value + rules[2]!.value)], answer);
  return {
    id: id('symbolic-pattern'),
    domain: 'quantitative',
    typeId: 'symbolic-pattern',
    typeName: 'Symbolic Pattern',
    subtitle: 'Rule mapping and calculation',
    difficulty,
    isAssessment: false,
    prompt: 'Use the symbol values to calculate triangle x circle + square.',
    visual: { mode: 'rules', note: 'Values', lines: rules.map((rule) => `${rule.symbol} = ${rule.value}`) },
    choices,
    correctIndex,
    explanation: `3 x 2 + 4 = ${answer}.`,
    source: {
      title: publicDomainSources.dudeneyAmusements.title,
      url: publicDomainSources.dudeneyAmusements.url,
      note: 'Adapted from public-domain symbolic arithmetic puzzle formats.'
    }
  };
}

function seatingDeduction(difficulty: number): PuzzleRound {
  const arrangement = ['Eli', 'Dev', 'Ari', 'Bea', 'Cy'];
  const answer = 'Ari';
  const { choices, correctIndex } = withAnswer(['Eli', 'Dev', 'Bea', 'Cy'], answer);
  return {
    id: id('seating-deduction'),
    domain: 'planning',
    typeId: 'seating-deduction',
    typeName: 'Seating Deduction',
    subtitle: 'CAT-style ordering puzzle',
    difficulty,
    isAssessment: false,
    prompt: 'Five people sit in a row. Who is in the middle?',
    visual: {
      mode: 'rules',
      note: 'Clues',
      lines: [
        'Eli is at the far left.',
        'Dev sits immediately to the right of Eli.',
        'Bea sits immediately to the left of Cy.',
        'Ari is not at either end.',
        'Only one arrangement satisfies all clues.'
      ]
    },
    choices,
    correctIndex,
    explanation: `The only valid order is ${arrangement.join(' - ')}, so Ari is in the middle.`,
    source: {
      title: publicDomainSources.dudeneyCanterbury.title,
      url: publicDomainSources.dudeneyCanterbury.url,
      note: 'Adapted from public-domain arrangement/logic puzzle formats.'
    }
  };
}

function suspectDeduction(difficulty: number): PuzzleRound {
  const answer = 'Nora';
  const { choices, correctIndex } = withAnswer(['Omar', 'Pia', 'Quinn'], answer);
  return {
    id: id('suspect-deduction'),
    domain: 'reasoning',
    typeId: 'suspect-deduction',
    typeName: 'Suspect Deduction',
    subtitle: 'Constraint satisfaction with testimony',
    difficulty,
    isAssessment: false,
    prompt: 'Exactly one statement is false. Who took the key?',
    visual: {
      mode: 'rules',
      note: 'Statements',
      lines: [
        'Pia: Quinn did not take it.',
        'Omar: Nora took it.',
        'Omar: Pia did not take it.',
        'Quinn: Quinn took it.'
      ]
    },
    choices,
    correctIndex,
    explanation: 'If Nora took it, only one statement is false. Other suspects make more than one statement false.',
    source: {
      title: publicDomainSources.dudeneyCanterbury.title,
      url: publicDomainSources.dudeneyCanterbury.url,
      note: 'Adapted from public-domain truth-teller/liar puzzle formats.'
    }
  };
}

function dataSufficiency(difficulty: number): PuzzleRound {
  const { choices, correctIndex } = withAnswer(['I alone only', 'II alone only', 'Together only'], 'Each alone is sufficient');
  return {
    id: id('data-sufficiency'),
    domain: 'quantitative',
    typeId: 'data-sufficiency',
    typeName: 'Data Sufficiency',
    subtitle: 'GMAT-style sufficiency judgment',
    difficulty,
    isAssessment: false,
    prompt: 'Can you determine X?',
    visual: {
      mode: 'rules',
      note: 'Problem',
      lines: ['Stem: X + Y = 10.', 'I. X - Y = 2.', 'II. Y = 4.']
    },
    choices,
    correctIndex,
    explanation: 'I with the stem gives X=6. II with the stem also gives X=6. Each alone is sufficient.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Data-sufficiency presentation with public-domain algebra content.'
    }
  };
}

function criticalAssumption(difficulty: number): PuzzleRound {
  const answer = 'The delay is mainly caused by review time.';
  const { choices, correctIndex } = withAnswer(
    ['More reviewers always improve quality.', 'Customers prefer slower releases.', 'The team can hire immediately.'],
    answer
  );
  return {
    id: id('critical-assumption'),
    domain: 'language',
    typeId: 'critical-assumption',
    typeName: 'Critical Assumption',
    subtitle: 'Argument reasoning',
    difficulty,
    isAssessment: false,
    prompt: 'Which assumption does the argument need?',
    visual: {
      mode: 'rules',
      note: 'Argument',
      lines: [
        'A team wants faster releases.',
        'It plans to cut review steps in half.',
        'Therefore releases will become faster without changing team size.'
      ]
    },
    choices,
    correctIndex,
    explanation: 'The plan only supports the conclusion if review time is the main bottleneck.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Argument structure is app-authored; included in validation bank.'
    }
  };
}

function workRate(difficulty: number): PuzzleRound {
  const answer = '6 hours';
  const { choices, correctIndex } = withAnswer(['5 hours', '8 hours', '10 hours'], answer);
  return {
    id: id('work-rate'),
    domain: 'quantitative',
    typeId: 'work-rate',
    typeName: 'Work Rate',
    subtitle: 'CAT/GMAT rate reasoning',
    difficulty,
    isAssessment: false,
    prompt: 'A can finish in 10h, B in 15h. Together?',
    visual: { mode: 'rules', note: 'Rates', lines: ['A rate = 1/10 job per hour.', 'B rate = 1/15 job per hour.', 'Combined time = 1 / combined rate.'] },
    choices,
    correctIndex,
    explanation: '1/10 + 1/15 = 5/30 = 1/6 job per hour, so together they take 6 hours.',
    source: {
      title: publicDomainSources.dudeneyAmusements.title,
      url: publicDomainSources.dudeneyAmusements.url,
      note: 'Adapted from public-domain work-rate arithmetic formats.'
    }
  };
}

function mixturePuzzle(difficulty: number): PuzzleRound {
  const answer = '30%';
  const { choices, correctIndex } = withAnswer(['25%', '35%', '40%'], answer);
  return {
    id: id('mixture-puzzle'),
    domain: 'quantitative',
    typeId: 'mixture-puzzle',
    typeName: 'Mixture',
    subtitle: 'Weighted average reasoning',
    difficulty,
    isAssessment: false,
    prompt: 'Mix equal amounts of 20% and 40% solution. Result?',
    visual: { mode: 'rules', note: 'Mixture', lines: ['Equal amounts mean simple average.', '(20 + 40) / 2'] },
    choices,
    correctIndex,
    explanation: 'With equal quantities, the concentration is the average: 30%.',
    source: {
      title: publicDomainSources.dudeneyAmusements.title,
      url: publicDomainSources.dudeneyAmusements.url,
      note: 'Adapted from public-domain mixture/average puzzle formats.'
    }
  };
}

function crypticClue(difficulty: number): PuzzleRound {
  const answer = 'listen';
  const { choices, correctIndex } = withAnswer(['silent', 'enlist', 'inlets'], answer);
  return {
    id: id('cryptic-clue'),
    domain: 'language',
    typeId: 'cryptic-clue',
    typeName: 'Cryptic Clue',
    subtitle: 'Crossword-style wordplay',
    difficulty,
    isAssessment: false,
    prompt: 'Solve the clue.',
    visual: { mode: 'rules', note: 'Clue', lines: ['Pay attention: anagram of ENLIST.', 'Meaning: hear carefully.'] },
    choices,
    correctIndex,
    explanation: 'LISTEN is an anagram of ENLIST and means to hear carefully.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain anagram/wordplay formats.'
    }
  };
}

function truthCountDeduction(difficulty: number): PuzzleRound {
  const answer = 'Kai';
  const { choices, correctIndex } = withAnswer(['Iva', 'Jae', 'No one can be determined'], answer);
  return {
    id: id('truth-count-deduction'),
    domain: 'reasoning',
    typeId: 'truth-count-deduction',
    typeName: 'Truth Count',
    subtitle: 'Truth-table deduction',
    difficulty,
    isAssessment: false,
    prompt: 'Exactly two statements are true. Who has the map?',
    visual: {
      mode: 'rules',
      note: 'Statements',
      lines: ['Iva: Jae has the map.', 'Jae: Kai has the map.', 'Kai: Jae does not have the map.']
    },
    choices,
    correctIndex,
    explanation: 'If Kai has the map, Jae and Kai speak truthfully while Iva is false. That is exactly two true statements.',
    source: {
      title: publicDomainSources.dudeneyCanterbury.title,
      url: publicDomainSources.dudeneyCanterbury.url,
      note: 'Adapted from public-domain truth-count logic puzzle formats.'
    }
  };
}

function rankDeduction(difficulty: number): PuzzleRound {
  const answer = 'Milo';
  const { choices, correctIndex } = withAnswer(['Luna', 'Nia', 'Oren'], answer);
  return {
    id: id('rank-deduction'),
    domain: 'reasoning',
    typeId: 'rank-deduction',
    typeName: 'Rank Deduction',
    subtitle: 'Ordering with adjacency constraints',
    difficulty,
    isAssessment: false,
    prompt: 'Four runners finished 1st to 4th. Who finished 2nd?',
    visual: {
      mode: 'rules',
      note: 'Clues',
      lines: ['Nia finished immediately before Oren.', 'Luna finished before Milo.', 'Milo did not finish 4th.']
    },
    choices,
    correctIndex,
    explanation: 'Nia-Oren cannot be 1-2 or 2-3, because Luna must be before Milo and Milo cannot be 4th. The order is Luna, Milo, Nia, Oren.',
    source: {
      title: publicDomainSources.dudeneyCanterbury.title,
      url: publicDomainSources.dudeneyCanterbury.url,
      note: 'Adapted from public-domain ordering puzzle formats.'
    }
  };
}

function implicationChain(difficulty: number): PuzzleRound {
  const answer = 'A and B are both false';
  const { choices, correctIndex } = withAnswer(['A is true', 'B is true', 'C must be true'], answer);
  return {
    id: id('implication-chain'),
    domain: 'reasoning',
    typeId: 'implication-chain',
    typeName: 'Implication Chain',
    subtitle: 'Formal logic via contrapositive',
    difficulty,
    isAssessment: false,
    prompt: 'What must follow?',
    visual: {
      mode: 'rules',
      note: 'Rules',
      lines: ['If A is true, then B is true.', 'If B is true, then C is true.', 'C is false.']
    },
    choices,
    correctIndex,
    explanation: 'Since C is false, B cannot be true. Since B is false, A cannot be true.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Formal implication structure adapted from public-domain logic puzzle forms.'
    }
  };
}

function setLogic(difficulty: number): PuzzleRound {
  const answer = 'Some non-striped cards exist.';
  const { choices, correctIndex } = withAnswer(['All squares are red.', 'Some striped cards are red.', 'No red cards exist.'], answer);
  return {
    id: id('set-logic'),
    domain: 'reasoning',
    typeId: 'set-logic',
    typeName: 'Set Logic',
    subtitle: 'Syllogistic inclusion reasoning',
    difficulty,
    isAssessment: false,
    prompt: 'Which conclusion must be true?',
    visual: {
      mode: 'rules',
      note: 'Facts',
      lines: ['All red cards are squares.', 'No squares are striped.', 'At least one red card exists.']
    },
    choices,
    correctIndex,
    explanation: 'A red card exists; every red card is a square; no square is striped. Therefore at least one non-striped card exists.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain syllogism and set-reasoning formats.'
    }
  };
}

function dependencyPlan(difficulty: number): PuzzleRound {
  const answer = '7 days';
  const { choices, correctIndex } = withAnswer(['6 days', '8 days', '10 days'], answer);
  return {
    id: id('dependency-plan'),
    domain: 'planning',
    typeId: 'dependency-plan',
    typeName: 'Dependency Plan',
    subtitle: 'Critical path scheduling',
    difficulty,
    isAssessment: false,
    prompt: 'What is the earliest completion time?',
    visual: {
      mode: 'rules',
      note: 'Tasks',
      lines: ['A takes 2 days.', 'B takes 3 days after A.', 'C takes 4 days after A.', 'D takes 1 day after both B and C.']
    },
    choices,
    correctIndex,
    explanation: 'A finishes at day 2. B finishes at day 5, C at day 6, so D can finish at day 7.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain scheduling and route-planning puzzle formats.'
    }
  };
}

function valuePacking(difficulty: number): PuzzleRound {
  const answer = 'Map + Rope + Lamp';
  const { choices, correctIndex } = withAnswer(['Map + Kit', 'Rope + Lamp', 'Kit + Lamp'], answer);
  return {
    id: id('value-packing'),
    domain: 'planning',
    typeId: 'value-packing',
    typeName: 'Value Packing',
    subtitle: 'Capacity-constrained optimization',
    difficulty,
    isAssessment: false,
    prompt: 'Capacity is 6. Which pack gives the highest value?',
    visual: {
      mode: 'rules',
      note: 'Items',
      lines: ['Map: weight 2, value 5', 'Rope: weight 3, value 7', 'Kit: weight 4, value 8', 'Lamp: weight 1, value 2']
    },
    choices,
    correctIndex,
    explanation: 'Map + Rope + Lamp has weight 6 and value 14, beating Map + Kit at value 13.',
    source: {
      title: publicDomainSources.dudeneyAmusements.title,
      url: publicDomainSources.dudeneyAmusements.url,
      note: 'Adapted from public-domain optimization and packing puzzle formats.'
    }
  };
}

function validSchedule(difficulty: number): PuzzleRound {
  const answer = 'Draft, Data, Review, Call, Send';
  const { choices, correctIndex } = withAnswer(['Call, Draft, Data, Review, Send', 'Draft, Review, Data, Call, Send', 'Draft, Data, Send, Review, Call'], answer);
  return {
    id: id('valid-schedule'),
    domain: 'planning',
    typeId: 'valid-schedule',
    typeName: 'Valid Schedule',
    subtitle: 'Multi-constraint ordering',
    difficulty,
    isAssessment: false,
    prompt: 'Which schedule obeys every rule?',
    visual: {
      mode: 'rules',
      note: 'Rules',
      lines: ['Draft before Review.', 'Data before Review.', 'Review before Send.', 'Call is not first and happens before Send.']
    },
    choices,
    correctIndex,
    explanation: 'Draft and Data both precede Review, Review precedes Send, and Call is not first but still before Send.',
    source: {
      title: publicDomainSources.dudeneyCanterbury.title,
      url: publicDomainSources.dudeneyCanterbury.url,
      note: 'Adapted from public-domain ordering and itinerary puzzle formats.'
    }
  };
}

function bottleneckPlan(difficulty: number): PuzzleRound {
  const answer = 'Test';
  const { choices, correctIndex } = withAnswer(['Design', 'Build', 'Deploy'], answer);
  return {
    id: id('bottleneck-plan'),
    domain: 'planning',
    typeId: 'bottleneck-plan',
    typeName: 'Bottleneck Plan',
    subtitle: 'Resource bottleneck analysis',
    difficulty,
    isAssessment: false,
    prompt: 'Which task should be shortened to reduce the total project time?',
    visual: {
      mode: 'rules',
      note: 'Project',
      lines: ['Design: 2 days, then Build and Test can start.', 'Build: 3 days after Design.', 'Test: 5 days after Design.', 'Deploy: 1 day after both Build and Test.']
    },
    choices,
    correctIndex,
    explanation: 'After Design, Test takes longer than Build and delays Deploy. Shortening Test shortens the critical path.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain scheduling and critical-path puzzle formats.'
    }
  };
}

function longCaseDeduction(difficulty: number): PuzzleRound {
  const answer = 'Nia in Lab 2 on Tuesday';
  const { choices, correctIndex } = withAnswer(['Omar in Lab 2 on Tuesday', 'Pia in Lab 2 on Wednesday', 'Ravi in Lab 4 on Tuesday'], answer);
  return {
    id: id('long-case-deduction'),
    domain: 'planning',
    typeId: 'long-case-deduction',
    typeName: 'Long Case',
    subtitle: 'Long-form multi-step deduction',
    difficulty,
    isAssessment: false,
    prompt: 'Which assignment is forced?',
    visual: {
      mode: 'rules',
      note: 'Research slots',
      lines: [
        'Four people: Nia, Omar, Pia, Ravi.',
        'Labs: Lab 1, Lab 2, Lab 3, Lab 4. Days: Monday, Tuesday, Wednesday, Thursday.',
        'Nia is not in Lab 1 or Lab 4.',
        'The Lab 2 person works exactly one day after Omar.',
        'Pia works on Wednesday and is not in Lab 2.',
        'Ravi works on Thursday.',
        'Omar is in Lab 1.'
      ]
    },
    choices,
    correctIndex,
    explanation: 'Omar is Monday in Lab 1. The Lab 2 person works one day after Omar, so Lab 2 is Tuesday. Nia cannot be Lab 1 or Lab 4, and Pia is Wednesday, Ravi is Thursday, so Nia is Lab 2 on Tuesday.',
    source: {
      title: publicDomainSources.dudeneyCanterbury.title,
      url: publicDomainSources.dudeneyCanterbury.url,
      note: 'Adapted from public-domain arrangement puzzle formats.'
    }
  };
}

function speedDistance(difficulty: number): PuzzleRound {
  const answer = '2.5 hours';
  const { choices, correctIndex } = withAnswer(['2 hours', '3 hours', '4 hours'], answer);
  return {
    id: id('speed-distance'),
    domain: 'quantitative',
    typeId: 'speed-distance',
    typeName: 'Speed Distance',
    subtitle: 'Relative speed reasoning',
    difficulty,
    isAssessment: false,
    prompt: 'Two trains start 250 km apart and move toward each other at 60 and 40 km/h. When do they meet?',
    visual: { mode: 'statement', note: 'Closing speed = 60 + 40' },
    choices,
    correctIndex,
    explanation: 'Their closing speed is 100 km/h, so 250 / 100 = 2.5 hours.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain relative-speed arithmetic formats.'
    }
  };
}

function probabilityDraw(difficulty: number): PuzzleRound {
  const answer = '3/5';
  const { choices, correctIndex } = withAnswer(['2/5', '1/2', '3/10'], answer);
  return {
    id: id('probability-draw'),
    domain: 'quantitative',
    typeId: 'probability-draw',
    typeName: 'Probability Draw',
    subtitle: 'Combinatorics under no replacement',
    difficulty,
    isAssessment: false,
    prompt: 'A bag has 3 red and 2 blue balls. Draw 2 without replacement. Probability of exactly one blue?',
    visual: { mode: 'rules', note: 'Count', lines: ['Favorable pairs: 3 red x 2 blue = 6', 'Total pairs: C(5,2) = 10'] },
    choices,
    correctIndex,
    explanation: 'There are 6 favorable pairs out of 10 possible pairs, so the probability is 3/5.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain counting and probability puzzle formats.'
    }
  };
}

function remainderSystem(difficulty: number): PuzzleRound {
  const answer = '17';
  const { choices, correctIndex } = withAnswer(['12', '22', '31'], answer);
  return {
    id: id('remainder-system'),
    domain: 'quantitative',
    typeId: 'remainder-system',
    typeName: 'Remainder System',
    subtitle: 'Modular arithmetic',
    difficulty,
    isAssessment: false,
    prompt: 'Find the smallest positive N: N leaves remainder 2 by 5 and remainder 3 by 7.',
    visual: { mode: 'rules', note: 'Conditions', lines: ['N = 5k + 2', 'N = 7m + 3'] },
    choices,
    correctIndex,
    explanation: '17 leaves remainder 2 when divided by 5 and remainder 3 when divided by 7.',
    source: {
      title: publicDomainSources.dudeneyAmusements.title,
      url: publicDomainSources.dudeneyAmusements.url,
      note: 'Adapted from public-domain number theory puzzle formats.'
    }
  };
}

function profitDiscount(difficulty: number): PuzzleRound {
  const answer = '12.5%';
  const { choices, correctIndex } = withAnswer(['10%', '15%', '20%'], answer);
  return {
    id: id('profit-discount'),
    domain: 'quantitative',
    typeId: 'profit-discount',
    typeName: 'Profit Discount',
    subtitle: 'Percent change reasoning',
    difficulty,
    isAssessment: false,
    prompt: 'Cost is 80. Marked up 25%, then discounted 10%. Profit percent?',
    visual: { mode: 'rules', note: 'Steps', lines: ['Marked price = 80 x 1.25 = 100', 'Selling price = 100 x 0.90 = 90'] },
    choices,
    correctIndex,
    explanation: 'Profit is 10 on cost 80, so profit percent is 10/80 = 12.5%.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain commercial arithmetic formats.'
    }
  };
}

function overlappingSets(difficulty: number): PuzzleRound {
  const answer = '10';
  const { choices, correctIndex } = withAnswer(['8', '12', '14'], answer);
  return {
    id: id('overlapping-sets'),
    domain: 'quantitative',
    typeId: 'overlapping-sets',
    typeName: 'Overlapping Sets',
    subtitle: 'Venn diagram reasoning',
    difficulty,
    isAssessment: false,
    prompt: '40 students: 24 take math, 18 take chess, 8 take neither. How many take both?',
    visual: { mode: 'rules', note: 'Sets', lines: ['At least one = 40 - 8 = 32', 'Math + Chess - Both = 32'] },
    choices,
    correctIndex,
    explanation: 'Both = 24 + 18 - 32 = 10.',
    source: {
      title: publicDomainSources.classicRecreations.title,
      url: publicDomainSources.classicRecreations.url,
      note: 'Adapted from public-domain inclusion-exclusion puzzle formats.'
    }
  };
}

export const trainingGeneratorEntries: Record<CognitiveDomain, GeneratorEntry[]> = {
  processingSpeed: [
    { typeId: 'speed-match', typeName: 'Speed Match', generator: speedMatch, complexity: 'Core' },
    { typeId: 'peripheral-catch', typeName: 'Peripheral Catch', generator: peripheralCatch, complexity: 'Core' },
    { typeId: 'pattern-flash', typeName: 'Pattern Flash', generator: patternFlash, complexity: 'Core' },
    { typeId: 'color-rush', typeName: 'Color Rush', generator: colorRush, complexity: 'Core' },
    { typeId: 'symbol-scan', typeName: 'Symbol Scan', generator: symbolScan, complexity: 'Core' }
  ],
  workingMemory: [
    { typeId: 'sequence-recall', typeName: 'Sequence Recall', generator: sequenceRecall, complexity: 'Core' },
    { typeId: 'number-chain', typeName: 'Number Chain', generator: numberChain, complexity: 'Core' },
    { typeId: 'dual-track', typeName: 'Dual Track', generator: dualTrack, complexity: 'Hard' },
    { typeId: 'memory-grid', typeName: 'Memory Grid', generator: memoryGrid, complexity: 'Core' },
    { typeId: 'operation-span', typeName: 'Operation Span', generator: operationSpan, complexity: 'Hard' },
    { typeId: 'delayed-recall', typeName: 'Delayed Recall', generator: delayedRecall, complexity: 'Hard' }
  ],
  attention: [
    { typeId: 'color-word', typeName: 'Color Word', generator: colorWord, complexity: 'Core' },
    { typeId: 'focus-fire', typeName: 'Focus Fire', generator: focusFire, complexity: 'Core' },
    { typeId: 'stop-signal', typeName: 'Stop Signal', generator: stopSignal, complexity: 'Core' },
    { typeId: 'odd-pulse', typeName: 'Odd Pulse', generator: oddPulse, complexity: 'Core' },
    { typeId: 'conflict-grid', typeName: 'Conflict Grid', generator: conflictGrid, complexity: 'Hard' },
    { typeId: 'noise-filter', typeName: 'Noise Filter', generator: noiseFilter, complexity: 'Hard' }
  ],
  flexibility: [
    { typeId: 'rule-flip', typeName: 'Rule Flip', generator: ruleFlip, complexity: 'Core' },
    { typeId: 'trail-blaze', typeName: 'Trail Blaze', generator: trailBlaze, complexity: 'Core' },
    { typeId: 'switch-math', typeName: 'Switch Math', generator: switchMath, complexity: 'Core' },
    { typeId: 'category-swap', typeName: 'Category Swap', generator: categorySwap, complexity: 'Core' },
    { typeId: 'rule-cascade', typeName: 'Rule Cascade', generator: ruleCascade, complexity: 'Hard' }
  ],
  reasoning: [
    { typeId: 'next-in-line', typeName: 'Next in Line', generator: nextInLine, complexity: 'Core' },
    { typeId: 'interleaved-sequence', typeName: 'Interleaved Sequence', generator: interleavedSequence, complexity: 'Hard' },
    { typeId: 'matrix-pick', typeName: 'Matrix Pick', generator: matrixPick, complexity: 'Core' },
    { typeId: 'odd-one-out', typeName: 'Odd One Out', generator: oddOneOut, complexity: 'Core' },
    { typeId: 'logic-lock', typeName: 'Logic Lock', generator: logicLock, complexity: 'Hard' },
    { typeId: 'balance-code', typeName: 'Balance Code', generator: balanceCode, complexity: 'Hard' },
    { typeId: 'logic-grid', typeName: 'Logic Grid', generator: logicGrid, complexity: 'Hard' },
    { typeId: 'conditional-syllogism', typeName: 'Conditional Chain', generator: conditionalSyllogism, complexity: 'Hard' },
    { typeId: 'spatial-transform', typeName: 'Spatial Transform', generator: spatialTransform, complexity: 'Hard' },
    { typeId: 'suspect-deduction', typeName: 'Suspect Deduction', generator: suspectDeduction, complexity: 'Hard' },
    { typeId: 'truth-count-deduction', typeName: 'Truth Count', generator: truthCountDeduction, complexity: 'Hard' },
    { typeId: 'rank-deduction', typeName: 'Rank Deduction', generator: rankDeduction, complexity: 'Hard' },
    { typeId: 'implication-chain', typeName: 'Implication Chain', generator: implicationChain, complexity: 'Hard' },
    { typeId: 'set-logic', typeName: 'Set Logic', generator: setLogic, complexity: 'Hard' }
  ],
  language: [
    { typeId: 'word-scramble', typeName: 'Word Scramble', generator: wordScramble, complexity: 'Core' },
    { typeId: 'quick-clue', typeName: 'Quick Clue', generator: quickClue, complexity: 'Core' },
    { typeId: 'letter-flow', typeName: 'Letter Flow', generator: letterFlow, complexity: 'Core' },
    { typeId: 'word-chain', typeName: 'Word Chain', generator: wordChain, complexity: 'Core' },
    { typeId: 'verbal-analogy', typeName: 'Verbal Analogy', generator: verbalAnalogy, complexity: 'Hard' },
    { typeId: 'constraint-clue', typeName: 'Constraint Clue', generator: constraintClue, complexity: 'Hard' },
    { typeId: 'critical-assumption', typeName: 'Critical Assumption', generator: criticalAssumption, complexity: 'Hard' },
    { typeId: 'cryptic-clue', typeName: 'Cryptic Clue', generator: crypticClue, complexity: 'Hard' }
  ],
  planning: [
    { typeId: 'route-planner', typeName: 'Route Planner', generator: routePlanner, complexity: 'Core' },
    { typeId: 'resource-schedule', typeName: 'Resource Schedule', generator: resourceSchedule, complexity: 'Hard' },
    { typeId: 'tower-moves', typeName: 'Tower Moves', generator: towerMoves, complexity: 'Core' },
    { typeId: 'planning-grid', typeName: 'Planning Grid', generator: planningGrid, complexity: 'Hard' },
    { typeId: 'seating-deduction', typeName: 'Seating Deduction', generator: seatingDeduction, complexity: 'Hard' },
    { typeId: 'weighing-puzzle', typeName: 'Weighing Puzzle', generator: weighingPuzzle, complexity: 'Hard' },
    { typeId: 'river-crossing-plan', typeName: 'River Plan', generator: riverCrossingPlan, complexity: 'Hard' },
    { typeId: 'dependency-plan', typeName: 'Dependency Plan', generator: dependencyPlan, complexity: 'Hard' },
    { typeId: 'value-packing', typeName: 'Value Packing', generator: valuePacking, complexity: 'Hard' },
    { typeId: 'valid-schedule', typeName: 'Valid Schedule', generator: validSchedule, complexity: 'Hard' },
    { typeId: 'bottleneck-plan', typeName: 'Bottleneck Plan', generator: bottleneckPlan, complexity: 'Hard' },
    { typeId: 'long-case-deduction', typeName: 'Long Case', generator: longCaseDeduction, complexity: 'Hard' }
  ],
  quantitative: [
    { typeId: 'equation-system', typeName: 'Equation System', generator: equationSystem, complexity: 'Core' },
    { typeId: 'ratio-puzzle', typeName: 'Ratio Split', generator: ratioPuzzle, complexity: 'Core' },
    { typeId: 'symbolic-pattern', typeName: 'Symbolic Pattern', generator: symbolicPattern, complexity: 'Hard' },
    { typeId: 'quant-balance', typeName: 'Quant Balance', generator: quantitativeBalance, complexity: 'Hard' },
    { typeId: 'data-sufficiency', typeName: 'Data Sufficiency', generator: dataSufficiency, complexity: 'Hard' },
    { typeId: 'work-rate', typeName: 'Work Rate', generator: workRate, complexity: 'Hard' },
    { typeId: 'mixture-puzzle', typeName: 'Mixture', generator: mixturePuzzle, complexity: 'Core' },
    { typeId: 'speed-distance', typeName: 'Speed Distance', generator: speedDistance, complexity: 'Hard' },
    { typeId: 'probability-draw', typeName: 'Probability Draw', generator: probabilityDraw, complexity: 'Hard' },
    { typeId: 'remainder-system', typeName: 'Remainder System', generator: remainderSystem, complexity: 'Hard' },
    { typeId: 'profit-discount', typeName: 'Profit Discount', generator: profitDiscount, complexity: 'Hard' },
    { typeId: 'overlapping-sets', typeName: 'Overlapping Sets', generator: overlappingSets, complexity: 'Hard' }
  ]
};

export const trainingGenerators: Record<CognitiveDomain, Generator[]> = Object.fromEntries(
  domainIds.map((domain) => [domain, trainingGeneratorEntries[domain].map((entry) => entry.generator)])
) as Record<CognitiveDomain, Generator[]>;

export const allTrainingPuzzleTypeIds = domainIds.flatMap((domain) => trainingGeneratorEntries[domain].map((entry) => entry.typeId));

export const assessmentGenerators: Record<CognitiveDomain, Generator> = {
  processingSpeed: (difficulty) => speedMatch(difficulty, true),
  workingMemory: (difficulty) => sequenceRecall(difficulty, true),
  attention: (difficulty) => colorWord(difficulty, true),
  flexibility: (difficulty) => trailBlaze(difficulty, true),
  reasoning: grammaticalReasoning,
  language: (difficulty) => numberChain(difficulty, true),
  planning: (difficulty) => routePlanner(difficulty, true),
  quantitative: (difficulty) => equationSystem(difficulty, true)
};

export function generateTrainingPuzzle(domain: CognitiveDomain, difficulty: number, enabledPuzzleTypes = allTrainingPuzzleTypeIds) {
  const allowed = new Set(enabledPuzzleTypes);
  const generators = trainingGeneratorEntries[domain].filter((entry) => allowed.has(entry.typeId));
  return pick(generators.length ? generators : trainingGeneratorEntries[domain]).generator(difficulty, false);
}

export function generateAssessmentBattery(difficultyByDomain: Record<CognitiveDomain, number>) {
  return domainIds.map((domain) => assessmentGenerators[domain](difficultyByDomain[domain] ?? 5, true));
}

export function generateDailySession(
  difficultyByDomain: Record<CognitiveDomain, number>,
  count = 12,
  options?: { enabledDomains?: CognitiveDomain[]; enabledPuzzleTypes?: string[]; domainSequence?: CognitiveDomain[] }
) {
  const enabledDomainSet = new Set(options?.enabledDomains?.length ? options.enabledDomains : domainIds);
  const enabledTypeSet = new Set(options?.enabledPuzzleTypes?.length ? options.enabledPuzzleTypes : allTrainingPuzzleTypeIds);
  const allowedDomains = domainIds.filter((domain) => {
    if (!enabledDomainSet.has(domain)) return false;
    return trainingGeneratorEntries[domain].some((entry) => enabledTypeSet.has(entry.typeId));
  });
  const sequence = options?.domainSequence?.filter((domain) => allowedDomains.includes(domain));
  const domainsForSession = sequence?.length ? sequence : allowedDomains.length ? allowedDomains : options?.enabledDomains?.length ? options.enabledDomains : domainIds;
  const puzzles: PuzzleRound[] = [];
  for (let index = 0; index < count; index += 1) {
    const domain = domainsForSession[index % domainsForSession.length]!;
    puzzles.push(generateTrainingPuzzle(domain, difficultyByDomain[domain] ?? 5, [...enabledTypeSet]));
  }
  return shuffle(puzzles);
}
