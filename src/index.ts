import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PatternStore } from "./patternStore.js";
import { Pattern, Episode } from "./types.js";

// Optional: Define configuration schema to require configuration at connection time
export const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
});

export default function createStatelessServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "Shelf Pattern Memory",
    version: "1.0.0",
  });

  // Create pattern store instance
  const patternStore = new PatternStore();

  // Tool: Search for relevant patterns
  server.tool(
    "shelf_search_patterns",
    "Search for relevant patterns based on current context",
    {
      context: z.string().describe("Current situation or context to find patterns for"),
      limit: z.number().optional().default(5).describe("Maximum number of patterns to return"),
    },
    async ({ context, limit }) => {
      const results = await patternStore.searchPatterns(context);
      const topResults = results.slice(0, limit);
      
      const formatted = topResults.map(r => 
        `📖 ${r.pattern.name} (relevance: ${(r.relevance * 100).toFixed(0)}%)\n` +
        `   Problem: ${r.pattern.problem}\n` +
        `   Solution: ${r.pattern.solution}\n` +
        `   Confidence: ${(r.pattern.confidence * 100).toFixed(0)}%`
      ).join('\n\n');

      return {
        content: [{ 
          type: "text", 
          text: formatted || "No relevant patterns found for this context" 
        }],
      };
    }
  );

  // Tool: Apply a pattern
  server.tool(
    "shelf_apply_pattern",
    "Apply a specific pattern and track its usage",
    {
      patternId: z.string().describe("ID of the pattern to apply"),
    },
    async ({ patternId }) => {
      const pattern = await patternStore.applyPattern(patternId);
      
      if (!pattern) {
        return {
          content: [{ type: "text", text: `Pattern '${patternId}' not found` }],
        };
      }

      const exampleText = pattern.examples.length > 0
        ? `\nExample: ${pattern.examples[0].input} → ${pattern.examples[0].output}`
        : '';

      return {
        content: [{ 
          type: "text", 
          text: `✅ Applying pattern: ${pattern.name}\n\n` +
                `Solution: ${pattern.solution}${exampleText}\n\n` +
                `This pattern has been used ${pattern.usageCount} times with ${(pattern.confidence * 100).toFixed(0)}% confidence`
        }],
      };
    }
  );

  // Tool: Reinforce pattern based on outcome
  server.tool(
    "shelf_reinforce_pattern",
    "Provide feedback on pattern effectiveness",
    {
      patternId: z.string().describe("ID of the pattern to reinforce"),
      success: z.boolean().describe("Whether the pattern application was successful"),
      notes: z.string().optional().describe("Additional notes about the outcome"),
    },
    async ({ patternId, success, notes }) => {
      await patternStore.reinforcePattern(patternId, success);
      const pattern = await patternStore.getPattern(patternId);
      
      if (!pattern) {
        return {
          content: [{ type: "text", text: `Pattern '${patternId}' not found` }],
        };
      }

      const emoji = success ? '📈' : '📉';
      const outcome = success ? 'successful' : 'unsuccessful';
      
      return {
        content: [{ 
          type: "text", 
          text: `${emoji} Pattern '${pattern.name}' marked as ${outcome}\n` +
                `New confidence: ${(pattern.confidence * 100).toFixed(0)}%` +
                (notes ? `\nNotes: ${notes}` : '')
        }],
      };
    }
  );

  // Tool: List all patterns
  server.tool(
    "shelf_list_patterns",
    "List all available patterns",
    {},
    async () => {
      const patterns = await patternStore.getAllPatterns();
      
      const formatted = patterns
        .sort((a, b) => b.confidence - a.confidence)
        .map(p => 
          `• ${p.name} (${p.id})\n` +
          `  Context: ${p.context.join(', ')}\n` +
          `  Confidence: ${(p.confidence * 100).toFixed(0)}% | Used: ${p.usageCount} times`
        ).join('\n\n');

      return {
        content: [{ 
          type: "text", 
          text: `📚 Available Patterns:\n\n${formatted}` 
        }],
      };
    }
  );

  // Tool: Save episode
  server.tool(
    "shelf_save_episode",
    "Save an interaction episode for pattern learning",
    {
      context: z.string().describe("Context of the interaction"),
      actions: z.array(z.string()).describe("Actions taken during the interaction"),
      outcome: z.string().describe("Outcome of the interaction"),
      patternIds: z.array(z.string()).optional().describe("Patterns used in this episode"),
    },
    async ({ context, actions, outcome, patternIds }) => {
      const episode: Episode = {
        id: `ep-${Date.now()}`,
        timestamp: new Date(),
        context,
        actions,
        outcome,
        patternIds,
      };
      
      await patternStore.saveEpisode(episode);
      
      return {
        content: [{ 
          type: "text", 
          text: `💾 Episode saved: ${episode.id}\nContext: ${context}\nOutcome: ${outcome}` 
        }],
      };
    }
  );

  // Tool: Find similar episodes
  server.tool(
    "shelf_find_similar",
    "Find similar past episodes",
    {
      context: z.string().describe("Context to find similar episodes for"),
      limit: z.number().optional().default(3).describe("Maximum number of episodes to return"),
    },
    async ({ context, limit }) => {
      const episodes = await patternStore.findSimilarEpisodes(context, limit);
      
      if (episodes.length === 0) {
        return {
          content: [{ type: "text", text: "No similar episodes found" }],
        };
      }

      const formatted = episodes.map(ep => 
        `📝 Episode ${ep.id}\n` +
        `   Context: ${ep.context}\n` +
        `   Actions: ${ep.actions.join(' → ')}\n` +
        `   Outcome: ${ep.outcome}` +
        (ep.patternIds ? `\n   Patterns used: ${ep.patternIds.join(', ')}` : '')
      ).join('\n\n');

      return {
        content: [{ 
          type: "text", 
          text: `Found ${episodes.length} similar episodes:\n\n${formatted}` 
        }],
      };
    }
  );

  // Tool: Extract pattern from episodes
  server.tool(
    "shelf_extract_pattern",
    "Extract a pattern from similar episodes",
    {
      episodeIds: z.array(z.string()).describe("IDs of similar episodes to extract pattern from"),
      patternName: z.string().describe("Name for the new pattern"),
      problemStatement: z.string().describe("Description of the problem this pattern solves"),
    },
    async ({ episodeIds, patternName, problemStatement }) => {
      const pattern = await patternStore.extractPatternFromEpisodes(
        episodeIds,
        patternName,
        problemStatement
      );
      
      if (!pattern) {
        return {
          content: [{ 
            type: "text", 
            text: "Could not extract pattern. Need at least 2 valid episodes." 
          }],
        };
      }

      const relationsText = pattern.relations.length > 0
        ? `\nRelated patterns: ${pattern.relations.map(r => r.patternId).join(', ')}`
        : '';

      return {
        content: [{ 
          type: "text", 
          text: `🎯 Pattern extracted: ${pattern.name}\n\n` +
                `ID: ${pattern.id}\n` +
                `Context: ${pattern.context.join(', ')}\n` +
                `Problem: ${pattern.problem}\n` +
                `Solution: ${pattern.solution}\n` +
                `Initial confidence: ${(pattern.confidence * 100).toFixed(0)}%` +
                relationsText
        }],
      };
    }
  );

  return server.server;
}
