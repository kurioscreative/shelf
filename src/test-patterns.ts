import { PatternStore } from './patternStore.js';
import { Pattern, Episode } from './types.js';

async function testPatternStore() {
  console.log('🧪 Testing Pattern Store...\n');
  
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
    id: 'checkpoint-proceed',
    name: 'Checkpoint and Proceed',
    context: ['multi-step process', 'complex task', 'verification needed'],
    problem: 'User may get lost in complex multi-step processes',
    solution: 'Pause at key points to verify understanding before continuing',
    examples: [{
      input: 'Setting up development environment',
      output: 'After each tool install, verify it works before next step',
      outcome: 'success'
    }],
    relations: [],
    confidence: 0.75,
    usageCount: 0,
    createdAt: new Date()
  };
  await store.savePattern(newPattern);
  console.log(`  Added pattern: ${newPattern.name}`);
  
  // Test 6: Episodes
  console.log('\n6️⃣ Testing episodes:');
  const episode: Episode = {
    id: 'ep-001',
    timestamp: new Date(),
    context: 'User asked about recursion',
    actions: ['Explained with simple example', 'Built up complexity gradually'],
    outcome: 'User understood the concept',
    patternIds: ['progressive-disclosure']
  };
  await store.saveEpisode(episode);
  console.log('  Saved episode: ep-001');
  
  const similar = await store.findSimilarEpisodes('teaching recursion');
  console.log(`  Found ${similar.length} similar episodes`);
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
testPatternStore().catch(console.error);