# frozen_string_literal: true

RSpec.describe Shelf do
  it "has a version number" do
    expect(Shelf::VERSION).not_to be nil
  end

  it "defines the expected constants" do
    expect(Shelf::VERSION).to match(/^\d+\.\d+\.\d+$/)
  end

  it "defines an Error class" do
    expect(Shelf::Error).to be < StandardError
  end
end
