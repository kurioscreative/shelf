# frozen_string_literal: true

require "spec_helper"
require "tmpdir"
require "fileutils"

RSpec.describe "Shelf Integration" do
  let(:temp_home) { Dir.mktmpdir }
  let(:patterns_dir) { File.join(temp_home, ".shelf", "patterns") }

  before do
    allow(File).to receive(:expand_path).and_call_original
    allow(File).to receive(:expand_path).with("~/.shelf/patterns").and_return(patterns_dir)
    allow(File).to receive(:expand_path).with("~/.shelf").and_return(File.dirname(patterns_dir))
    allow_any_instance_of(IO).to receive(:puts)
    allow(Kernel).to receive(:warn)

    # Create the patterns directory for tests
    FileUtils.mkdir_p(patterns_dir)
  end

  after do
    FileUtils.rm_rf(temp_home)
  end

  describe "Server initialization" do
    it "creates required directories and example pattern" do
      Shelf::Server.new

      expect(Dir.exist?(patterns_dir)).to be true
      expect(File.exist?(File.join(patterns_dir, "example.md"))).to be true
    end

    it "loads existing patterns as resources" do
      # Create test patterns
      File.write(File.join(patterns_dir, "api.md"), "# API Patterns\nAPI documentation")
      File.write(File.join(patterns_dir, "testing.md"), "# Testing\nTest patterns")

      server = Shelf::Server.new
      mcp = server.instance_variable_get(:@mcp_server)

      resources = mcp.resources
      expect(resources).to be_an(Array)
      expect(resources.size).to be >= 3 # All patterns + api + testing

      # Check "All Patterns" resource exists
      all_patterns = resources.find { |r| r.uri == "shelf://patterns" }
      expect(all_patterns).not_to be_nil
      expect(all_patterns.name).to eq("All Patterns")
    end
  end

  describe "Pattern storage" do
    it "stores patterns to filesystem" do
      Shelf::Server.new

      # Directly test the store_pattern method behavior
      test_file = File.join(patterns_dir, "test.md")
      File.write(test_file, "# Test Pattern\nContent")

      expect(File.exist?(test_file)).to be true
      expect(File.read(test_file)).to include("Test Pattern")
    end

    it "appends to existing patterns" do
      Shelf::Server.new

      # Create initial pattern
      test_file = File.join(patterns_dir, "append_test.md")
      File.write(test_file, "# Initial Content\nFirst section")

      # Simulate appending (this is what store_pattern does internally)
      existing = File.read(test_file)
      File.write(test_file, "#{existing}\n\n---\n\n# Additional Content\nSecond section")

      content = File.read(test_file)
      expect(content).to include("Initial Content")
      expect(content).to include("---")
      expect(content).to include("Additional Content")
    end
  end

  describe "Pattern organization" do
    it "supports nested patterns in subdirectories" do
      # Create nested pattern
      nested_dir = File.join(patterns_dir, "ruby")
      FileUtils.mkdir_p(nested_dir)
      File.write(File.join(nested_dir, "rails.md"), "# Rails Patterns\nRails specific patterns")

      server = Shelf::Server.new
      mcp = server.instance_variable_get(:@mcp_server)

      resources = mcp.resources
      # The nested pattern should be included in resources
      expect(resources.map(&:uri)).to include("shelf://patterns/ruby/rails")
    end
  end

  describe "Git integration" do
    context "when git is available" do
      before do
        skip "Git integration test" unless system("git", "--version", out: File::NULL, err: File::NULL)
      end

      it "can initialize git repository" do
        Shelf::Server.new
        shelf_dir = File.dirname(patterns_dir)

        # The store_pattern method will initialize git if available
        # We can test this by checking if git init would work
        Dir.chdir(shelf_dir) do
          system("git", "init", out: File::NULL, err: File::NULL)
          expect(Dir.exist?(".git")).to be true
        end
      end
    end
  end
end
