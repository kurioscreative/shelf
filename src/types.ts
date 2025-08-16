export interface Pattern {
  id: string;
  name: string;
  context: string[];
  problem: string;
  solution: string;
  examples: PatternExample[];
  relations: PatternRelation[];
  confidence: number;
  usageCount: number;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface PatternExample {
  input: string;
  output: string;
  outcome: 'success' | 'failure' | 'partial';
}

export interface PatternRelation {
  type: 'leads_to' | 'refined_by' | 'conflicts_with' | 'requires';
  patternId: string;
  strength: number;
}

export interface Episode {
  id: string;
  timestamp: Date;
  context: string;
  actions: string[];
  outcome: string;
  patternIds: string[];  // Required - an episode is always an application of one or more patterns
}

export interface PatternSearchResult {
  pattern: Pattern;
  relevance: number;
  reason: string;
}