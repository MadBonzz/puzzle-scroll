import { domainIds } from '../data/domains';
import { trainingGeneratorEntries } from '../logic/puzzleGenerators';
import type { CognitiveDomain, PuzzleRound } from '../types';
import type { DifficultyTier, Pace, SessionItem } from '../session/sessionMachine';
import { normalizeRational } from './answers';

export type ContentDisposition = 'retain' | 'repair' | 'redesign' | 'quarantine' | 'replace';

export interface FamilyDisposition {
  typeId: string;
  domain: CognitiveDomain;
  disposition: ContentDisposition;
  rationale: string;
  approved: boolean;
  pace?: Pace;
  tier?: DifficultyTier;
  effortRangeMinutes?: readonly [number, number];
  responseFormat?: 'single-select' | 'numeric' | 'structured';
  reasoningOutline?: string;
  qaStatus: 'approved' | 'pending' | 'quarantined';
  verificationMethod?: string;
  rightsStatus: 'cleared' | 'missing';
  rightsEvidence?: string;
  humanTimingStatus: 'provisional' | 'piloted';
  sourceId: string;
}

const effortFor = (pace: Pace, tier: DifficultyTier): readonly [number, number] => {
  if (pace === 'fast') return tier === 'easy' ? [0.03, 0.25] : tier === 'medium' ? [0.15, 0.5] : [0.33, 1];
  return tier === 'easy' ? [1, 3] : tier === 'medium' ? [3, 5] : [5, 10];
};

function qaMetadata(typeId: string, approved: boolean, pace?: Pace, tier?: DifficultyTier) {
  const publicDomainAdaptation = new Set(['equation-system', 'ratio-puzzle', 'weighing-puzzle', 'seating-deduction', 'cryptic-clue']).has(typeId);
  return {
    effortRangeMinutes: pace && tier ? effortFor(pace, tier) : undefined,
    responseFormat: typeId === 'trail-blaze' ? 'structured' as const : 'single-select' as const,
    reasoningOutline: approved ? 'Derive the keyed response from every visible rule; reject each alternative against at least one rule.' : undefined,
    qaStatus: approved ? 'approved' as const : 'quarantined' as const,
    verificationMethod: approved ? 'Independent fixed-fixture or seeded production-path regression test.' : undefined,
    rightsStatus: 'cleared' as const,
    rightsEvidence: publicDomainAdaptation
      ? 'repo://docs/implementation/original-content-rights.md#public-domain-classic-adaptations'
      : 'repo://docs/implementation/original-content-rights.md#original-generators',
    humanTimingStatus: 'provisional' as const,
    sourceId: publicDomainAdaptation
      ? 'public-domain-classics'
      : 'puzzlescroll-original'
  };
}

const repaired: Record<string, { pace: Pace; tier: DifficultyTier; rationale: string }> = {
  'peripheral-catch': { pace: 'fast', tier: 'hard', rationale: 'Exact visible location and mutually exclusive responses repaired and seed-tested.' },
  'dual-track': { pace: 'fast', tier: 'hard', rationale: 'All position/color match combinations are now represented and seed-tested.' },
  'trail-blaze': { pace: 'fast', tier: 'easy', rationale: 'Every ordering constraint is now stated and regression-tested.' },
  'rule-cascade': { pace: 'fast', tier: 'hard', rationale: 'Parity output rule is now explicit.' },
  'operation-span': { pace: 'fast', tier: 'hard', rationale: 'Displayed equations, ordered recall, repeated symbols, and distinct responses are independently recomputed across fixed seeds.' },
  'delayed-recall': { pace: 'fast', tier: 'medium', rationale: 'Study, interference, exact ordered recall, and distinct responses are verified together.' },
  'bottleneck-plan': { pace: 'fast', tier: 'medium', rationale: 'Question now uniquely asks for the controlling parallel branch.' },
  'long-case-deduction': { pace: 'slow', tier: 'hard', rationale: 'One-to-one day/lab rules are explicit and the forced assignment is independently enumerated.' },
  'equation-system': { pace: 'fast', tier: 'medium', rationale: 'Equivalent distractor removed; four distinct choices seed-tested.' }
};

