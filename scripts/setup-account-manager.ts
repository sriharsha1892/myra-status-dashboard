#!/usr/bin/env tsx
/**
 * Setup Default Account Manager
 * Creates a default account manager for testing/import
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking existing users...\n');

  // Check existing users
  const { data: existingUsers } = await supabase
    .from('users')
    .select('*');

  console.log(`Found ${existingUsers?.length || 0} existing users`);

  if (existingUsers && existingUsers.length > 0) {
    console.log('\nExisting users:');
    existingUsers.forEach((user: any) => {
      console.log(`  - ${user.full_name || user.email} (${user.role})`);
    });

    // Check for account managers
    const managers = existingUsers.filter((u: any) =>
      u.role === 'account_manager' || u.role === 'admin'
    );

    if (managers.length > 0) {
      console.log(`\n✅ Found ${managers.length} account manager(s)!`);
      console.log('You can now run the import.');
      return;
    }
  }

  console.log('\n⚠️  No account managers found. Creating default account manager...\n');

  // Create default account manager
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      email: 'admin@myra.ai',
      full_name: 'System Administrator',
      role: 'admin',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }

  console.log('✅ Created default account manager:');
  console.log(`   Name: ${newUser.full_name}`);
  console.log(`   Email: ${newUser.email}`);
  console.log(`   Role: ${newUser.role}`);
  console.log('\n✨ You can now run the import!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
