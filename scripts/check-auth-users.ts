import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthUsers() {
  console.log('Checking auth.users table...\n');

  // Get admin user from users table
  const { data: appUser } = await supabase
    .from('users')
    .select('id, email, auth_user_id')
    .eq('email', 'admin@myra.ai')
    .single();

  console.log('App user (users table):', appUser);

  // Try to get auth user
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching auth users:', authError);
  } else {
    console.log('\nAuth users:', authData.users.slice(0, 3).map(u => ({ id: u.id, email: u.email })));
  }
}

checkAuthUsers().catch(console.error);
