#!/usr/bin/env tsx
/**
 * Comprehensive Seed Data Script
 * Creates realistic test data for local development and testing
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Seed data
const TRIAL_ORGS = [
  {
    org_name: 'Acme Corporation',
    org_domain: 'acme.com',
    org_lifecycle_stage: 'trial_active',
    trial_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    trial_end_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 23 days from now
    engagement_score: 85,
    comments: 'High engagement, strong product-market fit',
  },
  {
    org_name: 'TechStart Inc',
    org_domain: 'techstart.io',
    org_lifecycle_stage: 'trial_active',
    trial_start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    trial_end_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    engagement_score: 72,
    comments: 'Regular usage, asking lots of questions',
  },
  {
    org_name: 'Global Enterprises',
    org_domain: 'globalent.com',
    org_lifecycle_stage: 'trial_active',
    trial_start_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    trial_end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    engagement_score: 45,
    comments: 'Low engagement, need follow-up',
  },
  {
    org_name: 'Innovation Labs',
    org_domain: 'innovationlabs.ai',
    org_lifecycle_stage: 'trial_pending',
    trial_start_date: null,
    trial_end_date: null,
    engagement_score: null,
    comments: 'Demo scheduled for next week',
  },
  {
    org_name: 'DataViz Solutions',
    org_domain: 'dataviz.co',
    org_lifecycle_stage: 'customer',
    trial_start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    trial_end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    engagement_score: 95,
    comments: 'Successfully converted to paid customer',
  },
];

// Roadmap items will be created for the first trial org
const ROADMAP_ITEMS_TEMPLATE = [
  {
    title: 'Dark Mode Support',
    description: 'Add dark mode theme to improve user experience',
    status: 'in_progress',
    priority: 'high',
    target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    title: 'Advanced Analytics Dashboard',
    description: 'Comprehensive analytics with custom date ranges and filters',
    status: 'planned',
    priority: 'high',
    target_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    title: 'Mobile App',
    description: 'Native iOS and Android applications',
    status: 'planned',
    priority: 'medium',
    target_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    title: 'API Rate Limiting',
    description: 'Implement rate limiting for API endpoints',
    status: 'completed',
    priority: 'critical',
    target_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
];

async function clearExistingData() {
  console.log('🧹 Clearing existing seed data...');

  // Delete in reverse order of dependencies
  await supabase.from('org_activity_notes').delete().ilike('note_text', '%seed data%');
  await supabase.from('org_product_roadmap').delete().in('title', ROADMAP_ITEMS_TEMPLATE.map(r => r.title));
  await supabase.from('trial_organizations').delete().in('org_name', TRIAL_ORGS.map(o => o.org_name));

  console.log('✅ Cleared existing seed data');
}


async function seedActivityNotes(orgId: string, orgName: string) {
  const notes = [
    {
      org_id: orgId,
      note_category: 'first_login',
      note_text: `User from ${orgName} logged in for the first time - seed data`,
      logged_by: 'system',
      mentions: [],
    },
    {
      org_id: orgId,
      note_category: 'question',
      note_text: `${orgName} asked about integration with external systems - seed data`,
      logged_by: 'admin@myra.ai',
      mentions: [],
    },
    {
      org_id: orgId,
      note_category: 'success',
      note_text: `${orgName} successfully completed onboarding - seed data`,
      logged_by: 'admin@myra.ai',
      mentions: [],
    },
  ];

  for (const note of notes) {
    await supabase.from('org_activity_notes').insert(note);
  }
}

async function seedRoadmapItems(orgId: string) {
  console.log('🗺️  Seeding roadmap items...');

  for (const item of ROADMAP_ITEMS_TEMPLATE) {
    const { error } = await supabase
      .from('org_product_roadmap')
      .insert({
        ...item,
        org_id: orgId,
      });

    if (error) {
      console.error(`❌ Error creating ${item.title}:`, error.message);
    } else {
      console.log(`✅ Created: ${item.title} (${item.status})`);
    }
  }
}

async function seedNotifications() {
  console.log('🔔 Seeding notifications...');

  // Get admin user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@myra.ai')
    .single();

  if (!users) {
    console.log('⚠️  Admin user not found, skipping notifications');
    return;
  }

  const notifications = [
    {
      user_id: users.id,
      entity_type: 'trial_org',
      entity_id: null,
      entity_title: 'Acme Corporation',
      notification_type: 'assigned',
      title: 'New trial organization assigned',
      message: 'You have been assigned to Acme Corporation',
      action_url: '/support/trials',
      priority_score: 75,
      status: 'unread',
    },
    {
      user_id: users.id,
      entity_type: 'roadmap_item',
      entity_id: null,
      entity_title: 'Dark Mode Support',
      notification_type: 'status_change',
      title: 'Roadmap item status changed',
      message: 'Dark Mode Support moved to In Progress',
      action_url: '/support/admin/roadmap',
      priority_score: 60,
      status: 'read',
    },
  ];

  for (const notification of notifications) {
    await supabase.from('unified_notifications').insert(notification);
  }

  console.log(`✅ Created ${notifications.length} notifications`);
}

async function seedTodos() {
  console.log('✅ Seeding todos...');

  // Get admin user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@myra.ai')
    .single();

  if (!users) {
    console.log('⚠️  Admin user not found, skipping todos');
    return;
  }

  const todos = [
    {
      title: 'Follow up with Acme Corp',
      description: 'Schedule demo call to discuss integration requirements',
      todo_type: 'follow_up',
      priority: 'high',
      status: 'pending',
      assigned_to: users.id,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: 'Review TechStart feedback',
      description: 'Analyze user feedback from last week',
      todo_type: 'task',
      priority: 'normal',
      status: 'in_progress',
      assigned_to: users.id,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: 'Prepare Q4 roadmap presentation',
      description: 'Create slide deck for stakeholder meeting',
      todo_type: 'task',
      priority: 'urgent',
      status: 'pending',
      assigned_to: users.id,
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const todo of todos) {
    await supabase.from('todos').insert(todo);
  }

  console.log(`✅ Created ${todos.length} todos`);
}

async function main() {
  console.log('🌱 Starting seed data generation...\n');

  try {
    await clearExistingData();
    console.log('');

    // Seed trial orgs and get the first one for roadmap
    let firstOrgId: string | null = null;
    for (const org of TRIAL_ORGS) {
      const { data, error } = await supabase
        .from('trial_organizations')
        .insert(org)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating ${org.org_name}:`, error.message);
      } else {
        console.log(`✅ Created: ${org.org_name} (${org.org_lifecycle_stage})`);

        // Store first org ID for roadmap
        if (!firstOrgId) {
          firstOrgId = data.org_id;
        }

        // Add some activity notes for trial_active orgs
        if (org.org_lifecycle_stage === 'trial_active' && data) {
          await seedActivityNotes(data.org_id, org.org_name);
        }
      }
    }
    console.log('');

    // Seed roadmap items for the first org
    if (firstOrgId) {
      await seedRoadmapItems(firstOrgId);
      console.log('');
    }

    await seedNotifications();
    console.log('');

    await seedTodos();
    console.log('');

    console.log('✨ Seed data generation completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${TRIAL_ORGS.length} trial organizations`);
    console.log(`   • ${ROADMAP_ITEMS_TEMPLATE.length} roadmap items`);
    console.log(`   • ${TRIAL_ORGS.filter(o => o.org_lifecycle_stage === 'trial_active').length * 3} activity notes`);
    console.log(`   • 2 notifications`);
    console.log(`   • 3 todos`);
    console.log('\n🚀 You can now test the application with realistic data!');
  } catch (error) {
    console.error('\n❌ Error during seed data generation:', error);
    process.exit(1);
  }
}

main();
