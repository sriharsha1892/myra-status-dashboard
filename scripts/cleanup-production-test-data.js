#!/usr/bin/env node

/**
 * Production Test Data Cleanup Script
 *
 * This script removes all test data created during production testing.
 * Run this ONLY after completing the production testing checklist.
 *
 * Usage:
 *   node scripts/cleanup-production-test-data.js
 *
 * Or with dry-run mode (shows what would be deleted):
 *   DRY_RUN=true node scripts/cleanup-production-test-data.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DRY_RUN = process.env.DRY_RUN === 'true';

// Patterns to identify test data
const TEST_PATTERNS = {
  // Common test keywords in titles/names
  keywords: ['test', 'demo', 'sample', 'dummy', 'example', 'temp', 'temporary'],

  // Email patterns for test users
  emailPatterns: [
    '@test.com',
    '@example.com',
    '@demo.com',
    'test@',
    'demo@',
    'temp@'
  ],

  // Org name patterns
  orgPatterns: [
    'Test Org',
    'Demo Org',
    'Sample Org',
    'Test Company',
    'Demo Company'
  ]
};

const stats = {
  discussions: 0,
  questions: 0,
  replies: 0,
  reactions: 0,
  tickets: 0,
  trialOrgs: 0,
  users: 0,
  roadmapItems: 0
};

function log(message, data = null) {
  console.log(`[${DRY_RUN ? 'DRY-RUN' : 'CLEANUP'}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function isTestContent(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return TEST_PATTERNS.keywords.some(keyword => lowerText.includes(keyword));
}

function isTestEmail(email) {
  if (!email) return false;
  return TEST_PATTERNS.emailPatterns.some(pattern => email.toLowerCase().includes(pattern.toLowerCase()));
}

async function cleanupResourceDiscussions() {
  log('\n=== Cleaning up Resource Discussions ===');

  try {
    // Find test discussions
    const { data: discussions, error } = await supabase
      .from('resource_discussions')
      .select('id, content, discussion_type, author_id')
      .is('parent_discussion_id', null);

    if (error) throw error;

    const testDiscussions = discussions.filter(d => {
      try {
        const content = typeof d.content === 'string' ? JSON.parse(d.content) : d.content;
        const title = content.title || content.question || '';
        const body = content.content || content.details || '';
        return isTestContent(title) || isTestContent(body);
      } catch (e) {
        return false;
      }
    });

    log(`Found ${testDiscussions.length} test discussions/questions`);

    if (!DRY_RUN && testDiscussions.length > 0) {
      // Delete reactions first
      for (const discussion of testDiscussions) {
        const { data: reactions } = await supabase
          .from('resource_discussion_reactions')
          .delete()
          .eq('discussion_id', discussion.id);
        stats.reactions++;
      }

      // Delete replies
      for (const discussion of testDiscussions) {
        const { data: replies } = await supabase
          .from('resource_discussions')
          .delete()
          .eq('parent_discussion_id', discussion.id);
        if (replies) stats.replies += replies.length;
      }

      // Delete parent discussions
      const { error: deleteError } = await supabase
        .from('resource_discussions')
        .delete()
        .in('id', testDiscussions.map(d => d.id));

      if (deleteError) throw deleteError;

      if (testDiscussions[0].discussion_type === 'question') {
        stats.questions += testDiscussions.length;
      } else {
        stats.discussions += testDiscussions.length;
      }

      log(`Deleted ${testDiscussions.length} discussions/questions with their replies and reactions`);
    }
  } catch (error) {
    console.error('Error cleaning up discussions:', error);
  }
}

async function cleanupTickets() {
  log('\n=== Cleaning up Tickets ===');

  try {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('id, title, description');

    if (error) throw error;

    const testTickets = tickets.filter(t =>
      isTestContent(t.title) || isTestContent(t.description)
    );

    log(`Found ${testTickets.length} test tickets`);

    if (!DRY_RUN && testTickets.length > 0) {
      const { error: deleteError } = await supabase
        .from('support_tickets')
        .delete()
        .in('id', testTickets.map(t => t.id));

      if (deleteError) throw deleteError;
      stats.tickets = testTickets.length;
      log(`Deleted ${testTickets.length} test tickets`);
    }
  } catch (error) {
    console.error('Error cleaning up tickets:', error);
  }
}

async function cleanupTrialOrgs() {
  log('\n=== Cleaning up Trial Organizations ===');

  try {
    const { data: orgs, error } = await supabase
      .from('trial_orgs')
      .select('org_id, org_name');

    if (error) throw error;

    const testOrgs = orgs.filter(org => isTestContent(org.org_name));

    log(`Found ${testOrgs.length} test trial organizations`);

    if (!DRY_RUN && testOrgs.length > 0) {
      const { error: deleteError } = await supabase
        .from('trial_orgs')
        .delete()
        .in('org_id', testOrgs.map(o => o.org_id));

      if (deleteError) throw deleteError;
      stats.trialOrgs = testOrgs.length;
      log(`Deleted ${testOrgs.length} test trial organizations`);
    }
  } catch (error) {
    console.error('Error cleaning up trial orgs:', error);
  }
}

async function cleanupTestUsers() {
  log('\n=== Cleaning up Test Users ===');

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name');

    if (error) throw error;

    const testUsers = users.filter(u =>
      isTestEmail(u.email) || isTestContent(u.full_name)
    );

    log(`Found ${testUsers.length} test users`);

    if (!DRY_RUN && testUsers.length > 0) {
      // Note: This only deletes from users table, not from auth.users
      // Auth users need to be deleted via Supabase dashboard
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', testUsers.map(u => u.id));

      if (deleteError) throw deleteError;
      stats.users = testUsers.length;
      log(`Deleted ${testUsers.length} test users from users table`);
      log('⚠️  Note: Test users in auth.users must be deleted manually via Supabase dashboard');
    }
  } catch (error) {
    console.error('Error cleaning up users:', error);
  }
}

async function cleanupRoadmapItems() {
  log('\n=== Cleaning up Roadmap Items ===');

  try {
    const { data: items, error } = await supabase
      .from('roadmap_items')
      .select('id, title, description');

    if (error) throw error;

    const testItems = items.filter(item =>
      isTestContent(item.title) || isTestContent(item.description)
    );

    log(`Found ${testItems.length} test roadmap items`);

    if (!DRY_RUN && testItems.length > 0) {
      const { error: deleteError } = await supabase
        .from('roadmap_items')
        .delete()
        .in('id', testItems.map(i => i.id));

      if (deleteError) throw deleteError;
      stats.roadmapItems = testItems.length;
      log(`Deleted ${testItems.length} test roadmap items`);
    }
  } catch (error) {
    console.error('Error cleaning up roadmap items:', error);
  }
}

async function cleanupDocuments() {
  log('\n=== Cleaning up Documents ===');

  try {
    const { data: docs, error } = await supabase
      .from('document_library')
      .select('id, title, description');

    if (error) throw error;

    const testDocs = docs.filter(doc =>
      isTestContent(doc.title) || isTestContent(doc.description)
    );

    log(`Found ${testDocs.length} test documents`);

    if (!DRY_RUN && testDocs.length > 0) {
      const { error: deleteError } = await supabase
        .from('document_library')
        .delete()
        .in('id', testDocs.map(d => d.id));

      if (deleteError) throw deleteError;
      log(`Deleted ${testDocs.length} test documents`);
    }
  } catch (error) {
    console.error('Error cleaning up documents:', error);
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       Production Test Data Cleanup Script                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No data will be deleted');
    console.log('   This will show what would be deleted\n');
  } else {
    console.log('⚠️  LIVE MODE - Data will be permanently deleted!');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Run all cleanup functions
  await cleanupResourceDiscussions();
  await cleanupTickets();
  await cleanupTrialOrgs();
  await cleanupTestUsers();
  await cleanupRoadmapItems();
  await cleanupDocuments();

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Cleanup Summary                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Discussions deleted:     ${stats.discussions}`);
  console.log(`Questions deleted:       ${stats.questions}`);
  console.log(`Replies deleted:         ${stats.replies}`);
  console.log(`Reactions deleted:       ${stats.reactions}`);
  console.log(`Tickets deleted:         ${stats.tickets}`);
  console.log(`Trial Orgs deleted:      ${stats.trialOrgs}`);
  console.log(`Users deleted:           ${stats.users}`);
  console.log(`Roadmap Items deleted:   ${stats.roadmapItems}`);

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`\nTotal items deleted:     ${total}`);

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. No data was deleted.');
    console.log('   To actually delete data, run: node scripts/cleanup-production-test-data.js');
  } else {
    console.log('\n✅ Cleanup complete!');
  }

  console.log('\n');
}

main().catch(console.error);
