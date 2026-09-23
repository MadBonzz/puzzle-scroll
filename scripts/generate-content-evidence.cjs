const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, Math });
const cache = new Map();

function load(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const mod = { exports: {} };
  cache.set(absolute, mod);
  const source = fs.readFileSync(absolute, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith('.')) throw new Error(`Unexpected external dependency: ${name}`);
    const base = path.resolve(path.dirname(absolute), name);
    const target = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`]
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!target) throw new Error(`Cannot resolve ${name} from ${absolute}`);
    return load(target);
  };
  const wrapper = vm.runInContext(`(function(require,module,exports){${js}\n})`, context, { filename: absolute });
  wrapper(localRequire, mod, mod.exports);
  return mod.exports;
}

const catalog = load(path.join(root, 'src/content/catalog.ts'));
const pipeline = load(path.join(root, 'src/content/pipeline.ts'));
const coverage = pipeline.contentCoverageReport([]);
const families = catalog.familyDispositions;
const counts = families.reduce((result, family) => {
  result[family.disposition] = (result[family.disposition] ?? 0) + 1;
  return result;
}, {});
const report = {
  schemaVersion: 1,
  preparedDate: '2026-09-23',
  stagedExternalPackCount: 0,
  approvedFamilyCount: families.filter((family) => family.approved).length,
  unreleasedFamilyCount: families.filter((family) => !family.approved).length,
  dispositionCounts: counts,
  families,
  ...coverage
};

const implementationDir = path.join(root, 'docs', 'implementation');
fs.mkdirSync(implementationDir, { recursive: true });
fs.writeFileSync(path.join(implementationDir, 'coverage-report.json'), JSON.stringify(report, null, 2) + '\n');

const escapeCell = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const dispositionLines = [
  '# Content disposition registry',
  '',
  'Generated from the production catalog by `npm run report:content`. Every original registered family remains in the denominator. “Approved” means eligible under the automated publication gate; human timing is still provisional and the separate release limitations remain authoritative.',
  '',
  `Summary: ${report.approvedFamilyCount} approved; ${report.unreleasedFamilyCount} unreleased; ${families.length} total.`,
  '',
  '| Family | Domain | Disposition | Released version | Pace | Tier | QA | Rights declaration | Human timing | Rationale |',
  '|---|---|---|---:|---|---|---|---|---|---|',
  ...families.map((family) => [
    escapeCell(family.typeId),
    escapeCell(family.domain),
    escapeCell(family.disposition),
    family.approved ? '2' : '—',
    escapeCell(family.pace ?? 'unassigned'),
    escapeCell(family.tier ?? 'unassigned'),
    escapeCell(family.qaStatus),
    escapeCell(family.rightsStatus),
    escapeCell(family.humanTimingStatus),
    escapeCell(family.rationale)
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
];
fs.writeFileSync(path.join(implementationDir, 'content-disposition.md'), dispositionLines.join('\n') + '\n');

const coverageLines = [
  '# Content coverage report',
  '',
  'Generated from the production publication selector by `npm run report:content`. Empty cells are intentional and must not fall back to another pace, tier, category, or source.',
  '',
  `- Independent reasoning items: ${coverage.totals.independentReasoningItems}/${coverage.totals.targets.independentReasoningItems}`,
  `- Distinct slow-hard cases: ${coverage.totals.slowHardCases}/${coverage.totals.targets.slowHardCases}`,
  `- Approved cognitive configurations: ${coverage.totals.cognitiveConfigurations}/${coverage.totals.targets.cognitiveConfigurations}`,
  `- Unassigned quarantined/redesign families: ${coverage.totals.unassignedQuarantinedFamilies}`,
  `- Pilot corpus gate: ${coverage.totals.pilotReady ? 'PASS' : 'FAIL — target not met'}`,
  '',
  '| Domain | Pace | Tier | Approved | Quarantined in cell | Templates | Cases | Timing |',
  '|---|---|---|---:|---:|---:|---:|---|',
  ...coverage.cells.map((cell) =>
    `| ${cell.domain} | ${cell.pace} | ${cell.tier} | ${cell.approvedCount} | ${cell.quarantinedCount} | ${cell.distinctTemplateCount} | ${cell.distinctCaseCount} | ${cell.timingStatus} |`
  ),
  '',
  'No external question pack has been imported. Dataset license/rights review, independent human editorial review, and human timing calibration therefore remain NOT RUN rather than being inferred from automated checks.'
];
fs.writeFileSync(path.join(implementationDir, 'coverage-report.md'), coverageLines.join('\n') + '\n');
