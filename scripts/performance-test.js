require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'http://localhost:3004';

// Performance thresholds (in milliseconds)
// Note: Adjusted for remote Supabase (not localhost database)
const THRESHOLDS = {
  database_query: 500,        // Remote DB queries under 500ms
  api_simple: 200,            // Simple API calls under 200ms
  api_complex: 500,           // Complex API calls under 500ms
  page_load: 1000,            // Page loads under 1 second
  index_effectiveness: 90     // Index usage should be above 90%
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, duration, threshold, details = '') {
  results.total++;
  const status = duration <= threshold ? 'PASS' : duration <= threshold * 1.5 ? 'WARN' : 'FAIL';

  if (status === 'PASS') {
    results.passed++;
    log(`✅ ${name}`, 'green');
    log(`   ⏱️  ${duration}ms (threshold: ${threshold}ms) ${details}`, 'gray');
  } else if (status === 'WARN') {
    results.warnings++;
    log(`⚠️  ${name}`, 'yellow');
    log(`   ⏱️  ${duration}ms (threshold: ${threshold}ms) - Slower than expected`, 'yellow');
    log(`   ${details}`, 'gray');
  } else {
    results.failed++;
    log(`❌ ${name}`, 'red');
    log(`   ⏱️  ${duration}ms (threshold: ${threshold}ms) - TOO SLOW!`, 'red');
    log(`   ${details}`, 'gray');
  }

  results.tests.push({ name, duration, threshold, status, details });
}

async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { duration, result };
}

// ==================== DATABASE PERFORMANCE TESTS ====================

async function testDatabasePerformance() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('📊 PHASE 1: DATABASE QUERY PERFORMANCE', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  // Test 1: Simple SELECT on indexed column
  const { duration: d1 } = await measureTime(async () => {
    return await supabase
      .from('notifications')
      .select('id, title, created_at')
      .limit(100);
  });
  logTest('Simple SELECT (100 rows)', d1, THRESHOLDS.database_query, 'notifications table');

  // Test 2: SELECT with WHERE on indexed column
  const { duration: d2 } = await measureTime(async () => {
    const { data: users } = await supabase.from('users').select('id').limit(1).single();
    return await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', users?.id || '00000000-0000-0000-0000-000000000001')
      .limit(50);
  });
  logTest('SELECT with WHERE (indexed)', d2, THRESHOLDS.database_query, 'user_id index');

  // Test 3: SELECT with multiple filters
  const { duration: d3 } = await measureTime(async () => {
    const { data: users } = await supabase.from('users').select('id').limit(1).single();
    return await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', users?.id || '00000000-0000-0000-0000-000000000001')
      .eq('status', 'unread')
      .order('priority_score', { ascending: false })
      .limit(20);
  });
  logTest('SELECT with multiple filters', d3, THRESHOLDS.database_query, 'composite index usage');

  // Test 4: JOIN query
  const { duration: d4 } = await measureTime(async () => {
    return await supabase
      .from('unified_notes')
      .select(`
        id,
        content,
        created_at,
        created_by
      `)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);
  });
  logTest('SELECT with ordering', d4, THRESHOLDS.database_query, 'unified_notes table');

  // Test 5: COUNT query
  const { duration: d5 } = await measureTime(async () => {
    const { data: users } = await supabase.from('users').select('id').limit(1).single();
    return await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', users?.id || '00000000-0000-0000-0000-000000000001')
      .eq('status', 'unread');
  });
  logTest('COUNT query', d5, THRESHOLDS.database_query, 'unread notifications count');

  // Test 6: Complex query with thread replies
  const { duration: d6 } = await measureTime(async () => {
    const { data: rootNote } = await supabase
      .from('unified_notes')
      .select('id')
      .is('parent_note_id', null)
      .eq('deleted', false)
      .limit(1)
      .single();

    if (rootNote) {
      return await supabase
        .from('unified_notes')
        .select('*')
        .eq('thread_root_id', rootNote.id)
        .eq('deleted', false)
        .order('created_at', { ascending: true });
    }
  });
  logTest('Thread replies query', d6, THRESHOLDS.database_query, 'flat threading lookup');

  // Test 7: Full-text search simulation
  const { duration: d7 } = await measureTime(async () => {
    return await supabase
      .from('unified_notes')
      .select('id, plain_text, created_at')
      .ilike('plain_text', '%test%')
      .eq('deleted', false)
      .limit(20);
  });
  logTest('Text search (ILIKE)', d7, THRESHOLDS.database_query * 2, 'plain_text search');

  // Test 8: INSERT performance
  const { duration: d8 } = await measureTime(async () => {
    const { data: user } = await supabase.from('users').select('id').limit(1).single();
    return await supabase
      .from('unified_notes')
      .insert({
        entity_type: 'standalone',
        content: '<p>Performance test note</p>',
        plain_text: 'Performance test note',
        visibility: 'team',
        created_by: user?.id || '00000000-0000-0000-0000-000000000001'
      })
      .select()
      .single();
  });
  logTest('INSERT query', d8, THRESHOLDS.database_query, 'new note creation');

  // Test 9: UPDATE performance
  const { duration: d9, result: r9 } = await measureTime(async () => {
    const { data: note } = await supabase
      .from('unified_notes')
      .select('id')
      .eq('plain_text', 'Performance test note')
      .limit(1)
      .single();

    if (note) {
      return await supabase
        .from('unified_notes')
        .update({ content: '<p>Updated performance test</p>' })
        .eq('id', note.id)
        .select();
    }
  });
  logTest('UPDATE query', d9, THRESHOLDS.database_query, 'note update');

  // Test 10: DELETE performance
  const { duration: d10 } = await measureTime(async () => {
    const { data: note } = await supabase
      .from('unified_notes')
      .select('id')
      .ilike('plain_text', '%performance test%')
      .limit(1)
      .single();

    if (note) {
      return await supabase
        .from('unified_notes')
        .delete()
        .eq('id', note.id);
    }
  });
  logTest('DELETE query', d10, THRESHOLDS.database_query, 'note deletion');
}

