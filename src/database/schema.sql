-- Create patterns table
CREATE TABLE IF NOT EXISTS patterns (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  context TEXT[] NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  examples JSONB DEFAULT '[]',
  relations JSONB DEFAULT '[]',
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id VARCHAR(255) PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  context TEXT NOT NULL,
  actions TEXT[] NOT NULL,
  outcome TEXT NOT NULL,
  pattern_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_usage_count ON patterns(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_patterns_updated_at ON patterns;
CREATE TRIGGER update_patterns_updated_at BEFORE UPDATE ON patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();