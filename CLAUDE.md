## Core Code Philosophy
- Build the simplest solution that solves the immediate problem
- Follow "Make it work, make it right, make it fast" - in that order
- Every line of code is a liability. The best code is no code.

## Development Rules

### Start Minimal
- Implement the absolute minimum that satisfies current requirements
- Use constants instead of configuration options
- Direct implementation over abstract interfaces
- No "just in case" features

### Code Patterns

#### Constructor Parameters
- Maximum 3 parameters for any constructor
- Each parameter must be immediately necessary
```ruby
# ❌ BAD
def initialize(mode: "standard", provider: nil, guard: nil, 
               approval_system: nil, cost_tracker: nil, 
               checkpoint_interval: 5, max_concurrency: 5)

# ✅ GOOD  
def initialize(max_concurrency: 5)
```

#### Error Handling
- Only catch errors you've actually seen
- Let unexpected errors bubble up
```ruby
# ❌ BAD - Defensive programming
begin
  process_step
rescue NetworkError, TimeoutError, ParseError, ValidationError => e
  handle_error(e)
end

# ✅ GOOD - Handle what happens
begin
  process_step
rescue StandardError => e
  log_error(e)
  raise
end
```

#### Abstractions
- No interfaces with single implementations
- No base classes with one subclass
- No registries for fixed sets
```ruby
# ❌ BAD
@agent_registry ||= Agent::Registry.new
agent = @agent_registry.get(name)

# ✅ GOOD
agent = Agent.new(name)
```

### Decision Framework

Before adding any code, score it:
- User explicitly requested it: +3 points
- Current code fails without it: +3 points  
- We've worked around this 3+ times: +2 points
- It removes existing code: +1 point
- "Might need it later": -3 points
- "Best practice": -2 points
- "More flexible": -2 points
- Adds new abstractions: -1 point

**Only add features scoring > 0**

### Progressive Enhancement

```ruby
# Version 1: Just works
def execute(workflow)
  workflow.steps.each(&:run)
end

# Version 2: Add concurrency (only after proving bottleneck)
def execute(workflow)
  Async { workflow.steps.each(&:run) }.wait
end

# Version 3: Add timeout (only after experiencing hangs)
def execute(workflow, timeout: 300)
  Async do
    workflow.steps.each { |s| s.run_with_timeout(timeout) }
  end.wait
end
```

## Red Flags

Stop if your code has:
- Event systems with no subscribers
- Configuration for single-option features
- "revalger", "Handler", or "Registry" classes
- Mode switches that aren't used
- Checkpointing without restart crashes
- Approval systems without compliance requirements

## Common Anti-Patterns to Avoid

### Speculative Generality
```ruby
# ❌ "What if we need different execution modes?"
EXECUTION_MODES = %w[standard dry_run debug]

# ✅ Just execute
def execute(workflow)
  # implementation
end
```

### Premature Event Systems
```ruby
# ❌ Events before listeners
define_event :step_started, :step_completed

# ✅ Direct logging
logger.info "Step #{step.id} started"
```

### Over-Configured Initialization
```ruby
# ❌ Everything pluggable
def initialize(provider: DefaultProvider.new,
               storage: DefaultStorage.new,
               notifier: DefaultNotifier.new)

# ✅ Just construct what's needed
def initialize
  @storage = Storage.new
end
```

## Testing Approach
- Test behavior, not implementation
- No mocks for things that don't exist yet
- Integration tests over unit tests for simple code

## Final Checklist
Before committing:
- [ ] Can I delete 50% and still solve the problem?
- [ ] Would a new developer understand this in 5 minutes?
- [ ] Am I solving real problems or imaginary ones?
- [ ] Have I added code for problems I've never seen?

## Examples

### File Processing
```ruby
# ✅ GOOD - Direct and simple
def process_file(path)
  File.foreach(path) do |line|
    process_line(line)
  end
end

# ❌ BAD - Over-abstracted
class FileProcessor
  def initialize(reader: FileReader.new, parser: LineParser.new)
    @pipeline = Pipeline.new(reader, parser, processor)
  end
end
```

### API Requests
```ruby
# ✅ GOOD - Solves the need
def fetch_user(id)
  response = Net::HTTP.get(URI("#{API_URL}/users/#{id}"))
  JSON.parse(response)
end

# ❌ BAD - Enterprise-ready™
class APIClient
  include Retryable
  include Cacheable
  include Instrumented
  include CircuitBreaker
end
```

Remember: Start simple. Add complexity only when reality forces you to.



