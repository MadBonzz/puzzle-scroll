export type CognitiveDomain =
  | 'processingSpeed'
  | 'workingMemory'
  | 'attention'
  | 'flexibility'
  | 'reasoning'
  | 'language';

export type Trend = 'improving' | 'stable' | 'declining';

export interface DomainScore {
  currentLevel: number;
  baselineScore: number;
  latestScore: number;
  bestScore: number;
  trend: Trend;
  lastAssessedAt?: number;
  totalPuzzlesCompleted: number;
}

export interface PuzzleAttempt {
  puzzleId: string;
  puzzleType: string;
  domain: CognitiveDomain;
  difficulty: number;
  accuracy: number;
  reactionTimeMs: number;
  completedAt: number;
  isAssessment: boolean;
}

export interface Assessment {
  id: string;
  date: number;
  type: 'baseline' | 'weekly' | 'monthly' | 'practice';
  scores: Partial<Record<CognitiveDomain, AssessmentScore>>;
}

export interface AssessmentScore {
  accuracy: number;
  reactionTimeMs: number;
  compositeScore: number;
}

export interface VisualToken {
  label: string;
  color?: string;
  tone?: 'solid' | 'outline' | 'muted';
}

export interface PuzzleVisual {
  mode: 'tiles' | 'grid' | 'comparison' | 'trail' | 'statement';
  tokens?: VisualToken[];
  left?: VisualToken[];
  right?: VisualToken[];
  columns?: number;
  note?: string;
}

export interface PuzzleRound {
  id: string;
  domain: CognitiveDomain;
  typeId: string;
  typeName: string;
  subtitle: string;
  difficulty: number;
  isAssessment: boolean;
  prompt: string;
  visual?: PuzzleVisual;
  requiresReady?: boolean;
  studyPrompt?: string;
  studyVisual?: PuzzleVisual;
  studyDurationMs?: number;
  choices: string[];
  correctIndex: number;
  explanation: string;
}
