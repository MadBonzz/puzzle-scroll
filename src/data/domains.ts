import type { CognitiveDomain } from '../types';

export interface DomainMeta {
  id: CognitiveDomain;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  tint: string;
  description: string;
}

export const domains: DomainMeta[] = [
  {
    id: 'processingSpeed',
    label: 'Processing Speed',
    shortLabel: 'Speed',
    icon: 'zap',
    color: '#C84E2F',
    tint: '#FCE8DF',
    description: 'Fast visual decisions, brief exposure, peripheral awareness.'
  },
  {
    id: 'workingMemory',
    label: 'Working Memory',
    shortLabel: 'Memory',
    icon: 'layers',
    color: '#2E6F95',
    tint: '#E4F1F8',
    description: 'Hold and update sequences, positions, numbers, and features.'
  },
  {
    id: 'attention',
    label: 'Attention & Inhibition',
    shortLabel: 'Focus',
    icon: 'target',
    color: '#277A5B',
    tint: '#E4F4ED',
    description: 'Ignore distractors, resolve conflict, and stop responses.'
  },
  {
    id: 'flexibility',
    label: 'Cognitive Flexibility',
    shortLabel: 'Switch',
    icon: 'shuffle',
    color: '#7B5E2F',
    tint: '#F2EBDD',
    description: 'Switch rules, alternate categories, and reduce switch cost.'
  },
  {
    id: 'reasoning',
    label: 'Reasoning & Logic',
    shortLabel: 'Logic',
    icon: 'box',
    color: '#5D5BB4',
    tint: '#ECEBFA',
    description: 'Infer rules, complete patterns, and satisfy constraints.'
  },
  {
    id: 'language',
    label: 'Language & Verbal',
    shortLabel: 'Words',
    icon: 'type',
    color: '#A03C6D',
    tint: '#F8E4EE',
    description: 'Word retrieval, clues, anagrams, and verbal sequencing.'
  },
  {
    id: 'planning',
    label: 'Planning & Strategy',
    shortLabel: 'Plan',
    icon: 'git-branch',
    color: '#426A3F',
    tint: '#E8F2E5',
    description: 'Multi-step planning, route selection, resource tradeoffs.'
  },
  {
    id: 'quantitative',
    label: 'Quantitative Reasoning',
    shortLabel: 'Quant',
    icon: 'hash',
    color: '#8A4F2A',
    tint: '#F4E9DF',
    description: 'Numerical patterns, balances, ratios, and symbolic rules.'
  }
];

export const domainById = Object.fromEntries(domains.map((domain) => [domain.id, domain])) as Record<CognitiveDomain, DomainMeta>;

export const domainIds = domains.map((domain) => domain.id);
