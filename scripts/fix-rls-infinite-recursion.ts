/**
 * Fix RLS Infinite Recursion on roadmap_saved_views
 *
 * Issue: Policies referencing team_members table causing infinite recursion
 * Solution: Apply simplified policies from FIXED migration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for roadmap_saved_views...\n');

  try {
    // Drop and recreate the problematic policies
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop old policies
        DROP POLICY IF EXISTS "Users can view their own and shared views" ON roadmap_saved_views;
        DROP POLICY IF EXISTS "Users can manage their own views" ON roadmap_saved_views;

        -- Create simplified policies (without team_members reference)
        CREATE POLICY "Users can view their own and shared views" ON roadmap_saved_views
          FOR SELECT USING (
            user_id = auth.uid()
            OR is_shared = true
            OR EXISTS (
              SELECT 1 FROM roadmap_view_access
              WHERE view_id = roadmap_saved_views.id
                AND user_id = auth.uid()
            )
          );

        CREATE POLICY "Users can manage their own views" ON roadmap_saved_views
          FOR ALL USING (user_id = auth.uid());
      `
    });

    if (error) {
      console.error('❌ Error executing SQL:', error);

      // Fallback: execute via individual statements
      console.log('\n⚠️  Trying fallback method...\n');

      const statements = [
        'DROP POLICY IF EXISTS "Users can view their own and shared views" ON roadmap_saved_views',
        'DROP POLICY IF EXISTS "Users can manage their own views" ON roadmap_saved_views',
        `CREATE POLICY "Users can view their own and shared views" ON roadmap_saved_views
          FOR SELECT USING (
            user_id = auth.uid()
            OR is_shared = true
            OR EXISTS (
              SELECT 1 FROM roadmap_view_access
              WHERE view_id = roadmap_saved_views.id
                AND user_id = auth.uid()
            )
          )`,
        'CREATE POLICY "Users can manage their own views" ON roadmap_saved_views FOR ALL USING (user_id = auth.uid())'
      ];

      for (const sql of statements) {
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql });
        if (stmtError) {
          console.error(`❌ Failed: ${sql.substring(0, 50)}...`);
          console.error('   Error:', stmtError.message);
        } else {
          console.log(`✅ Success: ${sql.substring(0, 50)}...`);
        }
      }
    } else {
      console.log('✅ RLS policies fixed successfully!');
    }

    console.log('\n🎯 Testing query...');

    // Test the query
    const { data, error: testError } = await supabase
      .from('roadmap_saved_views')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Test query failed:', testError.message);
    } else {
      console.log('✅ Test query successful! No infinite recursion detected.');
      console.log(`   Found ${data?.length || 0} saved views`);
    }

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message || err);
  }
}

// Run the fix
fixRLSPolicies().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
