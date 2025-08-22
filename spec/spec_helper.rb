# frozen_string_literal: true

require "shelf"
require "tmpdir"
require "fileutils"

RSpec.configure do |config|
  # Enable flags like --only-failures and --next-failure
  config.example_status_persistence_file_path = ".rspec_status"

  # Disable RSpec exposing methods globally on `Module` and `main`
  config.disable_monkey_patching!

  config.expect_with :rspec do |c|
    c.syntax = :expect
  end

  # Silence warnings during tests
  config.before(:each) do
    allow_any_instance_of(Kernel).to receive(:warn)
  end
end
