import { Pattern, PatternSearchResult, Episode } from './types.js';
import { PatternExtractor } from './patternExtractor.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PatternStore {
  private patterns: Map<string, Pattern> = new Map();
  private episodes: Map<string, Episode> = new Map();
  private extractor: PatternExtractor;
  private dataDir: string;
  private patternsFile: string;
  private episodesFile: string;

  constructor() {
    this.extractor = new PatternExtractor();
    this.dataDir = path.join(__dirname, '..', 'data');
    this.patternsFile = path.join(this.dataDir, 'patterns.json');
    this.episodesFile = path.join(this.dataDir, 'episodes.json');
  }

  static async create(): Promise<PatternStore> {
    const store = new PatternStore();
    await store.initialize();
    return store;
  }

  private async initialize() {
    await this.ensureDataDirectory();
    await this.loadFromDisk();
    
    // Only add sample patterns if we have no patterns at all
    if (this.patterns.size === 0) {
      this.initializeWithSamplePatterns();
      await this.saveToDisk();
    }
  }

  private async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  private async loadFromDisk() {
    try {
      // Load patterns
      const patternsData = await fs.readFile(this.patternsFile, 'utf-8');
      const patternsArray = JSON.parse(patternsData);
      this.patterns = new Map(patternsArray.map((p: Pattern) => [
        p.id,
        { ...p, createdAt: new Date(p.createdAt), lastUsedAt: p.lastUsedAt ? new Date(p.lastUsedAt) : undefined }
      ]));
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      console.log('No existing patterns file found, starting fresh');
    }

    try {
      // Load episodes
      const episodesData = await fs.readFile(this.episodesFile, 'utf-8');
      const episodesArray = JSON.parse(episodesData);
      this.episodes = new Map(episodesArray.map((e: Episode) => [
        e.id,
        { ...e, timestamp: new Date(e.timestamp) }
      ]));
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      console.log('No existing episodes file found, starting fresh');
    }
  }

  private async saveToDisk() {
    try {
      // Save patterns
      const patternsArray = Array.from(this.patterns.values());
      await fs.writeFile(this.patternsFile, JSON.stringify(patternsArray, null, 2));

      // Save episodes
      const episodesArray = Array.from(this.episodes.values());
      await fs.writeFile(this.episodesFile, JSON.stringify(episodesArray, null, 2));
    } catch (error) {
      console.error('Error saving to disk:', error);
    }
  }

  private initializeWithSamplePatterns() {
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
      this.patterns.set(pattern.id, pattern);
    }
  }

  async savePattern(pattern: Pattern): Promise<void> {
    this.patterns.set(pattern.id, pattern);
    await this.saveToDisk();
  }

  async getPattern(id: string): Promise<Pattern | undefined> {
    return this.patterns.get(id);
  }

  async getAllPatterns(): Promise<Pattern[]> {
    return Array.from(this.patterns.values());
  }

  async searchPatterns(context: string): Promise<PatternSearchResult[]> {
    const results: PatternSearchResult[] = [];
    
    for (const pattern of this.patterns.values()) {
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
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.usageCount++;
      pattern.lastUsedAt = new Date();
      await this.saveToDisk();
    }
    return pattern;
  }

  async reinforcePattern(patternId: string, success: boolean): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      // Simple confidence adjustment
      const adjustment = success ? 0.05 : -0.02;
      pattern.confidence = Math.max(0.1, Math.min(1.0, pattern.confidence + adjustment));
      await this.saveToDisk();
    }
  }

  async saveEpisode(episode: Episode): Promise<void> {
    this.episodes.set(episode.id, episode);
    await this.saveToDisk();
  }

  async findSimilarEpisodes(context: string, limit: number = 5): Promise<Episode[]> {
    const episodes = Array.from(this.episodes.values());
    
    // Simple similarity based on context matching
    const scored = episodes.map(episode => {
      const contextLower = context.toLowerCase();
      const episodeContextLower = episode.context.toLowerCase();
      
      // Calculate similarity (very basic for now)
      let score = 0;
      if (episodeContextLower.includes(contextLower) || contextLower.includes(episodeContextLower)) {
        score = 0.5;
      }
      
      // Check for common words
      const contextWords = new Set(contextLower.split(/\s+/));
      const episodeWords = new Set(episodeContextLower.split(/\s+/));
      const commonWords = [...contextWords].filter(w => episodeWords.has(w));
      score += commonWords.length * 0.1;
      
      return { episode, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter(item => item.score > 0)
      .map(item => item.episode);
  }

  async extractPatternFromEpisodes(
    episodeIds: string[], 
    patternName: string, 
    problemStatement: string
  ): Promise<Pattern | null> {
    const episodes = episodeIds
      .map(id => this.episodes.get(id))
      .filter((ep): ep is Episode => ep !== undefined);
    
    if (episodes.length < 2) {
      return null;
    }

    const pattern = this.extractor.extractPattern(episodes, patternName, problemStatement);
    
    if (pattern) {
      // Find related patterns
      const allPatterns = Array.from(this.patterns.values());
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
}