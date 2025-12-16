#!/usr/bin/env npx tsx
/**
 * Comprehensive Bug Detection Test Suite
 * Tests all critical functionality to identify potential bugs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'BUG';
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  const icons: Record<string, string> = {
    'PASS': '✅',
    'FAIL': '❌',
    'WARN': '⚠️',
    'BUG': '🐛'
  };
  console.log(`${icons[result.status]} [${result.category}] ${result.name}: ${result.message}`);
  results.push(result);
}

// ============================================================================
// DATABASE TABLE TESTS
// ============================================================================

async function testDatabaseTables() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TESTING DATABASE TABLES');
  console.log('='.repeat(80) + '\n');

  const tables = [
    { name: 'users', columns: ['id', 'email', 'full_name', 'role'] },
    { name: 'organizations', columns: ['id', 'name', 'status'] },
    { name: 'trial_users', columns: ['user_id', 'name', 'email', 'org_id'] },
    { name: 'tickets', columns: ['ticket_id', 'title', 'status'] },
    { name: 'announcements', columns: ['id', 'title', 'content', 'announcement_type'] },
    { name: 'org_product_roadmap', columns: ['id', 'title', 'status', 'priority'] },
    { name: 'feature_requests', columns: ['id', 'title', 'status'] },
    { name: 'notifications', columns: ['id', 'message', 'user_id'] },
    { name: 'unified_notes', columns: ['id', 'content'] },
    // user_activities table doesn't exist - removed
    { name: 'resource_discussions', columns: ['id', 'content', 'discussion_type'] },
    { name: 'document_library', columns: ['id', 'title', 'visibility'] },
    // todos and activity_notes tables don't exist - removed
    { name: 'signup_tokens', columns: ['id', 'email', 'token'] },
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select(table.columns.join(','))
        .limit(1);

      if (error) {
        logTest({
          category: 'Database',
          name: `${table.name} table`,
          status: 'FAIL',
          message: error.message,
          severity: 'high'
        });
      } else {
        logTest({
          category: 'Database',
          name: `${table.name} table`,
          status: 'PASS',
          message: `Accessible with ${table.columns.length} columns`
        });
      }
    } catch (err: any) {
      logTest({
        category: 'Database',
        name: `${table.name} table`,
        status: 'FAIL',
        message: err.message,
        severity: 'high'
      });
    }
  }
}

// ============================================================================
// ANNOUNCEMENTS TESTS
// ============================================================================

async function testAnnouncements() {
  console.log('\n' + '='.repeat(80));
  console.log('📢 TESTING ANNOUNCEMENTS');
  console.log('='.repeat(80) + '\n');

  // Test 1: Check table structure matches expected columns
  const { data: sample, error: sampleError } = await supabase
    .from('announcements')
    .select('*')
    .limit(1);

  if (sampleError) {
    logTest({
      category: 'Announcements',
      name: 'Table access',
      status: 'FAIL',
      message: sampleError.message,
      severity: 'high'
    });
    return;
  }

  if (sample && sample.length > 0) {
    const columns = Object.keys(sample[0]);
    const expectedColumns = ['id', 'title', 'content', 'announcement_type', 'priority', 'status'];
    const missingColumns = expectedColumns.filter(c => !columns.includes(c));

    if (missingColumns.length > 0) {
      logTest({
        category: 'Announcements',
        name: 'Column structure',
        status: 'BUG',
        message: `Missing expected columns: ${missingColumns.join(', ')}. Found: ${columns.join(', ')}`,
        severity: 'high'
      });
    } else {
      logTest({
        category: 'Announcements',
        name: 'Column structure',
        status: 'PASS',
        message: 'All expected columns present'
      });
    }

    // Check for column naming issues (type vs announcement_type, message vs content)
    if (columns.includes('type') && !columns.includes('announcement_type')) {
      logTest({
        category: 'Announcements',
        name: 'Column naming',
        status: 'BUG',
        message: 'Column is "type" but code expects "announcement_type"',
        severity: 'high'
      });
    }
    if (columns.includes('message') && !columns.includes('content')) {
      logTest({
        category: 'Announcements',
        name: 'Column naming',
        status: 'BUG',
        message: 'Column is "message" but code expects "content"',
        severity: 'high'
      });
    }
  }

  // Test 2: CRUD Operations
  const testAnnouncement = {
    title: 'Test Announcement ' + Date.now(),
    content: 'This is a test announcement',
    announcement_type: 'update',
    priority: 'normal',
    status: 'draft',
    posted_by: 'test_admin'  // Required field
  };

  const { data: created, error: createError } = await supabase
    .from('announcements')
    .insert([testAnnouncement])
    .select()
    .single();

  if (createError) {
    logTest({
      category: 'Announcements',
      name: 'Create operation',
      status: 'BUG',
      message: `Insert failed: ${createError.message}`,
      severity: 'high'
    });
  } else {
    logTest({
      category: 'Announcements',
      name: 'Create operation',
      status: 'PASS',
      message: 'Successfully created announcement'
    });

    // Test update
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ status: 'active' })
      .eq('id', created.id);

    if (updateError) {
      logTest({
        category: 'Announcements',
        name: 'Update operation',
        status: 'BUG',
        message: `Update failed: ${updateError.message}`,
        severity: 'medium'
      });
    } else {
      logTest({
        category: 'Announcements',
        name: 'Update operation',
        status: 'PASS',
        message: 'Successfully updated announcement'
      });
    }

    // Cleanup
    await supabase.from('announcements').delete().eq('id', created.id);
  }
}

// ============================================================================
// TRIAL USERS & ORGANIZATIONS TESTS
// ============================================================================

async function testTrialUsersAndOrgs() {
  console.log('\n' + '='.repeat(80));
  console.log('👥 TESTING TRIAL USERS & ORGANIZATIONS');
  console.log('='.repeat(80) + '\n');

  // Test: Get trial users with basic info
  const { data: trialUsers, error: trialError } = await supabase
    .from('trial_users')
    .select('user_id, name, email, org_id')
    .limit(5);

  if (trialError) {
    logTest({
      category: 'Trial Users',
      name: 'Basic query',
      status: 'FAIL',
      message: trialError.message,
      severity: 'medium'
    });
  } else {
    logTest({
      category: 'Trial Users',
      name: 'Basic query',
      status: 'PASS',
      message: `Found ${trialUsers?.length || 0} trial users`
    });
  }

  // Test: Check for orphaned trial users (org_id that doesn't exist)
  const { data: allTrialUsers } = await supabase
    .from('trial_users')
    .select('user_id, org_id')
    .not('org_id', 'is', null);

  if (allTrialUsers && allTrialUsers.length > 0) {
    const orgIds = [...new Set(allTrialUsers.map(u => u.org_id))];
    const { data: orgs } = await supabase
      .from('trial_organizations')
      .select('org_id')
      .in('org_id', orgIds);

    const validOrgIds = new Set(orgs?.map(o => o.org_id) || []);
    const orphaned = allTrialUsers.filter(u => !validOrgIds.has(u.org_id));

    if (orphaned.length > 0) {
      logTest({
        category: 'Trial Users',
        name: 'Orphaned records',
        status: 'BUG',
        message: `Found ${orphaned.length} trial users with invalid org_id`,
        severity: 'medium'
      });
    } else {
      logTest({
        category: 'Trial Users',
        name: 'Orphaned records',
        status: 'PASS',
        message: 'No orphaned trial users found'
      });
    }
  }

  // Test: Organizations with invalid status
  const { data: orgsWithStatus } = await supabase
    .from('organizations')
    .select('id, name, status');

  const validStatuses = ['Active', 'Expired', 'trial', 'active', 'churned', 'prospect', 'onboarding'];
  const invalidStatusOrgs = orgsWithStatus?.filter(o => !validStatuses.includes(o.status)) || [];

  if (invalidStatusOrgs.length > 0) {
    logTest({
      category: 'Organizations',
      name: 'Status validation',
      status: 'WARN',
      message: `Found ${invalidStatusOrgs.length} orgs with non-standard status values`,
      severity: 'low'
    });
  } else {
    logTest({
      category: 'Organizations',
      name: 'Status validation',
      status: 'PASS',
      message: 'All organizations have valid status'
    });
  }
}

// ============================================================================
// ROADMAP TESTS
// ============================================================================

async function testRoadmap() {
  console.log('\n' + '='.repeat(80));
  console.log('🗺️ TESTING ROADMAP');
  console.log('='.repeat(80) + '\n');

  // Test 1: Basic query
  const { data: roadmapItems, error: roadmapError } = await supabase
    .from('org_product_roadmap')
    .select('*')
    .limit(10);

  if (roadmapError) {
    logTest({
      category: 'Roadmap',
      name: 'Basic query',
      status: 'FAIL',
      message: roadmapError.message,
      severity: 'high'
    });
    return;
  }

  logTest({
    category: 'Roadmap',
    name: 'Basic query',
    status: 'PASS',
    message: `Found ${roadmapItems?.length || 0} roadmap items`
  });

  // Test 2: Master roadmap items (org_id IS NULL)
  const { data: masterItems, error: masterError } = await supabase
    .from('org_product_roadmap')
    .select('id, title, org_id, strategic_categories')
    .is('org_id', null);

  if (masterError) {
    logTest({
      category: 'Roadmap',
      name: 'Master roadmap query',
      status: 'FAIL',
      message: masterError.message,
      severity: 'medium'
    });
  } else {
    logTest({
      category: 'Roadmap',
      name: 'Master roadmap query',
      status: 'PASS',
      message: `Found ${masterItems?.length || 0} master roadmap items`
    });

    // Check if master items have strategic_categories
    const masterWithoutCategories = masterItems?.filter(
      i => !i.strategic_categories || i.strategic_categories.length === 0
    ) || [];

    if (masterWithoutCategories.length > 0) {
      logTest({
        category: 'Roadmap',
        name: 'Master items validation',
        status: 'WARN',
        message: `${masterWithoutCategories.length} master items missing strategic_categories`,
        severity: 'low'
      });
    }
  }

  // Test 3: Check for invalid status values
  const validStatuses = ['planned', 'in_progress', 'completed', 'on_hold', 'cancelled'];
  const invalidItems = roadmapItems?.filter(i => !validStatuses.includes(i.status)) || [];

  if (invalidItems.length > 0) {
    logTest({
      category: 'Roadmap',
      name: 'Status validation',
      status: 'BUG',
      message: `Found ${invalidItems.length} items with invalid status: ${[...new Set(invalidItems.map(i => i.status))].join(', ')}`,
      severity: 'medium'
    });
  } else {
    logTest({
      category: 'Roadmap',
      name: 'Status validation',
      status: 'PASS',
      message: 'All items have valid status'
    });
  }

  // Test 4: View exists and works
  const { data: viewData, error: viewError } = await supabase
    .from('roadmap_items_with_org_links')
    .select('*')
    .limit(5);

  if (viewError) {
    logTest({
      category: 'Roadmap',
      name: 'View: roadmap_items_with_org_links',
      status: 'FAIL',
      message: viewError.message,
      severity: 'medium'
    });
  } else {
    logTest({
      category: 'Roadmap',
      name: 'View: roadmap_items_with_org_links',
      status: 'PASS',
      message: 'View accessible'
    });
  }
}

// ============================================================================
// FEATURE REQUESTS TESTS
// ============================================================================

async function testFeatureRequests() {
  console.log('\n' + '='.repeat(80));
  console.log('💡 TESTING FEATURE REQUESTS');
  console.log('='.repeat(80) + '\n');

  const { data: requests, error } = await supabase
    .from('feature_requests')
    .select('*')
    .limit(20);

  if (error) {
    logTest({
      category: 'Feature Requests',
      name: 'Basic query',
      status: 'FAIL',
      message: error.message,
      severity: 'high'
    });
    return;
  }

  logTest({
    category: 'Feature Requests',
    name: 'Basic query',
    status: 'PASS',
    message: `Found ${requests?.length || 0} feature requests`
  });

  // Check for requests with missing required fields
  const invalidRequests = requests?.filter(r => !r.title || !r.status) || [];
  if (invalidRequests.length > 0) {
    logTest({
      category: 'Feature Requests',
      name: 'Data integrity',
      status: 'BUG',
      message: `${invalidRequests.length} requests missing title or status`,
      severity: 'medium'
    });
  } else {
    logTest({
      category: 'Feature Requests',
      name: 'Data integrity',
      status: 'PASS',
      message: 'All requests have required fields'
    });
  }

  // Check for valid status values
  const validStatuses = ['new', 'under_review', 'planned', 'in_progress', 'completed', 'rejected', 'duplicate'];
  const badStatuses = requests?.filter(r => r.status && !validStatuses.includes(r.status)) || [];
  if (badStatuses.length > 0) {
    logTest({
      category: 'Feature Requests',
      name: 'Status validation',
      status: 'WARN',
      message: `${badStatuses.length} requests with non-standard status: ${[...new Set(badStatuses.map(r => r.status))].join(', ')}`,
      severity: 'low'
    });
  }
}

// ============================================================================
// NOTIFICATIONS TESTS
// ============================================================================

async function testNotifications() {
  console.log('\n' + '='.repeat(80));
  console.log('🔔 TESTING NOTIFICATIONS');
  console.log('='.repeat(80) + '\n');

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(20);

  if (error) {
    logTest({
      category: 'Notifications',
      name: 'Basic query',
      status: 'FAIL',
      message: error.message,
      severity: 'high'
    });
    return;
  }

  logTest({
    category: 'Notifications',
    name: 'Basic query',
    status: 'PASS',
    message: `Found ${notifications?.length || 0} notifications`
  });

  // Check for notifications with invalid user_id
  if (notifications && notifications.length > 0) {
    const userIds = [...new Set(notifications.map(n => n.user_id).filter(Boolean))];

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .in('id', userIds);

      const validUserIds = new Set(users?.map(u => u.id) || []);
      const orphanedNotifications = notifications.filter(n => n.user_id && !validUserIds.has(n.user_id));

      if (orphanedNotifications.length > 0) {
        logTest({
          category: 'Notifications',
          name: 'Orphaned notifications',
          status: 'BUG',
          message: `${orphanedNotifications.length} notifications reference non-existent users`,
          severity: 'medium'
        });
      } else {
        logTest({
          category: 'Notifications',
          name: 'Orphaned notifications',
          status: 'PASS',
          message: 'All notifications reference valid users'
        });
      }
    }
  }
}

// ============================================================================
// TICKETS TESTS
// ============================================================================

async function testTickets() {
  console.log('\n' + '='.repeat(80));
  console.log('🎫 TESTING TICKETS');
  console.log('='.repeat(80) + '\n');

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*')
    .limit(20);

  if (error) {
    logTest({
      category: 'Tickets',
      name: 'Basic query',
      status: 'FAIL',
      message: error.message,
      severity: 'high'
    });
    return;
  }

  logTest({
    category: 'Tickets',
    name: 'Basic query',
    status: 'PASS',
    message: `Found ${tickets?.length || 0} tickets`
  });

  // Check status values
  const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  const invalidTickets = tickets?.filter(t => t.status && !validStatuses.includes(t.status)) || [];

  if (invalidTickets.length > 0) {
    logTest({
      category: 'Tickets',
      name: 'Status validation',
      status: 'WARN',
      message: `${invalidTickets.length} tickets with non-standard status`,
      severity: 'low'
    });
  } else {
    logTest({
      category: 'Tickets',
      name: 'Status validation',
      status: 'PASS',
      message: 'All tickets have valid status'
    });
  }

  // Check for tickets without ticket_number
  const missingNumbers = tickets?.filter(t => !t.ticket_number) || [];
  if (missingNumbers.length > 0) {
    logTest({
      category: 'Tickets',
      name: 'Ticket numbers',
      status: 'BUG',
      message: `${missingNumbers.length} tickets missing ticket_number`,
      severity: 'medium'
    });
  }
}

// ============================================================================
// USERS & AUTH TESTS
// ============================================================================

async function testUsersAndAuth() {
  console.log('\n' + '='.repeat(80));
  console.log('👤 TESTING USERS & AUTH');
  console.log('='.repeat(80) + '\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .limit(50);

  if (error) {
    logTest({
      category: 'Users',
      name: 'Basic query',
      status: 'FAIL',
      message: error.message,
      severity: 'critical'
    });
    return;
  }

  logTest({
    category: 'Users',
    name: 'Basic query',
    status: 'PASS',
    message: `Found ${users?.length || 0} users`
  });

  // Check for users without email
  const noEmail = users?.filter(u => !u.email) || [];
  if (noEmail.length > 0) {
    logTest({
      category: 'Users',
      name: 'Email validation',
      status: 'BUG',
      message: `${noEmail.length} users without email address`,
      severity: 'high'
    });
  } else {
    logTest({
      category: 'Users',
      name: 'Email validation',
      status: 'PASS',
      message: 'All users have email addresses'
    });
  }

  // Check for valid roles
  const validRoles = ['Admin', 'Account Manager', 'Manager', 'User', 'Viewer'];
  const invalidRoles = users?.filter(u => u.role && !validRoles.includes(u.role)) || [];
  if (invalidRoles.length > 0) {
    logTest({
      category: 'Users',
      name: 'Role validation',
      status: 'WARN',
      message: `${invalidRoles.length} users with non-standard roles: ${[...new Set(invalidRoles.map(u => u.role))].join(', ')}`,
      severity: 'low'
    });
  }

  // Check signup_tokens
  const { data: tokens, error: tokenError } = await supabase
    .from('signup_tokens')
    .select('*')
    .limit(10);

  if (tokenError) {
    logTest({
      category: 'Auth',
      name: 'Signup tokens table',
      status: 'FAIL',
      message: tokenError.message,
      severity: 'high'
    });
  } else {
    logTest({
      category: 'Auth',
      name: 'Signup tokens table',
      status: 'PASS',
      message: `Found ${tokens?.length || 0} signup tokens`
    });

    // Check for expired tokens still marked as valid
    const now = new Date().toISOString();
    const expiredButValid = tokens?.filter(t => t.expires_at && t.expires_at < now && t.used !== true) || [];
    if (expiredButValid.length > 0) {
      logTest({
        category: 'Auth',
        name: 'Expired tokens cleanup',
        status: 'WARN',
        message: `${expiredButValid.length} expired tokens not cleaned up`,
        severity: 'low'
      });
    }
  }
}

// ============================================================================
// UNIFIED NOTES TESTS
// ============================================================================

async function testUnifiedNotes() {
  console.log('\n' + '='.repeat(80));
  console.log('📝 TESTING UNIFIED NOTES');
  console.log('='.repeat(80) + '\n');

  const { data: notes, error } = await supabase
    .from('unified_notes')
    .select('*')
    .limit(20);

  if (error) {
    logTest({
      category: 'Unified Notes',
      name: 'Basic query',
      status: 'FAIL',
      message: error.message,
      severity: 'high'
    });
    return;
  }

  logTest({
    category: 'Unified Notes',
    name: 'Basic query',
    status: 'PASS',
    message: `Found ${notes?.length || 0} notes`
  });

  // Check for notes without content
  const emptyNotes = notes?.filter(n => !n.content || n.content.trim() === '') || [];
  if (emptyNotes.length > 0) {
    logTest({
      category: 'Unified Notes',
      name: 'Content validation',
      status: 'WARN',
      message: `${emptyNotes.length} notes with empty content`,
      severity: 'low'
    });
  }

  // Note: author_id column doesn't exist in unified_notes, skipping author validation
}

// ============================================================================
// TODOS TESTS - Skipped (table doesn't exist)
// ============================================================================

async function testTodos() {
  // Note: todos table doesn't exist in this database, skipping
  console.log('\n' + '='.repeat(80));
  console.log('✅ TESTING TODOS - SKIPPED (table does not exist)');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// ACCOUNT MANAGERS TESTS
// ============================================================================

async function testAccountManagers() {
  console.log('\n' + '='.repeat(80));
  console.log('👔 TESTING ACCOUNT MANAGERS');
  console.log('='.repeat(80) + '\n');

  // Check if account managers are properly assigned (using trial_organizations which has AM field)
  const { data: orgsWithAM, error } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager_id')
    .not('account_manager_id', 'is', null);

  if (error) {
    logTest({
      category: 'Account Managers',
      name: 'Org assignments query',
      status: 'FAIL',
      message: error.message,
      severity: 'medium'
    });
    return;
  }

  logTest({
    category: 'Account Managers',
    name: 'Org assignments query',
    status: 'PASS',
    message: `${orgsWithAM?.length || 0} orgs have account managers`
  });

  // Check if assigned AMs exist in users table
  if (orgsWithAM && orgsWithAM.length > 0) {
    const amIds = [...new Set(orgsWithAM.map(o => o.account_manager_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .in('id', amIds);

    const validAmIds = new Set(users?.map(u => u.id) || []);
    const invalidAMs = orgsWithAM.filter(o => !validAmIds.has(o.account_manager_id));

    if (invalidAMs.length > 0) {
      logTest({
        category: 'Account Managers',
        name: 'AM user validation',
        status: 'BUG',
        message: `${invalidAMs.length} orgs assigned to non-existent users`,
        severity: 'high'
      });
    } else {
      logTest({
        category: 'Account Managers',
        name: 'AM user validation',
        status: 'PASS',
        message: 'All assigned AMs are valid users'
      });
    }
  }
}

// ============================================================================
// DATA CONSISTENCY TESTS
// ============================================================================

async function testDataConsistency() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TESTING DATA CONSISTENCY');
  console.log('='.repeat(80) + '\n');

  // Test: Check for duplicate emails in users
  const { data: users } = await supabase
    .from('users')
    .select('email');

  if (users) {
    const emails = users.map(u => u.email?.toLowerCase()).filter(Boolean);
    const duplicates = emails.filter((e, i) => emails.indexOf(e) !== i);

    if (duplicates.length > 0) {
      logTest({
        category: 'Data Consistency',
        name: 'Duplicate user emails',
        status: 'BUG',
        message: `Found ${duplicates.length} duplicate emails: ${[...new Set(duplicates)].slice(0, 3).join(', ')}...`,
        severity: 'critical'
      });
    } else {
      logTest({
        category: 'Data Consistency',
        name: 'Duplicate user emails',
        status: 'PASS',
        message: 'No duplicate emails found'
      });
    }
  }

  // Test: Check for invalid UUIDs in foreign keys
  const { data: activities } = await supabase
    .from('user_activities')
    .select('id, user_id, org_id')
    .limit(100);

  if (activities && activities.length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidUuids = activities.filter(a =>
      (a.user_id && !uuidRegex.test(a.user_id)) ||
      (a.org_id && !uuidRegex.test(a.org_id))
    );

    if (invalidUuids.length > 0) {
      logTest({
        category: 'Data Consistency',
        name: 'Invalid UUIDs',
        status: 'BUG',
        message: `${invalidUuids.length} activities with invalid UUIDs`,
        severity: 'high'
      });
    } else {
      logTest({
        category: 'Data Consistency',
        name: 'Invalid UUIDs',
        status: 'PASS',
        message: 'All UUIDs are valid format'
      });
    }
  }

  // Test: Check for null created_at timestamps
  const tables = ['users', 'organizations', 'tickets', 'notifications'];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('id, created_at')
      .is('created_at', null)
      .limit(5);

    if (!error && data && data.length > 0) {
      logTest({
        category: 'Data Consistency',
        name: `${table} timestamps`,
        status: 'BUG',
        message: `${data.length}+ records missing created_at`,
        severity: 'medium'
      });
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█' + '       COMPREHENSIVE BUG DETECTION TEST SUITE'.padEnd(78) + '█');
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█'.repeat(80));
  console.log(`\nDatabase: ${supabaseUrl}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  await testDatabaseTables();
  await testAnnouncements();
  await testTrialUsersAndOrgs();
  await testRoadmap();
  await testFeatureRequests();
  await testNotifications();
  await testTickets();
  await testUsersAndAuth();
  await testUnifiedNotes();
  await testTodos();
  await testAccountManagers();
  await testDataConsistency();

  // Print Summary
  console.log('\n' + '█'.repeat(80));
  console.log('█' + '                         TEST SUMMARY'.padEnd(78) + '█');
  console.log('█'.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const bugs = results.filter(r => r.status === 'BUG').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  console.log(`Total Tests:     ${total}`);
  console.log(`✅ Passed:       ${passed}`);
  console.log(`❌ Failed:       ${failed}`);
  console.log(`🐛 Bugs Found:   ${bugs}`);
  console.log(`⚠️  Warnings:     ${warnings}`);
  console.log(`\nPass Rate:       ${((passed / total) * 100).toFixed(1)}%`);

  if (bugs > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('🐛 BUGS DETECTED:\n');
    results.filter(r => r.status === 'BUG').forEach(r => {
      const severityIcon = r.severity === 'critical' ? '🔴' : r.severity === 'high' ? '🟠' : r.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${severityIcon} [${r.category}] ${r.name}`);
      console.log(`     ${r.message}`);
      console.log(`     Severity: ${r.severity || 'unknown'}\n`);
    });
  }

  if (failed > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('❌ FAILURES:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  • [${r.category}] ${r.name}: ${r.message}`);
    });
  }

  if (warnings > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('⚠️  WARNINGS:\n');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  • [${r.category}] ${r.name}: ${r.message}`);
    });
  }

  console.log('\n' + '─'.repeat(80));

  if (bugs === 0 && failed === 0) {
    console.log('\n🎉 No critical issues found! System appears healthy.\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  Found ${bugs} bugs and ${failed} failures. Please review above.\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Test suite crashed:', error);
  process.exit(1);
});