const retained: Record<string, { pace: Pace; tier: DifficultyTier }> = {
  'symbol-scan': { pace: 'fast', tier: 'medium' },
  'color-rush': { pace: 'fast', tier: 'easy' },
  'next-in-line': { pace: 'fast', tier: 'easy' },
  'matrix-pick': { pace: 'fast', tier: 'medium' },
  'odd-one-out': { pace: 'fast', tier: 'easy' },
  'logic-lock': { pace: 'slow', tier: 'medium' },
  'balance-code': { pace: 'fast', tier: 'medium' },
  'spatial-transform': { pace: 'fast', tier: 'medium' },
  'suspect-deduction': { pace: 'slow', tier: 'hard' },
  'truth-count-deduction': { pace: 'slow', tier: 'hard' },
  'rank-deduction': { pace: 'slow', tier: 'hard' },
  'implication-chain': { pace: 'fast', tier: 'hard' },
  'set-logic': { pace: 'fast', tier: 'hard' },
  'letter-flow': { pace: 'fast', tier: 'easy' },
  'word-chain': { pace: 'fast', tier: 'medium' },
  'cryptic-clue': { pace: 'slow', tier: 'hard' },
  'route-planner': { pace: 'fast', tier: 'easy' },
  'resource-schedule': { pace: 'slow', tier: 'medium' },
  'seating-deduction': { pace: 'slow', tier: 'hard' },
  'weighing-puzzle': { pace: 'slow', tier: 'medium' },
  'dependency-plan': { pace: 'slow', tier: 'easy' },
  'value-packing': { pace: 'slow', tier: 'medium' },
  'valid-schedule': { pace: 'slow', tier: 'medium' },
  'ratio-puzzle': { pace: 'fast', tier: 'easy' },
  'quant-balance': { pace: 'fast', tier: 'medium' },
  'data-sufficiency': { pace: 'fast', tier: 'hard' },
  'mixture-puzzle': { pace: 'fast', tier: 'easy' },
  'remainder-system': { pace: 'slow', tier: 'medium' }
};

const highRisk = new Set([
  'noise-filter',
  'stop-signal',
  'odd-pulse',
  'rule-flip',
  'interleaved-sequence',
  'logic-grid',
  'constraint-clue',
  'critical-assumption',
  'tower-moves',
  'planning-grid'
]);

export const familyDispositions: FamilyDisposition[] = domainIds.flatMap((domain) =>
  trainingGeneratorEntries[domain].map((entry) => {
    const repairedMeta = repaired[entry.typeId];
    if (repairedMeta) {
      return { typeId: entry.typeId, domain, disposition: 'repair', approved: true, ...repairedMeta, ...qaMetadata(entry.typeId, true, repairedMeta.pace, repairedMeta.tier) };
    }
    const retainedMeta = retained[entry.typeId];
    if (retainedMeta) {
      return {
        typeId: entry.typeId,
        domain,
        disposition: 'retain',
        approved: true,
        rationale: 'Audit found the key sound; tier is provisional pending human calibration.',
        ...retainedMeta,
        ...qaMetadata(entry.typeId, true, retainedMeta.pace, retainedMeta.tier)
      };
    }
    return {
      typeId: entry.typeId,
      domain,
      disposition: highRisk.has(entry.typeId) ? 'quarantine' : 'redesign',
      approved: false,
      rationale: highRisk.has(entry.typeId)
        ? 'Audit identified a Critical/High unresolved validity or construct defect.'
        : 'Not published until its Medium structural/content concerns are repaired and independently checked.',
      ...qaMetadata(entry.typeId, false)
    };
  })
);

const entryByType = new Map(
  domainIds.flatMap((domain) => trainingGeneratorEntries[domain].map((entry) => [entry.typeId, entry] as const))
);

export interface CatalogSelection {
  pace: Pace;
  tier: DifficultyTier;
  categories: CognitiveDomain[];
  familyIds?: string[];
  excludedContentVersions?: string[];
}

export const practiceContentVersion = 2;

export function eligibleFamilies(selection: CatalogSelection) {
  const allowedFamilies = selection.familyIds ? new Set(selection.familyIds) : undefined;
  const excludedVersions = new Set(selection.excludedContentVersions ?? []);
  const categories = new Set(selection.categories);
  return familyDispositions.filter(
    (family) =>
      family.approved &&
      family.pace === selection.pace &&
      family.tier === selection.tier &&
      categories.has(family.domain) &&
      !excludedVersions.has(`${family.typeId}:v${practiceContentVersion}`) &&
      (!allowedFamilies || allowedFamilies.has(family.typeId))
  );
}

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

function withSeed<T>(seed: number, run: () => T): T {
  const original = Math.random;
  Math.random = seeded(seed);
  try {
    return run();
  } finally {
    Math.random = original;
  }
}