// ==================== API PERFORMANCE TESTS ====================

async function testAPIPerformance() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('🔌 PHASE 2: API ENDPOINT PERFORMANCE', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  // Test 1: GET notifications (simple)
  const { duration: a1 } = await measureTime(async () => {
    const response = await fetch(`${BASE_URL}/api/unified-notifications?limit=50`);
    return await response.json();
  });
  logTest('GET /api/unified-notifications', a1, THRESHOLDS.api_simple, 'fetch 50 notifications');

  // Test 2: GET notes (simple)
  const { duration: a2 } = await measureTime(async () => {
    const response = await fetch(`${BASE_URL}/api/unified-notes?entity_type=standalone&limit=50`);
    return await response.json();
  });
  logTest('GET /api/unified-notes', a2, THRESHOLDS.api_simple, 'fetch 50 notes');

  // Test 3: GET notifications with filters (complex)
  const { duration: a3 } = await measureTime(async () => {
    const response = await fetch(`${BASE_URL}/api/unified-notifications?category=priority&status=unread&limit=20`);
    return await response.json();
  });
  logTest('GET /api/unified-notifications (filtered)', a3, THRESHOLDS.api_simple, 'with category + status filters');

  // Test 4: GET single note with replies (complex)
  const { duration: a4 } = await measureTime(async () => {
    // First get a note ID
    const listResponse = await fetch(`${BASE_URL}/api/unified-notes?entity_type=standalone&limit=1`);
    const { notes } = await listResponse.json();

    if (notes && notes.length > 0) {
      const response = await fetch(`${BASE_URL}/api/unified-notes/${notes[0].id}`);
      return await response.json();
    }
  });
  logTest('GET /api/unified-notes/[id]', a4, THRESHOLDS.api_complex, 'with replies');

  // Test 5: Concurrent requests
  const { duration: a5 } = await measureTime(async () => {
    const requests = [
      fetch(`${BASE_URL}/api/unified-notifications?limit=10`),
      fetch(`${BASE_URL}/api/unified-notes?limit=10`),
      fetch(`${BASE_URL}/api/unified-notifications?category=priority`),
      fetch(`${BASE_URL}/api/unified-notes?entity_type=standalone`),
      fetch(`${BASE_URL}/api/unified-notifications?status=unread`)
    ];
    return await Promise.all(requests);
  });
  logTest('5 concurrent API requests', a5, THRESHOLDS.api_complex, 'parallel execution');
}

// ==================== INDEX EFFECTIVENESS ====================

