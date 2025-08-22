module Shelf
  class StorePatternTool < MCP::Tool
    description "Store a new development pattern to shelf"
    input_schema(
      properties: {
        category: {
          type: "string",
          description: "Category name (webhooks, caching, debugging, etc)"
        },
        pattern: {
          type: "string",
          # description: "Pattern content in markdown format"
          description: <<~DESC
            Pattern content in markdown format. Use the following template, replacing {braces} with your content:
            # {Pattern Name} ★★☆

            ## Context
            In situations where {larger context}, after {prerequisite patterns}...

            ## Problem
            {Core tension}. On one hand {force 1}, but {force 2} pulls in the
            opposite direction.
            Previous attempts using {approach} fail because {reason}.

            ## Solution
            Therefore: {essential configuration}

            ```{code}
            # Core invariant structure

            This works because {key insight about forces}.

            Resulting Context

            After applying this pattern:
            - You can now apply {subsequent patterns}
            - Watch for {new tensions that emerge}
            - The system now has {new quality/property}

            Related Patterns

            - Refines: {larger pattern}
            - Refined by: {smaller patterns}
            - Alternative to: {competing pattern}
          DESC
        },
        append: {
          type: "boolean",
          description: "Append to existing file (true) or replace (false)",
          default: true
        }
      },
      required: %w[category pattern]
    )

    def self.call(category:, pattern:, append: true)
      patterns_dir = File.expand_path("~/.shelf/patterns")
      FileUtils.mkdir_p(patterns_dir)

      filename = category.end_with?(".md") ? category : "#{category}.md"
      filepath = File.join(patterns_dir, filename)

      if append && File.exist?(filepath)
        existing = File.read(filepath)
        File.write(filepath, "#{existing}\n\n---\n\n#{pattern}")
        commit_message = "Update #{category} pattern"
      else
        File.write(filepath, pattern)
        commit_message = "Add #{category} pattern"
      end

      # Simple git commit if available
      if system("git", "--version", out: File::NULL, err: File::NULL)
        shelf_dir = File.expand_path("~/.shelf")
        Dir.chdir(shelf_dir) do
          unless Dir.exist?(".git")
            system("git", "init", out: File::NULL, err: File::NULL)
            File.write(".gitignore", ".DS_Store\n*.swp\n*.swo\n*~\n.#*\n") unless File.exist?(".gitignore")
          end
          system("git", "add", ".", out: File::NULL, err: File::NULL)
          system("git", "commit", "-m", commit_message, out: File::NULL, err: File::NULL)
        end
      end

      MCP::Tool::Response.new([
                                {
                                  type: "text",
                                  text: "Pattern stored in #{filename}"
                                }
                              ])
    rescue StandardError => e
      warn "Error storing pattern: #{e.message}"
      warn e.backtrace.first(50).join("\n")
      MCP::Tool::Response.new([
                                {
                                  type: "text",
                                  text: "Error storing pattern: #{e.message}"
                                }
                              ], is_error: true)
    end
  end
end
