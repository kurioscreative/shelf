import { Pattern, PatternSearchResult, Episode } from './types.js';
import { PatternExtractor } from './patternExtractor.js';
import { db } from './database/connection.js';

export class PatternStore {
  private extractor: PatternExtractor;
  private initialized: boolean = false;

  constructor() {
    this.extractor = new PatternExtractor();
  }

  static async create(): Promise<PatternStore> {
    const store = new PatternStore();
    await store.initialize();
    return store;
  }

  private async initialize() {
    if (this.initialized) return;
    
    await db.initialize();
    
    // Check if we have any patterns, if not, add sample patterns
    const result = await db.query('SELECT COUNT(*) FROM patterns');
    if (parseInt(result.rows[0].count) === 0) {
      await this.initializeWithSamplePatterns();
    }
    
    this.initialized = true;
  }

  private async initializeWithSamplePatterns() {
    const samplePatterns: Pattern[] = [
      {
        id: 'progressive-disclosure',
        name: 'Progressive Disclosure',
        context: ['user is learning', 'complex topic', 'beginner level'],
        problem: 'Too much information at once overwhelms the learner',
        solution: 'Reveal complexity gradually, starting with core concepts',
        examples: [
          {
            input: 'Explain recursion',
            output: 'Start with simple counting down, then factorial, then tree traversal',
            outcome: 'success'
          }
        ],
        relations: [],
        confidence: 0.85,
        usageCount: 0,
        createdAt: new Date(),
      },
      {
        id: 'concrete-before-abstract',
        name: 'Concrete Before Abstract',
        context: ['teaching concept', 'abstract idea', 'user struggling'],
        problem: 'Abstract concepts are hard to grasp without grounding',
        solution: 'Provide concrete examples before explaining the abstraction',
        examples: [
          {
            input: 'Explain interfaces',
            output: 'Show USB ports, electrical outlets, then programming interfaces',
            outcome: 'success'
          }
        ],
        relations: [
          { type: 'leads_to', patternId: 'progressive-disclosure', strength: 0.7 }
        ],
        confidence: 0.9,
        usageCount: 0,
        createdAt: new Date(),
      }
    ];

    for (const pattern of samplePatterns) {
      await this.savePattern(pattern);
    }
  }

  async savePattern(pattern: Pattern): Promise<void> {
    const query = `
      INSERT INTO patterns (
        id, name, context, problem, solution, examples, 
        relations, confidence, usage_count, created_at, last_used_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        context = EXCLUDED.context,
        problem = EXCLUDED.problem,
        solution = EXCLUDED.solution,
        examples = EXCLUDED.examples,
        relations = EXCLUDED.relations,
        confidence = EXCLUDED.confidence,
        usage_count = EXCLUDED.usage_count,
        last_used_at = EXCLUDED.last_used_at
    `;
    
    await db.query(query, [
      pattern.id,
      pattern.name,
      pattern.context,
      pattern.problem,
      pattern.solution,
      JSON.stringify(pattern.examples),
      JSON.stringify(pattern.relations),
      pattern.confidence,
      pattern.usageCount,
      pattern.createdAt,
      pattern.lastUsedAt || null
    ]);
  }

  async getPattern(id: string): Promise<Pattern | undefined> {
    const query = 'SELECT * FROM patterns WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) return undefined;
    
    return this.rowToPattern(result.rows[0]);
  }

  async getAllPatterns(): Promise<Pattern[]> {
    const query = 'SELECT * FROM patterns ORDER BY confidence DESC';
    const result = await db.query(query);
    
    return result.rows.map((row: any) => this.rowToPattern(row));
  }

