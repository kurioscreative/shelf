import { Pattern, Episode, PatternExample } from './types.js';

export class PatternExtractor {
  /**
   * Extract a pattern from multiple similar episodes
   */
  extractPattern(episodes: Episode[], name: string, problemStatement: string): Pattern | null {
    if (episodes.length < 2) {
      return null; // Need at least 2 episodes to form a pattern
    }

    // Find common context elements
    const contextCounts = new Map<string, number>();
    episodes.forEach(ep => {
      const words = ep.context.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Skip short words
          contextCounts.set(word, (contextCounts.get(word) || 0) + 1);
        }
      });
    });

    // Context elements that appear in >50% of episodes
    const threshold = episodes.length * 0.5;
    const commonContext = Array.from(contextCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([word]) => word)
      .slice(0, 5); // Top 5 context elements

    // Find common action patterns
    const actionPatterns = this.findCommonActionPatterns(episodes);

    // Create examples from episodes
    const examples: PatternExample[] = episodes.slice(0, 3).map(ep => ({
      input: ep.context,
      output: ep.actions.join(' → '),
      outcome: this.categorizeOutcome(ep.outcome)
    }));

    // Calculate initial confidence based on outcome success rate
    const successRate = episodes.filter(ep => 
      this.categorizeOutcome(ep.outcome) === 'success'
    ).length / episodes.length;

    const pattern: Pattern = {
      id: this.generatePatternId(name),
      name,
      context: commonContext.length > 0 ? commonContext : ['general'],
      problem: problemStatement,
      solution: this.generateSolution(actionPatterns, episodes),
      examples,
      relations: [],
      confidence: Math.min(0.9, successRate),
      usageCount: 0,
      createdAt: new Date()
    };

    return pattern;
  }

  /**
   * Find patterns that commonly occur together
   */
  findRelatedPatterns(pattern: Pattern, allPatterns: Pattern[]): string[] {
    const related: string[] = [];
    
    // Find patterns with overlapping contexts
    for (const other of allPatterns) {
      if (other.id === pattern.id) continue;
      
      const contextOverlap = pattern.context.filter(c => 
        other.context.some(oc => oc.includes(c) || c.includes(oc))
      );
      
      if (contextOverlap.length > 0) {
        related.push(other.id);
      }
    }
    
    return related;
  }

  private findCommonActionPatterns(episodes: Episode[]): string[] {
    const actionSequences = new Map<string, number>();
    
    episodes.forEach(ep => {
      // Look for 2-action sequences
      for (let i = 0; i < ep.actions.length - 1; i++) {
        const sequence = `${ep.actions[i]} → ${ep.actions[i + 1]}`;
        actionSequences.set(sequence, (actionSequences.get(sequence) || 0) + 1);
      }
    });

    // Return sequences that appear in >30% of episodes
    const threshold = episodes.length * 0.3;
    return Array.from(actionSequences.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([sequence]) => sequence)
      .slice(0, 3);
  }

  private generateSolution(actionPatterns: string[], episodes: Episode[]): string {
    if (actionPatterns.length > 0) {
      return `Apply the following action sequence: ${actionPatterns[0]}`;
    }
    
    // Fallback: summarize common outcomes
    const successfulEpisodes = episodes.filter(ep => 
      this.categorizeOutcome(ep.outcome) === 'success'
    );
    
    if (successfulEpisodes.length > 0) {
      const firstSuccess = successfulEpisodes[0];
      return `Follow approach: ${firstSuccess.actions.join(', then ')}`;
    }
    
    return 'Analyze the context and apply appropriate actions based on examples';
  }

  private categorizeOutcome(outcome: string): 'success' | 'failure' | 'partial' {
    const lower = outcome.toLowerCase();
    if (lower.includes('success') || lower.includes('understood') || 
        lower.includes('completed') || lower.includes('solved')) {
      return 'success';
    }
    if (lower.includes('fail') || lower.includes('error') || 
        lower.includes('confused') || lower.includes('stuck')) {
      return 'failure';
    }
    return 'partial';
  }

  private generatePatternId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}