export function publicationProblems(round: PuzzleRound) {
  const problems: string[] = [];
  if (!round.prompt.trim()) problems.push('missing prompt');
  if (!round.explanation.trim()) problems.push('missing explanation');
  if (round.choices.length < 2) problems.push('fewer than two choices');
  if (new Set(round.choices).size !== round.choices.length) problems.push('duplicate choices');
  if (round.correctIndex < 0 || round.correctIndex >= round.choices.length) problems.push('invalid key');
  const semanticKeys = round.choices.map(semanticChoiceKey);
  if (new Set(semanticKeys).size !== semanticKeys.length) problems.push('answer-equivalent choices');
  return problems;
}

function semanticChoiceKey(label: string) {
  const rational = normalizeRational(label.trim());
  if (rational) return `number:${rational.numerator}/${rational.denominator}`;
  return `text:${label.trim().toLocaleLowerCase().replace(/\s+/g, ' ')}`;
}

export function stableChoiceId(label: string) {
  const source = semanticChoiceKey(label);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `choice-${(hash >>> 0).toString(36)}`;
}

export function publicationEligibilityProblems(round: PuzzleRound, family: FamilyDisposition) {
  const problems = publicationProblems(round);
  if (!family.approved || family.qaStatus !== 'approved') problems.push('content is not approved');
  if (!family.verificationMethod) problems.push('missing independent verification');
  if (!family.reasoningOutline) problems.push('missing reasoning outline');
  if (family.rightsStatus !== 'cleared' || !family.rightsEvidence) problems.push('missing rights evidence');
  if (!family.pace || !family.tier || !family.effortRangeMinutes || !family.responseFormat) problems.push('missing delivery metadata');
  return [...new Set(problems)];
}

function toSessionItem(round: PuzzleRound, family: FamilyDisposition, instanceId: string): SessionItem {
  const orderedLabels = family.typeId === 'trail-blaze'
    ? (round.visual?.tokens ?? []).map((token) => token.label)
    : undefined;
  const choices = (orderedLabels ?? round.choices).map((label) => ({ id: stableChoiceId(label), label }));
  const correctLabel = round.choices[round.correctIndex]!;
  const orderedCorrectIds = orderedLabels
    ? correctLabel.split('-').map((label) => stableChoiceId(label))
    : undefined;
  return {
    instanceId,
    contentId: family.typeId,
    contentVersion: practiceContentVersion,
    prompt: round.prompt,
    choices,
    correctChoiceIds: orderedCorrectIds ?? [stableChoiceId(correctLabel)],
    explanation: round.explanation,
    domain: family.domain,
    pace: family.pace!,
    tier: family.tier!,
    responsePolicy: 'ordinary',
    protocolId: `practice-${family.typeId}-v2`,
    formFamily: family.typeId,
    sourceId: family.sourceId,
    effortRangeMinutes: family.effortRangeMinutes,
    responseSchema: orderedCorrectIds ? { kind: 'ordered', correctResponseLabel: correctLabel } : undefined,
    initialPhase: round.requiresReady ? 'ready' : 'responding',
    round
  };
}

export function buildSessionItems(selection: CatalogSelection, count: number, seed: number) {
  const families = eligibleFamilies(selection);
  if (!families.length || count <= 0) return [];
  const items: SessionItem[] = [];
  for (let index = 0; index < count; index += 1) {
    const family = families[index % families.length]!;
    const entry = entryByType.get(family.typeId)!;
    let accepted: PuzzleRound | undefined;
    for (let retry = 0; retry < 20 && !accepted; retry += 1) {
      const candidateSeed = seed + index * 101 + retry;
      const level = selection.tier === 'easy' ? 3 : selection.tier === 'medium' ? 10 : 17;
      const candidate = withSeed(candidateSeed, () => entry.generator(level, false));
      if (!publicationEligibilityProblems(candidate, family).length) accepted = candidate;
    }
    if (accepted) items.push(toSessionItem(accepted, family, `${family.typeId}-${seed}-${index}`));
  }
  return items;
}

export function coverageMatrix() {
  return domainIds.flatMap((domain) =>
    (['fast', 'slow'] as const).flatMap((pace) =>
      (['easy', 'medium', 'hard'] as const).map((tier) => ({
        domain,
        pace,
        tier,
        approvedFamilies: familyDispositions.filter(
          (family) => family.domain === domain && family.pace === pace && family.tier === tier && family.approved
        ).length
      }))
    )
  );
}
