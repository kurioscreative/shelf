import { PatternStore } from './patternStorePostgres.js';
import { Pattern, Episode } from './types.js';

async function testPostgresStore() {
  console.log('🧪 Testing PostgreSQL Pattern Store...\n');
  
  try {
    const store = await PatternStore.create();
    
    // Test 1: Get all patterns
    console.log('1️⃣ Getting all patterns:');
    const allPatterns = await store.getAllPatterns();
    console.log(`Found ${allPatterns.length} patterns:`);
    allPatterns.forEach(p => console.log(`  - ${p.name} (confidence: ${p.confidence})`));
    
    // Test 2: Search patterns
    console.log('\n2️⃣ Searching for patterns with context "learning":');
    const searchResults = await store.searchPatterns('user is learning something new');
    searchResults.forEach(result => {
      console.log(`  - ${result.pattern.name} (relevance: ${result.relevance.toFixed(2)}) - ${result.reason}`);
    });
    
    // Test 3: Apply a pattern
    console.log('\n3️⃣ Applying pattern "progressive-disclosure":');
    const applied = await store.applyPattern('progressive-disclosure');
    if (applied) {
      console.log(`  Applied: ${applied.name}`);
      console.log(`  Usage count: ${applied.usageCount}`);
      console.log(`  Last used: ${applied.lastUsedAt}`);
    }
    
    // Test 4: Reinforce pattern
    console.log('\n4️⃣ Reinforcing pattern (success):');
    await store.reinforcePattern('progressive-disclosure', true);
    const reinforced = await store.getPattern('progressive-disclosure');
    console.log(`  New confidence: ${reinforced?.confidence}`);
    
    // Test 5: Add a new pattern
    console.log('\n5️⃣ Adding a new pattern:');
    const newPattern: Pattern = {
      id: 'postgres-test-pattern',
      name: 'PostgreSQL Test Pattern',
      context: ['database testing', 'postgres', 'storage'],
      problem: 'Testing PostgreSQL storage implementation',
      solution: 'Verify all CRUD operations work correctly',
      examples: [{
        input: 'Test database operations',
        output: 'All operations successful',
        outcome: 'success'
      }],
      relations: [],
      confidence: 0.95,
      usageCount: 0,
      createdAt: new Date()
    };
    await store.savePattern(newPattern);
    console.log(`  Added pattern: ${newPattern.name}`);
    
    // Test 6: Episodes
    console.log('\n6️⃣ Testing episodes:');
    const episode: Episode = {
      id: `ep-pg-${Date.now()}`,
      timestamp: new Date(),
      context: 'Testing PostgreSQL storage',
      actions: ['Created connection', 'Ran queries', 'Verified results'],
      outcome: 'All tests passed',
      patternIds: ['postgres-test-pattern']
    };
    await store.saveEpisode(episode);
    console.log(`  Saved episode: ${episode.id}`);
    
    const similar = await store.findSimilarEpisodes('postgres');
    console.log(`  Found ${similar.length} similar episodes`);
    
    console.log('\n✅ All PostgreSQL tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nMake sure PostgreSQL is running and the database exists.');
    console.error('Run: ./setup-postgres.sh');
    process.exit(1);
  }
}

// Run the tests
testPostgresStore();