/**
 * Create Demo Todo with @Mentions
 * Demonstrates the @mentions feature by creating a test todo
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function createDemoTodo() {
  try {
    console.log('🎯 Creating demo todo with @mentions...\n');

    // 1. Get admin user
    const { data: adminUser, error: adminError } = await supabase.auth.admin.listUsers();
    if (adminError) throw adminError;

    const admin = adminUser.users.find(u => u.email === 'admin@myra.ai');
    if (!admin) {
      console.error('❌ Admin user not found');
      return;
    }

    console.log(`✅ Found admin: ${admin.email}`);

    // 2. Get Sudeshana
    const sudeshana = adminUser.users.find(u => u.email === 'sudeshana@mordorintelligence.com');
    if (!sudeshana) {
      console.log('⚠️  Sudeshana not found, creating todo without mention');
    } else {
      console.log(`✅ Found Sudeshana: ${sudeshana.email}`);
    }

    // 3. Get a trial organization
    const { data: orgs, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .limit(1)
      .single();

    if (orgError || !orgs) {
      console.log('⚠️  No trial orgs found, creating todo without org');
    } else {
      console.log(`✅ Using org: ${orgs.org_name}`);
    }

    // 4. Create the demo todo
    const todoTitle = sudeshana
      ? `🎯 Demo: Follow up with ${orgs?.org_name || 'client'} about trial feedback @sudeshana`
      : `🎯 Demo: Review trial analytics and prepare report`;

    const { data: todo, error: todoError } = await supabase
      .from('user_todos')
      .insert({
        user_id: admin.id,
        title: todoTitle,
        todo_type: 'follow_up',
        priority: 'high',
        status: 'pending',
        related_org_id: orgs?.org_id || null,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      })
      .select()
      .single();

    if (todoError) throw todoError;

    console.log(`\n✅ Created todo: "${todo.title}"`);
    console.log(`   ID: ${todo.todo_id}`);
    console.log(`   Type: ${todo.todo_type}`);
    console.log(`   Priority: ${todo.priority}`);
    console.log(`   Due: ${todo.due_date}`);

    // 5. Create mention record if Sudeshana exists
    if (sudeshana) {
      const { error: mentionError } = await supabase
        .from('todo_mentions')
        .insert({
          todo_id: todo.todo_id,
          mentioned_user_id: sudeshana.id,
          mentioned_by_user_id: admin.id,
          is_read: false,
        });

      if (mentionError) throw mentionError;

      console.log(`\n✅ Created @mention for Sudeshana`);
      console.log(`   She will see this in her "@Mentioned" tab with a purple badge!`);
    }

    console.log('\n🎉 Demo todo created successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Login as admin@myra.ai → See todo in "My Todos" tab');
    if (sudeshana) {
      console.log('2. Login as sudeshana@mordorintelligence.com → See todo in "@Mentioned" tab');
      console.log('3. Notice the purple badge showing "1" unread mention');
      console.log('4. Click the todo to mark it as read');
    }

  } catch (error) {
    console.error('❌ Error creating demo todo:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
  }
}

createDemoTodo();
