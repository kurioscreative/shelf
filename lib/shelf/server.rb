# frozen_string_literal: true

require "mcp"
require "mcp/server/transports/stdio_transport"
require "fileutils"
require "json"

require_relative "store_pattern_tool"

module Shelf
  class Server
    def initialize
      @patterns_dir = File.expand_path("~/.shelf/patterns")
      FileUtils.mkdir_p(@patterns_dir)
      ensure_example_pattern

      @mcp_server = MCP::Server.new(
        name: "shelf",
        version: VERSION,
        tools: [StorePatternTool],
        resources: {}
      )

      setup_mcp
    end

    def start
      warn "Shelf MCP server starting with #{pattern_count} pattern#{"s" if pattern_count != 1} available"
      transport = MCP::Server::Transports::StdioTransport.new(@mcp_server)
      transport.open
    end

    private

    def setup_mcp
      # Setup resources
      @mcp_server.resources = build_resources

      @mcp_server.resources_read_handler do |params|
        handle_resource_read(params)
      end
    end

    def pattern_count
      Dir.glob(File.join(@patterns_dir, "**/*.md")).count
    end

    def build_resources
      patterns = Dir.glob(File.join(@patterns_dir, "**/*.md")).map do |path|
        relative = path.sub(@patterns_dir + "/", "")
        basename_without_ext = relative.sub(".md", "")
        display_name = File.basename(relative, ".md").tr("_-", "  ").split.map(&:capitalize).join(" ")

        MCP::Resource.new(
          uri: "shelf://patterns/#{basename_without_ext}",
          name: display_name,
          description: extract_description(path),
          mime_type: "text/markdown"
        )
      end

      all_patterns = MCP::Resource.new(
        uri: "shelf://patterns",
        name: "All Patterns",
        description: "List of all available development patterns",
        mime_type: "application/json"
      )

      [all_patterns] + patterns
    end

    def handle_resource_read(params)
      uri = params[:uri]

      case uri
      when "shelf://patterns"
        patterns = Dir.glob(File.join(@patterns_dir, "**/*.md")).map do |path|
          relative = path.sub(@patterns_dir + "/", "")
          basename_without_ext = relative.sub(".md", "")

          {
            name: basename_without_ext,
            uri: "shelf://patterns/#{basename_without_ext}",
            description: extract_description(path)
          }
        end

        [{
          uri: uri,
          mimeType: "application/json",
          text: JSON.pretty_generate({
                                       patterns: patterns,
                                       total: patterns.size
                                     })
        }]
      when %r{^shelf://patterns/(.+)$}
        pattern_name = ::Regexp.last_match(1)
        filepath = File.join(@patterns_dir, "#{pattern_name}.md")

        if !File.exist?(filepath) && pattern_name.include?("/")
          filepath = File.join(@patterns_dir, pattern_name.end_with?(".md") ? pattern_name : "#{pattern_name}.md")
        end

        raise "Pattern not found: #{pattern_name}" unless File.exist?(filepath)

        [{
          uri: uri,
          mimeType: "text/markdown",
          text: File.read(filepath)
        }]

      else
        raise "Unknown resource URI: #{uri}"
      end
    end

    def extract_description(filepath)
      return nil unless File.exist?(filepath)

      lines = File.readlines(filepath).map(&:strip)
      lines.shift if lines.first&.start_with?("#")
      lines.find { |line| !line.empty? }&.slice(0, 100)
    end

    def ensure_example_pattern
      example_file = File.join(@patterns_dir, "example.md")
      return if File.exist?(example_file)

      File.write(example_file, <<~MARKDOWN)
        # Shelf MCP Usage Patterns

        ## 1. Store Project-Specific Context

        Create files in ~/.shelf/patterns/ to document critical project knowledge:

        **~/.shelf/patterns/api-auth.md**
        ```markdown
        # API Authentication

        Our API uses Bearer auth with JWT tokens that expire after 1 hour.
        Always check token expiry before making requests.
        Rate limit: 100 req/min per client.

        ## Token Refresh Flow
        1. Check if token expires in next 5 minutes
        2. If yes, request new token from /auth/refresh
        3. Update stored token in session
        ```

        **~/.shelf/patterns/debugging.md**
        ```markdown
        # Common Debugging Issues

        ## Redis Connection Pool Exhaustion
        Production issues often stem from Redis connection pool exhaustion.
        - Check REDIS_MAX_CONNECTIONS env var
        - Monitor pool usage: redis-cli INFO clients
        - Default pool size: 5, increase to 20 for high-traffic
        ```

        ## 2. Build a Knowledge Base of Solutions

        Document solved problems and architectural decisions:

        **~/.shelf/patterns/webhooks.md**
        ```markdown
        # Webhook Patterns

        ## Retry Logic
        Fixed webhook delivery issues with exponential backoff:
        - Initial retry after 1 second
        - Double the delay each time (max 5 minutes)
        - Max 5 retries before marking as failed
        - Store failed webhooks in dead letter queue

        ## Implementation
        ```ruby
        class WebhookRetry
          DELAYS = [1, 2, 4, 8, 16].map(&:minutes)
        #{"  "}
          def retry_with_backoff(attempt)
            delay = DELAYS[attempt] || 5.minutes
            WebhookJob.set(wait: delay).perform_later(webhook_id)
          end
        end
        ```
        ```

        ## 3. Create Reusable Code Templates

        Store team-specific patterns and conventions:

        **~/.shelf/patterns/testing.md**
        ```markdown
        # Testing Patterns

        ## RSpec API Test Setup
        ```ruby
        shared_context 'authenticated request' do
          let(:user) { create(:user) }
          let(:token) { JWT.encode({ user_id: user.id }, ENV['JWT_SECRET']) }
          let(:headers) { { 'Authorization' => "Bearer \#{token}" } }
        end

        # Usage
        describe 'GET /api/users' do
          include_context 'authenticated request'
        #{"  "}
          it 'returns user data' do
            get '/api/users', headers: headers
            expect(response).to have_http_status(200)
          end
        end
        ```
        ```

        ## Using in Claude Desktop

        Once patterns are saved, reference them in conversations:
        - "Check shelf://api-auth for our authentication approach"
        - "Apply the webhook retry pattern from shelf://webhooks"
        - "Use our standard test setup from shelf://testing"

        Claude will automatically read these patterns via the MCP server.
      MARKDOWN

      warn "Created example pattern at #{example_file}"
    end
  end
end