  async searchPatterns(context: string): Promise<PatternSearchResult[]> {
    // Get all patterns for now (could optimize with full-text search later)
    const patterns = await this.getAllPatterns();
    const results: PatternSearchResult[] = [];
    
    for (const pattern of patterns) {
      let relevance = 0;
      let matchedContexts: string[] = [];

      // Simple keyword matching for now
      const contextLower = context.toLowerCase();
      
      for (const patternContext of pattern.context) {
        if (contextLower.includes(patternContext.toLowerCase())) {
          relevance += 0.3;
          matchedContexts.push(patternContext);
        }
      }

      if (contextLower.includes(pattern.name.toLowerCase())) {
        relevance += 0.2;
      }

      if (pattern.problem.toLowerCase().includes(contextLower) || 
          contextLower.includes(pattern.problem.toLowerCase())) {
        relevance += 0.2;
      }

      // Boost by confidence and usage
      relevance *= pattern.confidence;
      
      if (relevance > 0) {
        results.push({
          pattern,
          relevance: Math.min(relevance, 1.0),
          reason: matchedContexts.length > 0 
            ? `Matches contexts: ${matchedContexts.join(', ')}`
            : 'Partial match on name or problem'
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  async applyPattern(patternId: string): Promise<Pattern | undefined> {
    const query = `
      UPDATE patterns 
      SET usage_count = usage_count + 1, 
          last_used_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await db.query(query, [patternId]);
    
    if (result.rows.length === 0) return undefined;
    
    return this.rowToPattern(result.rows[0]);
  }

  async reinforcePattern(patternId: string, success: boolean): Promise<void> {
    const adjustment = success ? 0.05 : -0.02;
    
    const query = `
      UPDATE patterns 
      SET confidence = LEAST(1.0, GREATEST(0.1, confidence + $1))
      WHERE id = $2
    `;
    
    await db.query(query, [adjustment, patternId]);
  }

  async saveEpisode(episode: Episode): Promise<void> {
    const query = `
      INSERT INTO episodes (id, timestamp, context, actions, outcome, pattern_ids)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        timestamp = EXCLUDED.timestamp,
        context = EXCLUDED.context,
        actions = EXCLUDED.actions,
        outcome = EXCLUDED.outcome,
        pattern_ids = EXCLUDED.pattern_ids
    `;
    
    await db.query(query, [
      episode.id,
      episode.timestamp,
      episode.context,
      episode.actions,
      episode.outcome,
      episode.patternIds
    ]);
  }

  async findSimilarEpisodes(context: string, limit: number = 5): Promise<Episode[]> {
    // Simple implementation - could be improved with full-text search
    const query = `
      SELECT * FROM episodes 
      WHERE LOWER(context) LIKE $1 OR $2 LIKE LOWER(context)
      ORDER BY timestamp DESC
      LIMIT $3
    `;
    
    const contextLower = `%${context.toLowerCase()}%`;
    const result = await db.query(query, [contextLower, contextLower, limit]);
    
    return result.rows.map((row: any) => this.rowToEpisode(row));
  }

  async extractPatternFromEpisodes(
    episodeIds: string[], 
    patternName: string, 
    problemStatement: string
  ): Promise<Pattern | null> {
    const query = 'SELECT * FROM episodes WHERE id = ANY($1)';
    const result = await db.query(query, [episodeIds]);
    
    const episodes = result.rows.map((row: any) => this.rowToEpisode(row));
    
    if (episodes.length < 2) {
      return null;
    }

    const pattern = this.extractor.extractPattern(episodes, patternName, problemStatement);
    
    if (pattern) {
      // Find related patterns
      const allPatterns = await this.getAllPatterns();
      const relatedIds = this.extractor.findRelatedPatterns(pattern, allPatterns);
      
      // Add relations to the new pattern
      pattern.relations = relatedIds.map(id => ({
        type: 'leads_to' as const,
        patternId: id,
        strength: 0.5
      }));
      
      await this.savePattern(pattern);
    }
    
    return pattern;
  }

  private rowToPattern(row: any): Pattern {
    return {
      id: row.id,
      name: row.name,
      context: row.context,
      problem: row.problem,
      solution: row.solution,
      examples: row.examples || [],
      relations: row.relations || [],
      confidence: parseFloat(row.confidence),
      usageCount: row.usage_count,
      createdAt: new Date(row.created_at),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined
    };
  }

  private rowToEpisode(row: any): Episode {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      context: row.context,
      actions: row.actions,
      outcome: row.outcome,
      patternIds: row.pattern_ids || []
    };
  }
}