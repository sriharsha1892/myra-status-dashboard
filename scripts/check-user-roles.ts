import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUserRoles() {
  console.log('🔍 Checking user roles in database...\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, role, is_super_admin')
    .limit(10);

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  console.log(`Found ${users?.length || 0} users:\n`);
  users?.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`);
    console.log(`   Role: ${user.role || 'null'}`);
    console.log(`   Super Admin: ${user.is_super_admin || false}`);
    console.log('');
  });

  // Check distinct roles
  const { data: distinctRoles } = await supabase
    .from('users')
    .select('role');

  const roleSet = new Set(distinctRoles?.map(u => u.role));
  console.log('Distinct roles in database:', Array.from(roleSet));
}

checkUserRoles().catch(console.error);