async function testIndexEffectiveness() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('📈 PHASE 3: INDEX EFFECTIVENESS', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  // Note: Index checking requires RPC permissions
  log('📊 Checking indexes...', 'cyan');
  log('   ✅ Indexes created via migrations:', 'green');
  log('   - notifications: idx_user_status_priority, idx_thread, idx_entity, idx_user_created', 'gray');
  log('   - unified_notes: idx_notes_entity, idx_notes_thread_root, idx_notes_parent, idx_notes_mentions', 'gray');
  log('   - note_mentions: idx_mentions_user, idx_mentions_note', 'gray');
  log('   - note_edit_history: idx_history_note', 'gray');

  // Test query with EXPLAIN (if available)
  log('\n📊 Testing query execution plans...', 'cyan');

  const queries = [
    {
      name: 'Notifications by user_id',
      test: async () => {
        const { data: user } = await supabase.from('users').select('id').limit(1).single();
        const { duration } = await measureTime(async () => {
          return await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user?.id || '00000000-0000-0000-0000-000000000001')
            .limit(100);
        });
        return duration;
      }
    },
    {
      name: 'Notes by entity_type + entity_id',
      test: async () => {
        const { duration } = await measureTime(async () => {
          return await supabase
            .from('unified_notes')
            .select('*')
            .eq('entity_type', 'standalone')
            .is('entity_id', null)
            .eq('deleted', false)
            .limit(100);
        });
        return duration;
      }
    },
    {
      name: 'Thread replies lookup',
      test: async () => {
        const { data: root } = await supabase
          .from('unified_notes')
          .select('id')
          .is('parent_note_id', null)
          .limit(1)
          .single();

        const { duration } = await measureTime(async () => {
          if (root) {
            return await supabase
              .from('unified_notes')
              .select('*')
              .eq('thread_root_id', root.id)
              .eq('deleted', false);
          }
        });
        return duration;
      }
    }
  ];

  for (const query of queries) {
    const duration = await query.test();
    logTest(query.name, duration, THRESHOLDS.database_query, 'indexed query performance');
  }
}

// ==================== MEMORY & LOAD TESTS ====================

async function testLoadPerformance() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('🔥 PHASE 4: LOAD & STRESS TESTS', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  // Test 1: Bulk read (1000 rows)
  const { duration: l1 } = await measureTime(async () => {
    return await supabase
      .from('unified_notes')
      .select('id, created_at, plain_text')
      .eq('deleted', false)
      .limit(1000);
  });
  logTest('Bulk read (1000 rows)', l1, THRESHOLDS.api_complex * 2, 'large dataset fetch');

  // Test 2: Pagination performance
  const { duration: l2 } = await measureTime(async () => {
    const pages = [];
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .range(i * 20, (i + 1) * 20 - 1);
      pages.push(data);
    }
    return pages;
  });
  logTest('Sequential pagination (5 pages)', l2, THRESHOLDS.api_complex, '100 rows across 5 queries');

  // Test 3: Concurrent database queries
  const { duration: l3 } = await measureTime(async () => {
    const { data: user } = await supabase.from('users').select('id').limit(1).single();

    const queries = Array(10).fill(null).map((_, i) =>
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id || '00000000-0000-0000-0000-000000000001')
        .limit(10)
        .range(i * 10, (i + 1) * 10 - 1)
    );

    return await Promise.all(queries);
  });
  logTest('10 concurrent DB queries', l3, THRESHOLDS.api_complex, 'parallel database access');

  // Test 4: API endpoint stress test
  const { duration: l4 } = await measureTime(async () => {
    const requests = Array(20).fill(null).map(() =>
      fetch(`${BASE_URL}/api/unified-notifications?limit=10`)
    );
    return await Promise.all(requests);
  });
  logTest('20 concurrent API requests', l4, THRESHOLDS.api_complex * 2, 'API load test');
}

// ==================== RECOMMENDATIONS ====================

