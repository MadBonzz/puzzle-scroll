const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const scratchRoot = path.join(root, 'negative-controls-tmp');
const evidenceDir = path.join(root, 'docs', 'implementation');
const copiedEntries = ['src', 'tests', 'jest.config.cjs', 'babel.config.js', 'tsconfig.json', 'package.json'];
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');

const controls = [
  {
    id: 'NC01',
    requirement: 'Q01 incorrect implication key',
    file: 'src/logic/puzzleGenerators.ts',
    before: "const answer = 'A and B are both false';",
    after: "const answer = 'A is true';",
    testFile: 'tests/content/phase-a-independent.test.ts',
    pattern: 'Q01'
  },
  {
    id: 'NC02',
    requirement: 'Q02 missing Trail ordering rule',
    file: 'src/logic/puzzleGenerators.ts',
    before: ' Use every tile once and alternate between letters and numbers. Keep letters in alphabetical order and numbers in increasing order.',
    after: ' Use every tile once and alternate between letters and numbers.',
    testFile: 'tests/content/phase-a-regressions.test.ts',
    pattern: 'Q02'
  },
  {
    id: 'NC03',
    requirement: 'S01 final submit bypasses feedback',
    file: 'src/session/sessionMachine.ts',
    before: "    status: 'feedback',\n    canContinue",
    after: "    status: finalItem ? 'summary' : 'feedback',\n    canContinue",
    testFile: 'tests/unit/session-machine.test.ts',
    pattern: 'S01'
  },
  {
    id: 'NC04',
    requirement: 'T07 global attempt idempotency guard removed',
    file: 'src/store/appStore.ts',
    before: '      const newAttempts = activeSession.attempts.filter((attempt) => !previousIds.has(attempt.instanceId));',
    after: '      const newAttempts = activeSession.attempts;',
    testFile: 'tests/unit/app-store.test.ts',
    pattern: 'T07: repeated callbacks'
  },
  {
    id: 'NC05',
    requirement: 'T01/T03 paused time counted as active',
    file: 'src/session/sessionMachine.ts',
    before: "} else if (state.status === 'active') {",
    after: "} else if (state.status === 'active' || state.status === 'paused') {",
    testFile: 'tests/unit/session-machine.test.ts',
    pattern: 'T01: exact'
  },
  {
    id: 'NC06',
    requirement: 'F01/F03 empty selection falls back to all content',
    file: 'src/content/catalog.ts',
    before: '  const families = eligibleFamilies(selection);',
    after: '  const exactFamilies = eligibleFamilies(selection);\n  const families = exactFamilies.length ? exactFamilies : familyDispositions.filter((family) => family.approved);',
    testFile: 'tests/content/catalog.test.ts',
    pattern: 'all 48 requested cells'
  },
  {
    id: 'NC07',
    requirement: 'A01 wrong Hard answers counted as solved',
    file: 'src/analytics/metrics.ts',
    before: "attempt.tier === 'hard' && attempt.outcome === 'correct'",
    after: "attempt.tier === 'hard'",
    testFile: 'tests/unit/analytics.test.ts',
    pattern: 'A01'
  },
  {
    id: 'NC08',
    requirement: 'M01 default write allowed before hydration',
    file: 'src/store/appStore.ts',
    before: "    updatePreferences(update) {\n      if (state.hydration !== 'ready') return false;",
    after: "    updatePreferences(update) {",
    testFile: 'tests/unit/app-store.test.ts',
    pattern: 'M01'
  },
  {
    id: 'NC09',
    requirement: 'Q12/P01 staged content served as approved',
    file: 'src/content/pipeline.ts',
    before: "    record.status === 'approved' &&\n    packPublicationProblems(record.source, record.item).length === 0",
    after: "    record.status !== 'quarantined' ||\n    packPublicationProblems(record.source, record.item).length === 0",
    testFile: 'tests/content/pipeline.test.ts',
    pattern: 'P01/Q12'
  }
];

function validatedRemove(target) {
  const resolved = path.resolve(target);
  if (path.dirname(resolved) !== scratchRoot || !path.basename(resolved).startsWith('control-')) {
    throw new Error(`Refusing to remove unexpected mutation path: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

fs.mkdirSync(scratchRoot, { recursive: true });
const results = [];
for (const control of controls) {
  const workspace = path.join(scratchRoot, `control-${control.id.toLowerCase()}`);
  validatedRemove(workspace);
  fs.mkdirSync(workspace, { recursive: true });
  for (const entry of copiedEntries) {
    fs.cpSync(path.join(root, entry), path.join(workspace, entry), { recursive: true });
  }
  const target = path.join(workspace, control.file);
  const source = fs.readFileSync(target, 'utf8');
  const occurrences = source.split(control.before).length - 1;
  if (occurrences !== 1) throw new Error(`${control.id}: expected one mutation target, found ${occurrences}`);
  fs.writeFileSync(target, source.replace(control.before, control.after));
  const execution = spawnSync(process.execPath, [
    jestBin,
    '--runInBand',
    '--config',
    'jest.config.cjs',
    control.testFile,
    '-t',
    control.pattern
  ], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') },
    timeout: 60_000
  });
  const combined = [execution.stdout, execution.stderr].filter(Boolean).join('\n');
  const caught = execution.status !== 0 && /FAIL|failed/i.test(combined);
  results.push({
    id: control.id,
    requirement: control.requirement,
    testFile: control.testFile,
    testPattern: control.pattern,
    mutationOccurrences: occurrences,
    exitCode: execution.status,
    caught,
    outputTail: combined.split(/\r?\n/).slice(-16)
  });
  validatedRemove(workspace);
}
fs.rmdirSync(scratchRoot);

fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, 'negative-controls.json'), JSON.stringify({
  schemaVersion: 1,
  preparedDate: '2026-09-23',
  controls: results
}, null, 2) + '\n');
const lines = [
  '# Negative-control evidence',
  '',
  'Each deliberate fault was applied only inside a validated temporary workspace. PASS means the unmodified test suite rejected that mutant. The production workspace was not altered by a mutation.',
  '',
  '| ID | Deliberate fault | Focused test | Result | Mutant exit |',
  '|---|---|---|---|---:|',
  ...results.map((result) =>
    `| ${result.id} | ${result.requirement} | ${result.testFile} — ${result.testPattern} | ${result.caught ? 'PASS (caught)' : 'FAIL (survived)'} | ${result.exitCode} |`
  )
];
fs.writeFileSync(path.join(evidenceDir, 'negative-controls.md'), lines.join('\n') + '\n');
if (results.some((result) => !result.caught)) process.exitCode = 1;
