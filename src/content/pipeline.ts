import { domainIds } from '../data/domains';
import type { CognitiveDomain } from '../types';
import type { DifficultyTier, Pace } from '../session/sessionMachine';
import { familyDispositions } from './catalog';

export interface SourceManifest {
  sourceId: string;
  title: string;
  licenseId: string;
  rightsEvidenceUrl: string;
  rightsCheckedAt: string;
  contentReuseAllowed: boolean;
  codeOnlyLicense: boolean;
  attribution?: string;
}

export interface StagedPackItem {
  contentId: string;
  version: number;
  templateId: string;
  caseId?: string;
  domain: CognitiveDomain;
  pace: Pace;
  tier: DifficultyTier;
  responseFormat: 'single-select' | 'numeric' | 'structured';
  effortRangeMinutes: readonly [number, number];
  prompt: string;
  assumptions: string[];
  choices?: Array<{ id: string; label: string }>;
  correctChoiceIds?: string[];
  acceptedAnswerPolicy?: Record<string, unknown>;
  workedSolution: string;
  reasoningOutline: string[];
  distractorRationales?: Record<string, string>;
  qa: {
    independentSolve: 'pass' | 'fail' | 'not-run';
    editorialReview: 'pass' | 'fail' | 'not-run';
    rendererReview: 'pass' | 'fail' | 'not-run';
    humanTiming: 'provisional' | 'piloted';
  };
}

export interface PackRecord {
  key: string;
  checksum: string;
  source: SourceManifest;
  item: StagedPackItem;
  status: 'staged' | 'approved' | 'quarantined';
  issues: string[];
}

function checksum(value: unknown) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function packPublicationProblems(source: SourceManifest, item: StagedPackItem) {
  const problems: string[] = [];
  if (!source.sourceId || !source.title || !source.licenseId) problems.push('missing source manifest');
  if (!source.rightsEvidenceUrl || !source.rightsCheckedAt || !source.contentReuseAllowed) problems.push('missing rights evidence');
  if (source.codeOnlyLicense) problems.push('code-only license does not clear content');
  if (!item.contentId || !Number.isInteger(item.version) || item.version < 1 || !item.templateId) problems.push('invalid stable identity');
  if (!item.prompt.trim()) problems.push('missing prompt');
  if (!item.assumptions.length) problems.push('missing required assumptions');
  if (!item.workedSolution.trim() || !item.reasoningOutline.length) problems.push('missing solution evidence');
  if (!item.effortRangeMinutes || item.effortRangeMinutes[0] <= 0 || item.effortRangeMinutes[1] < item.effortRangeMinutes[0]) problems.push('invalid effort range');
  if (item.responseFormat === 'single-select') {
    if (!item.choices || item.choices.length < 2) problems.push('invalid choice count');
    if (!item.correctChoiceIds?.length) problems.push('missing key');
    const choiceIds = new Set(item.choices?.map((choice) => choice.id));
    if (choiceIds.size !== item.choices?.length) problems.push('duplicate choice identity');
    if (item.correctChoiceIds?.some((id) => !choiceIds.has(id))) problems.push('key not present in choices');
    if (item.correctChoiceIds?.length !== 1) problems.push('ambiguous single-select key');
    if (!item.distractorRationales || item.choices?.some((choice) =>
      !item.correctChoiceIds?.includes(choice.id) && !item.distractorRationales?.[choice.id]
    )) problems.push('missing distractor rationale');
  } else if (!item.acceptedAnswerPolicy) {
    problems.push('missing answer validator');
  }
  if (item.qa.independentSolve !== 'pass') problems.push('independent solve not passed');
  if (item.qa.editorialReview !== 'pass') problems.push('editorial review not passed');
  if (item.qa.rendererReview !== 'pass') problems.push('renderer review not passed');
  return [...new Set(problems)];
}

