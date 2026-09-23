// Audit-only probes. Runs real TS/TSX source in a lightweight hook host.
// This is NOT a React Native renderer or a substitute for device interaction tests.
// No application files or user AsyncStorage are written. All persistence is mocked.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const cache = new Map();
const saved = new Map();
let currentHost;
const jsx = (type, props, key) => ({ type, props: props || {}, key });
const react = {
  useState(initial) {
    const host = currentHost, i = host.cursor++;
    if (!(i in host.slots)) host.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [host.slots[i], value => {
      host.slots[i] = typeof value === 'function' ? value(host.slots[i]) : value;
      host.dirty = true;
    }];
  },
  useRef(initial) {
    const host = currentHost, i = host.cursor++;
    if (!(i in host.slots)) host.slots[i] = { current: initial };
    return host.slots[i];
  },
  useEffect(effect, deps) {
    const host = currentHost, i = host.cursor++, prev = host.slots[i];
    if (!prev || !deps || deps.some((v, n) => !Object.is(v, prev.deps[n]))) {
      host.pending.push(() => {
        prev?.cleanup?.();
        host.slots[i] = { deps, cleanup: effect() };
      });
    }
  },
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
};
const native = Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'Modal'].map(k => [k, k]));
native.StyleSheet = { create: value => value };
native.useWindowDimensions = () => ({ width: 390, height: 844 });
native.PanResponder = { create: config => ({ panHandlers: config }) };
native.BackHandler = { addEventListener: () => ({ remove() {} }) };
const mocks = {
  react,
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  'react-native': native,
  '@expo/vector-icons': { Feather: 'Feather' },
  'expo-status-bar': { StatusBar: 'StatusBar' },
  'expo-haptics': { notificationAsync: async () => {}, NotificationFeedbackType: { Success: 1, Warning: 2 } },
  'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
  'react-native-svg': { default: 'Svg', Circle: 'Circle', Line: 'Line', Polygon: 'Polygon', Text: 'SvgText' },
  '@react-native-async-storage/async-storage': { __esModule: true, default: {
    getItem: async key => saved.get(key) || null,
    setItem: async (key, value) => { saved.set(key, value); }
  } }
};
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  let source = fs.readFileSync(file, 'utf8');
  if (file === path.join(root, 'App.tsx')) source += '\nexport { AppShell, FeedScreen, AssessScreen, DashboardScreen, ProfileScreen, SettingsScreen, SwipePager, PagerControls };';
  if (file.endsWith('useAppStore.ts')) source += '\nexport { getSnapshot };';
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true
  } }).outputText;
  const localRequire = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('.')) throw new Error(`Unmocked dependency ${name}`);
    const base = path.resolve(path.dirname(file), name);
    const target = [base, `${base}.ts`, `${base}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    return load(target);
  };
  // Timers deliberately do not elapse; these probes concern explicit transitions.
  vm.runInNewContext(`(function(require,module,exports,setTimeout,clearTimeout){${js}\n})`, { console })(localRequire, mod, mod.exports, () => 1, () => {});
  return mod.exports;
}
function mount(component, props = {}) {
  const host = { slots: [], cursor: 0, pending: [], dirty: false, tree: null };
  host.render = () => {
    for (let n = 0; n < 12; n++) {
      currentHost = host;
      host.cursor = 0; host.pending = []; host.dirty = false;
      host.tree = component(props);
      host.pending.forEach(run => run());
      if (!host.dirty) return host.tree;
    }
    throw new Error('Unstable hook host');
  };
  host.render();
  return host;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join(' ');
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree && typeof tree === 'object' ? textOf(tree.props?.children) : '';
}
const find = (host, name) => nodes(host.tree).find(n => (n.type?.name || n.type) === name);
const buttons = host => nodes(host.tree).filter(n => n.type === 'Pressable').map(n => textOf(n));
const app = load(path.join(root, 'App.tsx'));
const store = load(path.join(root, 'src/store/useAppStore.ts'));
const { PuzzleCard } = load(path.join(root, 'src/components/PuzzleCard.tsx'));
const generators = load(path.join(root, 'src/logic/puzzleGenerators.ts'));
const scoring = load(path.join(root, 'src/logic/scoring.ts'));
const results = [];
const report = (id, observed, defectReproduced) => results.push({ id, defectReproduced, observed });
const attemptFor = (puzzle, accuracy = 1) => ({
  puzzleId: puzzle.id, puzzleType: puzzle.typeId, domain: puzzle.domain,
  difficulty: puzzle.difficulty, accuracy, reactionTimeMs: 1000,
  completedAt: Date.now(), isAssessment: puzzle.isAssessment
});

// Let initial in-memory hydration settle before isolated cases.
(async () => {
  store.getSnapshot();
  await Promise.resolve();
  const reset = () => store.getSnapshot().resetProgress();
  reset();
  const assessment = mount(app.AssessScreen, { immersive: true, onToggleImmersive() {} });
  for (let i = 0; i < 8; i++) {
    const card = find(assessment, 'PuzzleCard');
    card.props.onAnswered(attemptFor(card.props.puzzle));
    assessment.render();
    if (i < 7) { find(assessment, 'SwipePager').props.onNext(); assessment.render(); }
  }
  report('UX-01', { report: textOf(assessment.tree).includes('Assessment saved'), puzzleCardPresent: !!find(assessment, 'PuzzleCard'), buttons: buttons(assessment) }, !find(assessment, 'PuzzleCard') && buttons(assessment).length === 1);
  report('UX-14', { firstAssessmentType: store.getSnapshot().assessments[0].type, baseline: store.getSnapshot().domains.reasoning.baselineScore }, store.getSnapshot().assessments[0].type === 'monthly');

  reset(); store.getSnapshot().setSessionGoal('threeMisses');
  const misses = mount(app.FeedScreen, { immersive: true, onToggleImmersive() {} });
  for (let i = 0; i < 3; i++) {
    const card = find(misses, 'PuzzleCard'); card.props.onAnswered(attemptFor(card.props.puzzle, 0)); misses.render();
    if (i < 2) { find(misses, 'SwipePager').props.onNext(); misses.render(); }
  }
  report('UX-02', { buttons: buttons(misses), puzzleCardPresent: !!find(misses, 'PuzzleCard') }, !find(misses, 'PuzzleCard') && buttons(misses).length === 1);

  reset(); store.getSnapshot().setSessionGoal('short');
  const feed = mount(app.FeedScreen, { immersive: true, onToggleImmersive() {} });
  for (let i = 0; i < 20; i++) { find(feed, 'SwipePager').props.onNext(); feed.render(); }
  report('UX-04', { index: find(feed, 'SwipePager').props.index, infinite: find(feed, 'SwipePager').props.total === Infinity, savedAttempts: store.getSnapshot().attempts.length }, find(feed, 'SwipePager').props.index === 20);

  const parentCard = find(feed, 'PuzzleCard');
  const answerCard = mount(PuzzleCard, parentCard.props);
  // Use a direct-answer puzzle to isolate remount behaviour from study timers.
  const directPuzzle = generators.trainingGeneratorEntries.reasoning.find(e => e.typeId === 'implication-chain').generator(5);
  let saves = 0;
  const direct = mount(PuzzleCard, { puzzle: directPuzzle, onAnswered() { saves++; } });
  nodes(direct.tree).find(n => n.type === 'Pressable').props.onPress(); direct.render();
  const revisit = mount(PuzzleCard, { puzzle: directPuzzle, onAnswered() {} });
  report('UX-05', { firstVisitFeedback: textOf(direct.tree).includes('Your answer:'), remountFeedback: textOf(revisit.tree).includes('Your answer:'), saves }, !textOf(revisit.tree).includes('Your answer:'));

  reset(); store.getSnapshot().toggleFeedPuzzleType('speed-match');
  const persisted = JSON.parse(saved.get('puzzle-scroll-progress'));
  report('UX-17', { memoryCount: store.getSnapshot().feedSettings.enabledPuzzleTypes.length, persistedCount: persisted.feedSettings.enabledPuzzleTypes.length, persistedDisabledType: persisted.feedSettings.enabledPuzzleTypes.includes('speed-match') }, persisted.feedSettings.enabledPuzzleTypes.includes('speed-match'));
  const mismatch = generators.generateDailySession(Object.fromEntries(Object.keys(generators.trainingGeneratorEntries).map(d => [d, 5])), 5, { enabledDomains: ['language'], enabledPuzzleTypes: ['speed-match'] });
  report('UX-18', { requestedType: 'speed-match', returnedTypes: mismatch.map(p => p.typeId) }, mismatch.some(p => p.typeId !== 'speed-match'));

  reset();
  const sample = attemptFor(directPuzzle, 0);
  store.getSnapshot().recordAttempt(sample);
  const dashboard = mount(app.DashboardScreen, { onStartFeed() {}, onStartCheck() {} });
  const hardMetric = nodes(dashboard.tree).find(n => n.type?.name === 'Metric' && n.props.label === 'Hard solved');
  report('UX-10', { actualSeconds: 1, storedMinutes: store.getSnapshot().totalTrainingMinutes, hardSolvedAfterWrongAnswer: hardMetric.props.value }, store.getSnapshot().totalTrainingMinutes === 0.25 && hardMetric.props.value === '1');
  const wrongFastScore = scoring.computeCompositeScore(0, 1000, 5200);
  report('UX-13', { wrongFastScore }, wrongFastScore === 32);

  reset();
  for (let i = 0; i < 301; i++) store.getSnapshot().recordAttempt({ ...sample, puzzleId: `audit-${i}` });
  report('UX-11', { retainedAttempts: store.getSnapshot().attempts.length, lifetimeDomainCount: store.getSnapshot().domains.reasoning.totalPuzzlesCompleted }, store.getSnapshot().attempts.length === 300);
  const settings = mount(app.SettingsScreen);
  const settingsButtons = nodes(settings.tree).filter(n => n.type === 'Pressable').length;
  report('UX-16', { pressableCount: settingsButtons, hasPlacementCopy: nodes(settings.tree).some(n => n.props?.title === 'Complex puzzle placement') }, settingsButtons > 80);

  console.log(JSON.stringify({ method: 'Real-source transition/store probes with mocked hooks/native UI/storage; no device rendering or automatic timers', results }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
