# Shelf

Shelf is an MCP (Model Context Protocol) server that allows Claude to store and retrieve development patterns, code snippets, and best practices via the `shelf://` protocol.

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'shelf'
```

And then execute:

    $ bundle install

Or install it yourself as:

    $ gem install shelf

## Usage with Claude Code

### 1. Install the gem

```bash
gem install shelf
```

### 2. Configure Claude Code

Add Shelf to your Claude Code MCP settings file (`~/Library/Application Support/Claude/config/mcp_servers.json` on macOS):

```json
{
  "shelf": {
    "command": "shelf"
  }
}
```

Or if using a locally built version:

```json
{
  "shelf": {
    "command": "ruby",
    "args": ["-I", "/path/to/shelf/lib", "/path/to/shelf/exe/shelf"]
  }
}
```

### 3. Restart Claude Code

After updating the configuration, restart Claude Code to load the Shelf MCP server.

## How it Works

Shelf provides Claude with:

- **Resource Access**: Read patterns via `shelf://patterns/[name]`
- **Pattern Storage**: Store new patterns using the `store_pattern` tool
- **Pattern Listing**: Browse all available patterns at `shelf://patterns`

### Example Usage in Claude

```
Claude: I'll store this webhook pattern for future reference.
*uses store_pattern tool with category="webhooks" and pattern content*

Claude: Let me check if we have any caching patterns.
*reads shelf://patterns/caching*
```

### Pattern Organization

Patterns are stored in `~/.shelf/patterns/` as markdown files. You can:

- Organize patterns by category (webhooks.md, caching.md, debugging.md)
- Create subdirectories for more organization
- Edit patterns directly in your favorite editor
- Share patterns by copying the markdown files

## Development

After checking out the repo, run `bin/setup` to install dependencies. Then, run `rake spec` to run the tests. You can also run `bin/console` for an interactive prompt that will allow you to experiment.

To install this gem onto your local machine, run `bundle exec rake install`. To release a new version, update the version number in `version.rb`, and then run `bundle exec rake release`, which will create a git tag for the version, push git commits and the created tag, and push the `.gem` file to [rubygems.org](https://rubygems.org).

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/kurioscreative/shelf. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [code of conduct](https://github.com/kurioscreative/shelf/blob/main/CODE_OF_CONDUCT.md).

## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

## Code of Conduct

Everyone interacting in the Shelf project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/kurioscreative/shelf/blob/main/CODE_OF_CONDUCT.md).
