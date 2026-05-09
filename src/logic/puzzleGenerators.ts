import { domainIds } from '../data/domains';
import type { CognitiveDomain, PuzzleRound, VisualToken } from '../types';

type Generator = (difficulty: number, isAssessment?: boolean) => PuzzleRound;

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
    visual: { mode: 'comparison', left, right, note: difficulty > 10 ? 'Brief exposure target' : undefined },
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
    visual: { mode: 'grid', tokens: shuffledTokens, columns: 4 },
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
    visual: { mode: 'tiles', tokens: stream.map((color) => token('', color.value)), columns: 6 },
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
    prompt: 'Which sequence matches the lit tiles?',
    visual: { mode: 'grid', tokens: hiddenTokens(9), columns: 3 },
    requiresReady: true,
    studyPrompt: 'Memorize the tile sequence. It will disappear.',
    studyVisual: { mode: 'grid', tokens: sequence.map((value) => token(value, '#2E6F95')), columns: 3 },
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
    visual: { mode: 'tiles', tokens: items.map((item) => token(item, item === 'circle' ? '#277A5B' : '#C8D0CC')), columns: items.length },
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
    visual: { mode: 'tiles', tokens: beats.map((beat) => token(beat === 'tap' ? 'TAP' : 'REST', beat === 'tap' ? '#277A5B' : '#D9B657')), columns: 4 },
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
    visual: { mode: 'grid', tokens: shuffledTokens, columns: 3 },
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
  const secondRule = item.color.name.length > 4 ? 'number' : firstRule === 'color' ? 'shape' : 'color';
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
    prompt: `If number is even use color, otherwise shape. Then if color name has more than 4 letters switch to number. What final label applies?`,
    visual: { mode: 'tiles', tokens: [token(`${item.number} ${item.shape}`, item.color.value)] },
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
  const first = pick(['mango', 'olive', 'eagle', 'lamp', 'pasta', 'anchor']);
  const last = first[first.length - 1]!;
  const pool = [...animals, ...foods, ...objects];
  const answer = pool.find((word) => word[0] === last && word !== first) ?? 'eagle';
  const { choices, correctIndex } = withAnswer(pool.filter((word) => word[0] !== last).slice(0, 6), answer);
  return {
    id: id('word-chain'),
    domain: 'language',
    typeId: 'word-chain',
    typeName: 'Word Chain',
    subtitle: 'Last-letter verbal sequencing',
    difficulty,
    isAssessment: false,
    prompt: `Continue the chain after "${first}".`,
    visual: { mode: 'statement', note: `${first} -> ?` },
    choices,
    correctIndex,
    explanation: `${answer} starts with ${last.toUpperCase()}, the last letter of ${first}.`
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
    prompt: `Choose the ${length}-letter word that contains "${mustContain}" and fits the clue: ${answer === 'planet' ? 'world' : answer === 'silver' ? 'metallic color' : answer === 'garden' ? 'place for plants' : answer === 'signal' ? 'meaningful sign' : answer === 'memory' ? 'stored recall' : answer === 'switch' ? 'change over' : answer === 'reason' ? 'logical cause' : 'attention target'}.`,
    visual: { mode: 'statement', note: `${length} letters / contains ${mustContain}` },
    choices,
    correctIndex,
    explanation: `${answer} satisfies the length, letter, and meaning constraints.`
  };
}

export const trainingGenerators: Record<CognitiveDomain, Generator[]> = {
  processingSpeed: [speedMatch, peripheralCatch, patternFlash, colorRush, symbolScan],
  workingMemory: [sequenceRecall, numberChain, dualTrack, memoryGrid, operationSpan],
  attention: [colorWord, focusFire, stopSignal, oddPulse, conflictGrid],
  flexibility: [ruleFlip, trailBlaze, switchMath, categorySwap, ruleCascade],
  reasoning: [nextInLine, interleavedSequence, matrixPick, oddOneOut, logicLock, balanceCode],
  language: [wordScramble, quickClue, letterFlow, wordChain, verbalAnalogy, constraintClue]
};

export const assessmentGenerators: Record<CognitiveDomain, Generator> = {
  processingSpeed: (difficulty) => speedMatch(difficulty, true),
  workingMemory: (difficulty) => sequenceRecall(difficulty, true),
  attention: (difficulty) => colorWord(difficulty, true),
  flexibility: (difficulty) => trailBlaze(difficulty, true),
  reasoning: grammaticalReasoning,
  language: (difficulty) => numberChain(difficulty, true)
};

export function generateTrainingPuzzle(domain: CognitiveDomain, difficulty: number) {
  return pick(trainingGenerators[domain])(difficulty, false);
}

export function generateAssessmentBattery(difficultyByDomain: Record<CognitiveDomain, number>) {
  return domainIds.map((domain) => assessmentGenerators[domain](difficultyByDomain[domain] ?? 5, true));
}

export function generateDailySession(difficultyByDomain: Record<CognitiveDomain, number>, count = 12) {
  const puzzles: PuzzleRound[] = [];
  for (let index = 0; index < count; index += 1) {
    const domain = domainIds[index % domainIds.length]!;
    puzzles.push(generateTrainingPuzzle(domain, difficultyByDomain[domain] ?? 5));
  }
  return shuffle(puzzles);
}
