# frozen_string_literal: true

require "spec_helper"

RSpec.describe Shelf::Server do
  let(:temp_home) { Dir.mktmpdir }
  let(:patterns_dir) { File.join(temp_home, ".shelf", "patterns") }
  let(:transport) { instance_double(MCP::Server::Transports::StdioTransport) }
  let(:server) do
    allow(File).to receive(:expand_path).and_call_original
    allow(File).to receive(:expand_path).with("~/.shelf/patterns").and_return(patterns_dir)
    allow(File).to receive(:expand_path).with("~/.shelf").and_return(File.join(temp_home, ".shelf"))
    described_class.new
  end

  before do
    allow(MCP::Server::Transports::StdioTransport).to receive(:new).and_return(transport)
    allow(transport).to receive(:open)
    allow(server).to receive(:warn)
  end

  after do
    FileUtils.rm_rf(temp_home)
  end

  describe "#initialize" do
    it "creates patterns directory" do
      expect(Dir.exist?(patterns_dir)).to be true
    end

    it "creates an MCP server" do
      expect(server.instance_variable_get(:@mcp_server)).to be_a(MCP::Server)
    end

    it "configures MCP server with correct name and version" do
      mcp = server.instance_variable_get(:@mcp_server)
      expect(mcp.name).to eq("shelf")
      expect(mcp.version).to eq("0.1.0")
    end

    it "sets up resources on the MCP server" do
      mcp = server.instance_variable_get(:@mcp_server)
      expect(mcp.resources).to be_an(Array)
      expect(mcp.resources.first.uri).to eq("shelf://patterns")
    end

    it "creates example pattern on first run" do
      example_file = File.join(patterns_dir, "example.md")
      expect(File.exist?(example_file)).to be true
      expect(File.read(example_file)).to include("Shelf MCP Usage Patterns")
    end
  end

  describe "#start" do
    it "logs startup info with pattern count" do
      expect(server).to receive(:warn).with(/Shelf MCP server starting with \d+ patterns? available/)
      server.start
    end

    it "creates and opens stdio transport" do
      mcp = server.instance_variable_get(:@mcp_server)
      expect(MCP::Server::Transports::StdioTransport).to receive(:new).with(mcp).and_return(transport)
      expect(transport).to receive(:open)
      server.start
    end
  end
end