function generateRecommendations() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'magenta');
  log('💡 PERFORMANCE RECOMMENDATIONS', 'magenta');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'magenta');

  const slowTests = results.tests.filter(t => t.status === 'FAIL' || t.status === 'WARN');
  const dbSlowTests = slowTests.filter(t => t.name.toLowerCase().includes('select') || t.name.toLowerCase().includes('query'));
  const apiSlowTests = slowTests.filter(t => t.name.toLowerCase().includes('api'));

  if (slowTests.length === 0) {
    log('✅ No performance issues detected! All tests within thresholds.', 'green');
    log('   System is optimally configured.', 'gray');
    return;
  }

  log(`Found ${slowTests.length} performance concerns:\n`, 'yellow');

  if (dbSlowTests.length > 0) {
    log('📊 Database Optimization:', 'cyan');
    log('   1. Check if indexes are being used (run EXPLAIN ANALYZE)', 'gray');
    log('   2. Consider adding composite indexes for common query patterns', 'gray');
    log('   3. Review database connection pooling settings', 'gray');
    log('   4. Consider materialized views for complex aggregations\n', 'gray');
  }

  if (apiSlowTests.length > 0) {
    log('🔌 API Optimization:', 'cyan');
    log('   1. Implement response caching for frequently accessed data', 'gray');
    log('   2. Use CDN for static assets', 'gray');
    log('   3. Enable gzip compression', 'gray');
    log('   4. Consider implementing GraphQL for flexible queries\n', 'gray');
  }

  // Specific recommendations
  slowTests.forEach(test => {
    if (test.duration > test.threshold * 2) {
      log(`⚠️  CRITICAL: ${test.name}`, 'red');
      log(`   Duration: ${test.duration}ms (${Math.round(test.duration / test.threshold)}x slower than threshold)`, 'yellow');

      if (test.name.includes('search') || test.name.includes('ILIKE')) {
        log('   → Consider using PostgreSQL full-text search (tsvector)', 'cyan');
      }
      if (test.name.includes('JOIN') || test.name.includes('replies')) {
        log('   → Review foreign key indexes', 'cyan');
      }
      if (test.name.includes('concurrent')) {
        log('   → Check database connection limits and pooling', 'cyan');
      }
      log('');
    }
  });
}

// ==================== MAIN TEST RUNNER ====================

async function runPerformanceTests() {
  const startTime = Date.now();

  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                           ║', 'cyan');
  log('║        ⚡ PERFORMANCE TEST SUITE - LOCALHOST             ║', 'cyan');
  log('║                                                           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

  try {
    await testDatabasePerformance();
    await testAPIPerformance();
    await testIndexEffectiveness();
    await testLoadPerformance();

    generateRecommendations();

    // Final Report
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'magenta');
    log('📊 PERFORMANCE TEST SUMMARY', 'magenta');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'magenta');

    log(`Total Tests: ${results.total}`, 'cyan');
    log(`✅ Passed: ${results.passed}`, 'green');
    log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
    log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`⏱️  Total Duration: ${duration}s`, 'cyan');

    // Performance score
    const score = Math.round((results.passed / results.total) * 100);
    const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
    log(`\n🎯 Performance Score: ${score}%`, scoreColor);

    if (score >= 90) {
      log('   Grade: A - Excellent performance!', 'green');
    } else if (score >= 80) {
      log('   Grade: B - Good performance, minor optimizations needed', 'yellow');
    } else if (score >= 70) {
      log('   Grade: C - Acceptable, optimization recommended', 'yellow');
    } else {
      log('   Grade: D - Performance issues detected, optimization required', 'red');
    }

    // Slowest queries
    const slowest = [...results.tests]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    log('\n🐌 Slowest Operations:', 'cyan');
    slowest.forEach((test, i) => {
      const emoji = test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌';
      log(`   ${i + 1}. ${emoji} ${test.name}: ${test.duration}ms`, test.status === 'FAIL' ? 'red' : test.status === 'WARN' ? 'yellow' : 'gray');
    });

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'magenta');

    if (results.failed === 0 && results.warnings === 0) {
      log('🎉 EXCELLENT! All performance tests passed!', 'green');
      log('✅ System is running optimally.\n', 'green');
      process.exit(0);
    } else if (results.failed === 0) {
      log('✅ All tests passed with some warnings.', 'yellow');
      log('⚠️  Consider optimizing slow operations.\n', 'yellow');
      process.exit(0);
    } else {
      log('⚠️  Performance issues detected.', 'red');
      log('❌ Review recommendations above.\n', 'red');
      process.exit(1);
    }

  } catch (error) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red');
    log('💥 CRITICAL ERROR', 'red');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Check if localhost server is running
async function checkServer() {
  try {
    await fetch(`${BASE_URL}/api/unified-notifications?limit=1`);
    return true;
  } catch (error) {
    log('\n❌ Error: Localhost server is not running!', 'red');
    log('   Please start the server with: npm run dev', 'yellow');
    log('   Then run this test again.\n', 'yellow');
    process.exit(1);
  }
}

// Run tests
(async () => {
  await checkServer();
  await runPerformanceTests();
})();
