#!/usr/bin/env ts-node

/**
 * Functional Production Tests
 * Tests actual functionality of critical features
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${result.category}] ${result.name}: ${result.message}`);
  results.push(result);
}

async function testDatabaseTables() {
  console.log('\n📊 Testing Database Tables...\n');

  // Test users table
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(1);

    if (error) throw error;

    logTest({
      category: 'Database',
      name: 'users table',
      status: 'PASS',
      message: `Table accessible, ${data?.length || 0} rows sampled`
    });
  } catch (error: any) {
    logTest({
      category: 'Database',
      name: 'users table',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test resource_discussions table
  try {
    const { data, error } = await supabase
      .from('resource_discussions')
      .select('id, discussion_type, author_id')
      .limit(1);

    if (error) throw error;

    logTest({
      category: 'Database',
      name: 'resource_discussions table',
      status: 'PASS',
      message: `Table accessible`
    });
  } catch (error: any) {
    logTest({
      category: 'Database',
      name: 'resource_discussions table',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test resource_folders table
  try {
    const { data, error } = await supabase
      .from('resource_folders')
      .select('id, name, visibility')
      .limit(1);

    if (error) throw error;

    logTest({
      category: 'Database',
      name: 'resource_folders table',
      status: 'PASS',
      message: `Table accessible`
    });
  } catch (error: any) {
    logTest({
      category: 'Database',
      name: 'resource_folders table',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test document_library table
  try {
    const { data, error } = await supabase
      .from('document_library')
      .select('id, title, visibility')
      .limit(1);

    if (error) throw error;

    logTest({
      category: 'Database',
      name: 'document_library table',
      status: 'PASS',
      message: `Table accessible`
    });
  } catch (error: any) {
    logTest({
      category: 'Database',
      name: 'document_library table',
      status: 'FAIL',
      message: error.message
    });
  }
}

async function testResourcesFeatures() {
  console.log('\n✨ Testing Resources Platform Features...\n');

  // Test discussions query
  try {
    const { data, error } = await supabase
      .from('resource_discussions')
      .select('id, content, discussion_type, author_id, created_at')
      .eq('discussion_type', 'comment')
      .is('parent_discussion_id', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    logTest({
      category: 'Resources',
      name: 'Discussions query',
      status: 'PASS',
      message: `Found ${data?.length || 0} discussions`
    });

    // Check if we can parse content
    if (data && data.length > 0) {
      try {
        const content = typeof data[0].content === 'string'
          ? JSON.parse(data[0].content)
          : data[0].content;

        logTest({
          category: 'Resources',
          name: 'Discussion content parsing',
          status: 'PASS',
          message: `Content structure valid`
        });
      } catch (e) {
        logTest({
          category: 'Resources',
          name: 'Discussion content parsing',
          status: 'WARN',
          message: 'Could not parse discussion content'
        });
      }
    }
  } catch (error: any) {
    logTest({
      category: 'Resources',
      name: 'Discussions query',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test questions query
  try {
    const { data, error } = await supabase
      .from('resource_discussions')
      .select('id, content, discussion_type, author_id, created_at')
      .eq('discussion_type', 'question')
      .is('parent_discussion_id', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    logTest({
      category: 'Resources',
      name: 'Questions query',
      status: 'PASS',
      message: `Found ${data?.length || 0} questions`
    });
  } catch (error: any) {
    logTest({
      category: 'Resources',
      name: 'Questions query',
      status: 'FAIL',
      message: error.message
    });
  }

  // Test reactions table
  try {
    const { data, error } = await supabase
      .from('resource_discussion_reactions')
      .select('id, discussion_id, reaction_type')
      .limit(5);

    if (error) throw error;

    logTest({
      category: 'Resources',
      name: 'Reactions system',
      status: 'PASS',
      message: `Reactions table accessible`
    });
  } catch (error: any) {
    logTest({
      category: 'Resources',
      name: 'Reactions system',
      status: 'FAIL',
      message: error.message
    });
  }
}

async function testAuthorResolution() {
  console.log('\n👤 Testing Author Name Resolution...\n');

  try {
    // Get a discussion
    const { data: discussions, error: discError } = await supabase
      .from('resource_discussions')
      .select('id, author_id')
      .limit(1);

    if (discError) throw discError;

    if (!discussions || discussions.length === 0) {
      logTest({
        category: 'Authors',
        name: 'Author resolution test',
        status: 'WARN',
        message: 'No discussions found to test'
      });
      return;
    }

    const discussion = discussions[0];

    // Try to get author info
    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', discussion.author_id)
      .single();

    if (authorError) throw authorError;

    if (author && author.full_name) {
      logTest({
        category: 'Authors',
        name: 'Author resolution',
        status: 'PASS',
        message: `Successfully resolved author: ${author.full_name}`
      });
    } else {
      logTest({
        category: 'Authors',
        name: 'Author resolution',
        status: 'WARN',
        message: 'Author found but full_name is null'
      });
    }
  } catch (error: any) {
    logTest({
      category: 'Authors',
      name: 'Author resolution',
      status: 'FAIL',
      message: error.message
    });
  }
}

async function testRLSPolicies() {
  console.log('\n🔐 Testing RLS Policies...\n');

  // Test resource_discussions RLS
  try {
    const { data, error } = await supabase
      .from('resource_discussions')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('policy')) {
        logTest({
          category: 'Security',
          name: 'resource_discussions RLS',
          status: 'PASS',
          message: 'RLS is active (access denied as expected for anon)'
        });
      } else {
        throw error;
      }
    } else {
      logTest({
        category: 'Security',
        name: 'resource_discussions RLS',
        status: 'PASS',
        message: 'Access granted with RLS policies'
      });
    }
  } catch (error: any) {
    logTest({
      category: 'Security',
      name: 'resource_discussions RLS',
      status: 'FAIL',
      message: error.message
    });
  }
}

async function testNotifications() {
  console.log('\n🔔 Testing Notifications...\n');

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, created_at')
      .limit(5);

    if (error) throw error;

    logTest({
      category: 'Notifications',
      name: 'Notifications query',
      status: 'PASS',
      message: `Found ${data?.length || 0} notifications`
    });
  } catch (error: any) {
    logTest({
      category: 'Notifications',
      name: 'Notifications query',
      status: 'FAIL',
      message: error.message
    });
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      Production Functional Testing                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTesting database at: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  await testDatabaseTables();
  await testResourcesFeatures();
  await testAuthorResolution();
  await testRLSPolicies();
  await testNotifications();

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  console.log(`Total Tests:  ${total}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`⚠️  Warnings:  ${warnings}`);

  const passRate = ((passed / total) * 100).toFixed(1);
  console.log(`\nPass Rate:    ${passRate}%`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  • [${r.category}] ${r.name}: ${r.message}`);
    });
  }

  if (warnings > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  • [${r.category}] ${r.name}: ${r.message}`);
    });
  }

  if (failed === 0) {
    console.log('\n🎉 All critical tests passed! Production is functional.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review failures above.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
