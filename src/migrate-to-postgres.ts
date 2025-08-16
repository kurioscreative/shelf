import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PatternStore } from './patternStorePostgres.js';
import { Pattern, Episode } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🚀 Starting migration from JSON to PostgreSQL...\n');
  
  const dataDir = path.join(__dirname, '..', 'data');
  const patternsFile = path.join(dataDir, 'patterns.json');
  const episodesFile = path.join(dataDir, 'episodes.json');
  
  // Create PostgreSQL store
  const store = await PatternStore.create();
  
  // Migrate patterns
  try {
    const patternsData = await fs.readFile(patternsFile, 'utf-8');
    const patterns: Pattern[] = JSON.parse(patternsData);
    
    console.log(`📖 Found ${patterns.length} patterns to migrate`);
    
    for (const pattern of patterns) {
      // Ensure dates are Date objects
      pattern.createdAt = new Date(pattern.createdAt);
      if (pattern.lastUsedAt) {
        pattern.lastUsedAt = new Date(pattern.lastUsedAt);
      }
      
      await store.savePattern(pattern);
      console.log(`  ✅ Migrated pattern: ${pattern.name}`);
    }
  } catch (error) {
    console.log('  ⚠️ No patterns file found or error reading it');
  }
  
  // Migrate episodes
  try {
    const episodesData = await fs.readFile(episodesFile, 'utf-8');
    const episodes: Episode[] = JSON.parse(episodesData);
    
    console.log(`\n📝 Found ${episodes.length} episodes to migrate`);
    
    for (const episode of episodes) {
      // Ensure timestamp is a Date object
      episode.timestamp = new Date(episode.timestamp);
      
      await store.saveEpisode(episode);
      console.log(`  ✅ Migrated episode: ${episode.id}`);
    }
  } catch (error) {
    console.log('  ⚠️ No episodes file found or error reading it');
  }
  
  console.log('\n✨ Migration completed successfully!');
  console.log('\nTo use PostgreSQL storage, update your imports:');
  console.log("  FROM: import { PatternStore } from './patternStore.js'");
  console.log("  TO:   import { PatternStore } from './patternStorePostgres.js'");
  
  process.exit(0);
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});