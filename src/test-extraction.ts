import { PatternStore } from './patternStore.js';
import { Episode } from './types.js';

async function testPatternExtraction() {
  console.log('🧪 Testing Pattern Extraction...\n');
  
  const store = new PatternStore();
  
  // Create some similar episodes about debugging
  const debugEpisodes: Episode[] = [
    {
      id: 'ep-debug-1',
      timestamp: new Date(),
      context: 'User trying to debug a null pointer error',
      actions: [
        'Ask for the error message',
        'Check variable initialization',
        'Add null checks',
        'Test the fix'
      ],
      outcome: 'Error resolved successfully'
    },
    {
      id: 'ep-debug-2',
      timestamp: new Date(),
      context: 'User debugging undefined variable error',
      actions: [
        'Request error details',
        'Examine variable scope',
        'Add validation',
        'Verify the solution'
      ],
      outcome: 'Issue fixed and understood'
    },
    {
      id: 'ep-debug-3',
      timestamp: new Date(),
      context: 'User has type error in function',
      actions: [
        'Get error context',
        'Review type definitions',
        'Add type guards',
        'Run tests'
      ],
      outcome: 'Type error successfully resolved'
    }
  ];

  // Save episodes
  console.log('1️⃣ Saving debugging episodes...');
  for (const ep of debugEpisodes) {
    await store.saveEpisode(ep);
    console.log(`  Saved: ${ep.id}`);
  }

  // Extract pattern from episodes
  console.log('\n2️⃣ Extracting pattern from episodes...');
  const pattern = await store.extractPatternFromEpisodes(
    ['ep-debug-1', 'ep-debug-2', 'ep-debug-3'],
    'Systematic Debugging',
    'Users struggle to debug errors without a systematic approach'
  );

  if (pattern) {
    console.log(`\n✨ Pattern Extracted:`);
    console.log(`  Name: ${pattern.name}`);
    console.log(`  ID: ${pattern.id}`);
    console.log(`  Context: ${pattern.context.join(', ')}`);
    console.log(`  Problem: ${pattern.problem}`);
    console.log(`  Solution: ${pattern.solution}`);
    console.log(`  Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
    console.log(`  Examples: ${pattern.examples.length}`);
    
    if (pattern.relations.length > 0) {
      console.log(`  Related patterns: ${pattern.relations.map(r => r.patternId).join(', ')}`);
    }
  }

  // Test finding similar episodes
  console.log('\n3️⃣ Finding similar episodes for "debugging issue"...');
  const similar = await store.findSimilarEpisodes('debugging issue', 3);
  console.log(`  Found ${similar.length} similar episodes`);
  similar.forEach(ep => {
    console.log(`    - ${ep.id}: ${ep.context.substring(0, 50)}...`);
  });

  // Create more episodes for different pattern
  const teachingEpisodes: Episode[] = [
    {
      id: 'ep-teach-1',
      timestamp: new Date(),
      context: 'User learning about async/await',
      actions: [
        'Start with callbacks example',
        'Show promise equivalent',
        'Introduce async/await syntax',
        'Practice with examples'
      ],
      outcome: 'User understood async patterns'
    },
    {
      id: 'ep-teach-2',
      timestamp: new Date(),
      context: 'User confused about promises',
      actions: [
        'Begin with synchronous code',
        'Explain asynchronous need',
        'Build up to promises',
        'Show practical usage'
      ],
      outcome: 'Concept successfully grasped'
    }
  ];

  console.log('\n4️⃣ Adding teaching episodes and extracting pattern...');
  for (const ep of teachingEpisodes) {
    await store.saveEpisode(ep);
  }

  const teachingPattern = await store.extractPatternFromEpisodes(
    ['ep-teach-1', 'ep-teach-2'],
    'Build Up Complexity',
    'Complex concepts are hard to understand when presented all at once'
  );

  if (teachingPattern) {
    console.log(`  Extracted: ${teachingPattern.name}`);
    console.log(`  Related to: ${teachingPattern.relations.map(r => r.patternId).join(', ') || 'none'}`);
  }

  // Show all patterns
  console.log('\n5️⃣ All patterns in the system:');
  const allPatterns = await store.getAllPatterns();
  allPatterns.forEach(p => {
    console.log(`  • ${p.name} (${p.id}) - ${(p.confidence * 100).toFixed(0)}% confidence`);
  });

  console.log('\n✅ Pattern extraction test completed!');
}

testPatternExtraction().catch(console.error);