export function ingestPack(
  existing: PackRecord[],
  source: SourceManifest,
  stagedItems: StagedPackItem[]
) {
  const records = [...existing];
  const errors: string[] = [];
  let added = 0;
  for (const item of stagedItems) {
    const key = `${source.sourceId}:${item.contentId}:v${item.version}`;
    const itemChecksum = checksum(item);
    const prior = records.find((record) => record.key === key);
    if (prior) {
      if (prior.checksum !== itemChecksum) errors.push(`${key}: same identity/version has different bytes`);
      continue;
    }
    const issues = packPublicationProblems(source, item);
    records.push({
      key,
      checksum: itemChecksum,
      source: { ...source },
      item: { ...item },
      status: issues.length ? 'staged' : 'approved',
      issues
    });
    added += 1;
  }
  return { records, added, errors };
}

export function loadApprovedPack(records: PackRecord[]) {
  return records.filter((record) =>
    record.status === 'approved' &&
    packPublicationProblems(record.source, record.item).length === 0
  );
}

export function selectPackItems(
  records: PackRecord[],
  selection: { pace: Pace; tier: DifficultyTier; categories: CognitiveDomain[] }
) {
  const categories = new Set(selection.categories);
  return loadApprovedPack(records).filter((record) =>
    record.item.pace === selection.pace &&
    record.item.tier === selection.tier &&
    categories.has(record.item.domain)
  );
}

export function contentCoverageReport(records: PackRecord[]) {
  const approvedPack = loadApprovedPack(records);
  const cells = domainIds.flatMap((domain) =>
    (['fast', 'slow'] as const).flatMap((pace) =>
      (['easy', 'medium', 'hard'] as const).map((tier) => {
        const approvedFamilies = familyDispositions.filter((family) =>
          family.approved && family.domain === domain && family.pace === pace && family.tier === tier
        );
        const approvedItems = approvedPack.filter((record) =>
          record.item.domain === domain && record.item.pace === pace && record.item.tier === tier
        );
        const quarantined = records.filter((record) =>
          record.status !== 'approved' &&
          record.item.domain === domain &&
          record.item.pace === pace &&
          record.item.tier === tier
        );
        return {
          domain,
          pace,
          tier,
          approvedCount: approvedFamilies.length + approvedItems.length,
          quarantinedCount: familyDispositions.filter((family) =>
            !family.approved && family.domain === domain && family.pace === pace && family.tier === tier
          ).length + quarantined.length,
          distinctTemplateCount: new Set([
            ...approvedFamilies.map((family) => `legacy:${family.typeId}`),
            ...approvedItems.map((record) => `${record.source.sourceId}:${record.item.templateId}`)
          ]).size,
          distinctCaseCount: new Set(approvedItems.map((record) => record.item.caseId ?? record.item.contentId)).size,
          mcqCount: approvedItems.filter((record) => record.item.responseFormat === 'single-select').length,
          openAnswerCount: approvedItems.filter((record) => record.item.responseFormat !== 'single-select').length,
          timingStatus: approvedItems.some((record) => record.item.qa.humanTiming === 'piloted') ? 'partly-piloted' : 'provisional'
        };
      })
    )
  );
  const reasoningDomains = new Set<CognitiveDomain>(['reasoning', 'language', 'planning', 'quantitative']);
  const cognitiveDomains = new Set<CognitiveDomain>(['processingSpeed', 'workingMemory', 'attention', 'flexibility']);
  const independentReasoningItems = approvedPack.filter((record) => reasoningDomains.has(record.item.domain)).length;
  const slowHardCases = new Set(approvedPack.filter((record) =>
    reasoningDomains.has(record.item.domain) && record.item.pace === 'slow' && record.item.tier === 'hard'
  ).map((record) => record.item.caseId ?? record.item.contentId)).size;
  const cognitiveConfigurations = new Set([
    ...familyDispositions.filter((family) => family.approved && cognitiveDomains.has(family.domain)).map((family) => family.typeId),
    ...approvedPack.filter((record) => cognitiveDomains.has(record.item.domain)).map((record) => record.item.templateId)
  ]).size;
  return {
    cells,
    totals: {
      independentReasoningItems,
      slowHardCases,
      cognitiveConfigurations,
      unassignedQuarantinedFamilies: familyDispositions.filter((family) =>
        !family.approved && (!family.pace || !family.tier)
      ).length,
      targets: { independentReasoningItems: 144, slowHardCases: 24, cognitiveConfigurations: 24 },
      pilotReady: independentReasoningItems >= 144 && slowHardCases >= 24 && cognitiveConfigurations >= 24
    }
  };
}
