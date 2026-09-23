// Audit-only deterministic probes for the real puzzle generators.
//
// This transpiles and executes src/logic/puzzleGenerators.ts itself. It does
// not copy generator logic into a test fixture, edit application state, or
// write application files. Math.random is replaced before every generated
// round so failures can be reproduced by type, level, and seed.
//
// Usage: node docs/audit/puzzle-generation-probes.cjs [--seeds 200]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const seedArg = process.argv.indexOf('--seeds');
const seedsPerLevel = seedArg >= 0 ? Number(process.argv[seedArg + 1]) : 200;
if (!Number.isInteger(seedsPerLevel) || seedsPerLevel < 1) {
  throw new Error('--seeds must be a positive integer');
}
const levels = Array.from({ length: 20 }, (_, index) => index + 1);

function hash32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

const auditMath = Object.create(Math);
const context = vm.createContext({ console, Math: auditMath });
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true
  } }).outputText;
  const localRequire = name => {
    if (!name.startsWith('.')) throw new Error(`Unmocked dependency ${name}`);
    const base = path.resolve(path.dirname(file), name);
    const target = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`]
      .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!target) throw new Error(`Cannot resolve ${name} from ${file}`);
    return load(target);
  };
  const wrapper = vm.runInContext(`(function(require,module,exports){${js}\n})`, context, { filename: file });
  wrapper(localRequire, mod, mod.exports);
  return mod.exports;
}

const generators = load(path.join(root, 'src/logic/puzzleGenerators.ts'));
const domains = Object.keys(generators.trainingGeneratorEntries);
const trainingEntries = domains.flatMap(domain => generators.trainingGeneratorEntries[domain].map(entry => ({ domain, ...entry })));
const assessmentEntries = domains.map(domain => ({ domain, typeId: `assessment:${domain}`, generator: generators.assessmentGenerators[domain] }));

function resetRandom(kind, domain, typeId, seed) {
  auditMath.random = mulberry32(hash32(`${kind}|${domain}|${typeId}|${seed}`));
}

function addCount(object, key, amount = 1) {
  object[key] = (object[key] || 0) + amount;
}

function newTypeStats(domain, registeredTypeId) {
  return {
    domain,
    registeredTypeId,
    rounds: 0,
    generatedTypeIds: {},
    choiceCounts: {},
    duplicateChoiceRounds: 0,
    schemaFailureRounds: 0,
    schemaIssues: {},
    keyIntegrityFailures: 0
  };
}

const requiredStrings = ['id', 'domain', 'typeId', 'typeName', 'subtitle', 'prompt', 'explanation'];
function inspectRound(round, expectedDomain, expectedDifficulty) {
  const issues = [];
  if (!round || typeof round !== 'object') return ['round:not-object'];
  for (const field of requiredStrings) {
    if (typeof round[field] !== 'string' || !round[field].length) issues.push(`${field}:nonempty-string`);
  }
  if (round.domain !== expectedDomain) issues.push('domain:mismatch');
  if (round.difficulty !== expectedDifficulty) issues.push('difficulty:mismatch');
  if (typeof round.isAssessment !== 'boolean') issues.push('isAssessment:boolean');
  if (!Array.isArray(round.choices) || round.choices.length < 2) issues.push('choices:array-min-2');
  if (Array.isArray(round.choices) && round.choices.some(choice => typeof choice !== 'string' || !choice.length)) issues.push('choices:nonempty-strings');
  if (!Number.isInteger(round.correctIndex) || round.correctIndex < 0 || round.correctIndex >= (round.choices?.length || 0)) issues.push('correctIndex:in-range');
  if (round.visual && !['tiles', 'grid', 'comparison', 'trail', 'statement', 'rules'].includes(round.visual.mode)) issues.push('visual:mode');
  if (round.studyVisual && !['tiles', 'grid', 'comparison', 'trail', 'statement', 'rules'].includes(round.studyVisual.mode)) issues.push('studyVisual:mode');
  return issues;
}

function answerOf(round) {
  return Number.isInteger(round.correctIndex) ? round.choices[round.correctIndex] : undefined;
}

function record(stats, round, expectedDifficulty) {
  stats.rounds += 1;
  addCount(stats.generatedTypeIds, round?.typeId ?? '<missing>');
  addCount(stats.choiceCounts, String(round?.choices?.length ?? -1));
  if (Array.isArray(round?.choices) && new Set(round.choices).size !== round.choices.length) stats.duplicateChoiceRounds += 1;
  const issues = inspectRound(round, stats.domain, expectedDifficulty);
  if (issues.length) stats.schemaFailureRounds += 1;
  for (const issue of issues) addCount(stats.schemaIssues, issue);
  if (!Array.isArray(round?.choices) || answerOf(round) === undefined) stats.keyIntegrityFailures += 1;
}

const semantic = {
  dualTrack: { rounds: 0, keyDoesNotDescribeObservedFeatures: 0, bothFeaturesMatchButNoBothChoice: 0, observed: {} },
  peripheralCatch: { rounds: 0, hiddenTarget: 0, visibleTargetCountNotOne: 0, visibleKeyFailures: 0, keyedCenterZoneForNonCenterTarget: 0 },
  trailWrittenRule: { rounds: 0, keyedChoiceViolatesWrittenRule: 0, noWrittenRuleValidChoice: 0, multipleWrittenRuleValidChoices: 0, validChoiceCounts: {} },
  equationSystem: { rounds: 0, algebraicKeyFailures: 0, guaranteedAnswerEquivalentDistractorInSourceDesign: 0, choiceCounts: {} },
  operationSpan: { rounds: 0, independentlyDerivedKeyFailures: 0, allEquationsTrue: 0, noEquationsTrue: 0, fewerThanFourChoices: 0, choiceCounts: {} },
  numberChain: { rounds: 0, independentlyDerivedKeyFailures: 0, forwardRounds: 0, reverseRounds: 0, forwardFewerThanFourChoices: 0, reverseFewerThanFourChoices: 0, choiceCounts: {} }
};

function checkDualTrack(round) {
  if (round.typeId !== 'dual-track') return;
  semantic.dualTrack.rounds += 1;
  const tokens = round.studyVisual?.tokens || [];
  const n = Number.parseInt(round.subtitle, 10);
  const previous = tokens[tokens.length - 1 - n];
  const current = tokens[tokens.length - 1];
  if (!previous || !current) return;
  const position = previous.label === current.label;
  const color = previous.color === current.color;
  const observed = position && color ? 'Both match' : position ? 'Position match' : color ? 'Color match' : 'No match';
  addCount(semantic.dualTrack.observed, observed);
  if (observed === 'Both match') {
    if (!round.choices.includes('Both match')) semantic.dualTrack.bothFeaturesMatchButNoBothChoice += 1;
    semantic.dualTrack.keyDoesNotDescribeObservedFeatures += 1;
  } else if (answerOf(round) !== observed) {
    semantic.dualTrack.keyDoesNotDescribeObservedFeatures += 1;
  }
}

function zoneForIndex(index) {
  if (index === 0) return 'Top left';
  if (index === 2) return 'Top right';
  if (index === 6) return 'Bottom left';
  if (index === 8) return 'Bottom right';
  return 'Center';
}

function checkPeripheral(round) {
  if (round.typeId !== 'peripheral-catch') return;
  semantic.peripheralCatch.rounds += 1;
  const tokens = round.studyVisual?.tokens || [];
  const targets = tokens.map((item, index) => ({ item, index })).filter(({ item }) => item.label === 'target');
  if (!targets.length) semantic.peripheralCatch.hiddenTarget += 1;
  if (targets.length !== 1) semantic.peripheralCatch.visibleTargetCountNotOne += 1;
  if (targets.length === 1) {
    const targetIndex = targets[0].index;
    const center = tokens[4]?.label;
    const expected = `${center} / ${zoneForIndex(targetIndex)}`;
    if (answerOf(round) !== expected) semantic.peripheralCatch.visibleKeyFailures += 1;
    if ([1, 3, 5, 7].includes(targetIndex) && answerOf(round)?.endsWith('/ Center')) {
      semantic.peripheralCatch.keyedCenterZoneForNonCenterTarget += 1;
    }
  }
}

function followsTrailWrittenRule(choice) {
  const parts = choice.split('-');
  if (parts[0] !== 'A') return false;
  return parts.every((part, index) => index % 2 === 0 ? /^[A-Z]$/.test(part) : /^\d+$/.test(part));
}

function checkTrail(round) {
  if (!['trail-blaze', 'trail-making'].includes(round.typeId)) return;
  semantic.trailWrittenRule.rounds += 1;
  const validCount = round.choices.filter(followsTrailWrittenRule).length;
  addCount(semantic.trailWrittenRule.validChoiceCounts, String(validCount));
  if (!followsTrailWrittenRule(answerOf(round))) semantic.trailWrittenRule.keyedChoiceViolatesWrittenRule += 1;
  if (validCount === 0) semantic.trailWrittenRule.noWrittenRuleValidChoice += 1;
  if (validCount > 1) semantic.trailWrittenRule.multipleWrittenRuleValidChoices += 1;
}

function checkEquation(round) {
  if (!['equation-system', 'equation-check'].includes(round.typeId)) return;
  semantic.equationSystem.rounds += 1;
  addCount(semantic.equationSystem.choiceCounts, String(round.choices.length));
  const lines = round.visual?.lines || [];
  const sum = Number(lines[0]?.match(/=\s*(-?\d+)/)?.[1]);
  const diff = Number(lines[1]?.match(/=\s*(-?\d+)/)?.[1]);
  const x = (sum + diff) / 2;
  if (answerOf(round) !== String(x)) semantic.equationSystem.algebraicKeyFailures += 1;
  // The source always passes String(diff + y); solving Y=(sum-diff)/2
  // proves that distractor equals X, before withAnswer deduplicates it.
  const y = (sum - diff) / 2;
  if (diff + y === x) semantic.equationSystem.guaranteedAnswerEquivalentDistractorInSourceDesign += 1;
}

function checkOperationSpan(round) {
  if (round.typeId !== 'operation-span') return;
  semantic.operationSpan.rounds += 1;
  addCount(semantic.operationSpan.choiceCounts, String(round.choices.length));
  if (round.choices.length < 4) semantic.operationSpan.fewerThanFourChoices += 1;
  const rows = (round.studyVisual?.tokens || []).map(token => {
    const [letter, equation] = token.label.split('\n');
    const match = equation?.match(/^(\d+)\+(\d+)=(-?\d+)$/);
    return { letter, valid: !!match && Number(match[1]) + Number(match[2]) === Number(match[3]) };
  });
  const letters = rows.filter(row => row.valid).map(row => row.letter);
  const expected = letters.length ? letters.join('-') : 'none';
  if (answerOf(round) !== expected) semantic.operationSpan.independentlyDerivedKeyFailures += 1;
  if (letters.length === rows.length) semantic.operationSpan.allEquationsTrue += 1;
  if (!letters.length) semantic.operationSpan.noEquationsTrue += 1;
}

function checkNumberChain(round) {
  if (!['number-chain', 'digit-span'].includes(round.typeId)) return;
  semantic.numberChain.rounds += 1;
  addCount(semantic.numberChain.choiceCounts, String(round.choices.length));
  const chain = (round.studyVisual?.tokens || []).map(token => token.label);
  const reverse = round.prompt.toLowerCase().includes('reverse');
  const expected = (reverse ? [...chain].reverse() : chain).join('');
  if (answerOf(round) !== expected) semantic.numberChain.independentlyDerivedKeyFailures += 1;
  if (reverse) {
    semantic.numberChain.reverseRounds += 1;
    if (round.choices.length < 4) semantic.numberChain.reverseFewerThanFourChoices += 1;
  } else {
    semantic.numberChain.forwardRounds += 1;
    if (round.choices.length < 4) semantic.numberChain.forwardFewerThanFourChoices += 1;
  }
}

function runSemanticChecks(round) {
  checkDualTrack(round);
  checkPeripheral(round);
  checkTrail(round);
  checkEquation(round);
  checkOperationSpan(round);
  checkNumberChain(round);
}

function contentFingerprint(round) {
  const clone = JSON.parse(JSON.stringify(round));
  delete clone.id;
  delete clone.difficulty;
  delete clone.studyDurationMs;
  delete clone.interferenceDurationMs;
  return JSON.stringify(clone);
}

function contentVaries(entry, kind) {
  const comparisonSeeds = Math.min(seedsPerLevel, 32);
  for (let seed = 1; seed <= comparisonSeeds; seed += 1) {
    let first;
    for (const level of levels) {
      resetRandom(kind, entry.domain, entry.typeId, seed);
      const fingerprint = contentFingerprint(entry.generator(level, kind === 'assessment'));
      if (first === undefined) first = fingerprint;
      else if (fingerprint !== first) return true;
    }
  }
  return false;
}

function probe(entries, kind) {
  const byType = {};
  for (const entry of entries) {
    const stats = newTypeStats(entry.domain, entry.typeId);
    byType[entry.typeId] = stats;
    for (const level of levels) {
      for (let seed = 1; seed <= seedsPerLevel; seed += 1) {
        resetRandom(kind, entry.domain, entry.typeId, seed);
        const round = entry.generator(level, kind === 'assessment');
        record(stats, round, level);
        runSemanticChecks(round);
      }
    }
    stats.contentVariesAcrossLevels = contentVaries(entry, kind);
  }
  return byType;
}

function summarize(byType) {
  const values = Object.values(byType);
  const summary = {
    generatorCount: values.length,
    rounds: 0,
    choiceCounts: {},
    duplicateChoiceRounds: 0,
    schemaFailureRounds: 0,
    keyIntegrityFailures: 0,
    contentStaticGeneratorCount: 0,
    contentDynamicGeneratorCount: 0,
    contentStaticGeneratorIds: [],
    fewerThanFourChoiceGeneratorIds: []
  };
  for (const stats of values) {
    summary.rounds += stats.rounds;
    summary.duplicateChoiceRounds += stats.duplicateChoiceRounds;
    summary.schemaFailureRounds += stats.schemaFailureRounds;
    summary.keyIntegrityFailures += stats.keyIntegrityFailures;
    for (const [count, rounds] of Object.entries(stats.choiceCounts)) addCount(summary.choiceCounts, count, rounds);
    if (stats.contentVariesAcrossLevels) summary.contentDynamicGeneratorCount += 1;
    else {
      summary.contentStaticGeneratorCount += 1;
      summary.contentStaticGeneratorIds.push(stats.registeredTypeId);
    }
    if (Object.keys(stats.choiceCounts).some(count => Number(count) < 4)) summary.fewerThanFourChoiceGeneratorIds.push(stats.registeredTypeId);
  }
  return summary;
}

const trainingByType = probe(trainingEntries, 'training');
const assessmentByDomain = probe(assessmentEntries, 'assessment');
const output = {
  method: {
    source: 'Transpiled real src/logic/puzzleGenerators.ts exports in a CommonJS vm',
    prng: 'mulberry32 seeded by FNV-1a(kind|domain|registeredTypeId|seed)',
    levels,
    seedsPerLevel,
    note: 'Content-static comparison removes only id, difficulty, and duration fields; it retains prompt, stimuli, choices, answer, explanation, and source.'
  },
  training: { summary: summarize(trainingByType), byType: trainingByType },
  assessment: { summary: summarize(assessmentByDomain), byDomain: assessmentByDomain },
  semantic
};

console.log(JSON.stringify(output, null, 2));
