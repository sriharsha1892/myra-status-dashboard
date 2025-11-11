#!/usr/bin/env node

/**
 * Setup Support System
 * Applies database migrations and configures storage for support features
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupSupportSystem() {
  console.log('🚀 Setting up Support System...\n');

  let hasErrors = false;

  // 1. Apply migration
  console.log('1️⃣  Applying database migration...');
  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251110_support_system_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements to execute`);

    // Note: Supabase JS client doesn't support raw SQL execution
    // This needs to be done via Supabase CLI or direct database connection
    console.log('   ⚠️  Migration SQL created at:');
    console.log('      supabase/migrations/20251110_support_system_schema.sql');
    console.log('   ⚠️  Please apply using one of these methods:');
    console.log('      1. Supabase Dashboard > SQL Editor > Paste and run the migration');
    console.log('      2. Use: npx supabase db push');
    console.log('      3. Or use psql command if you have it installed');
  } catch (error) {
    console.log('   ❌ Error reading migration:', error.message);
    hasErrors = true;
  }

  // 2. Create storage bucket
  console.log('\n2️⃣  Creating storage bucket...');
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) throw listError;

    const publicBucket = buckets.find(b => b.name === 'public');

    if (publicBucket) {
      console.log('   ✅ Public bucket already exists');
    } else {
      // Create bucket
      const { data, error } = await supabase.storage.createBucket('public', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'text/log',
          'application/json'
        ]
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log('   ✅ Public bucket already exists');
        } else {
          throw error;
        }
      } else {
        console.log('   ✅ Public bucket created successfully');
      }
    }

    // Create support-attachments folder (optional, will be created on first upload)
    console.log('   ℹ️  support-attachments folder will be created on first file upload');

  } catch (error) {
    console.log('   ⚠️  Storage setup needs manual configuration:', error.message);
    console.log('   Please create a "public" bucket in Supabase Dashboard > Storage');
    hasErrors = true;
  }

  // 3. Check/Set super admin
  console.log('\n3️⃣  Checking super admin configuration...');
  try {
    const { data: superAdmins, error } = await supabase
      .from('users')
      .select('id, email, is_super_admin')
      .eq('is_super_admin', true);

    if (error) throw error;

    if (superAdmins && superAdmins.length > 0) {
      console.log(`   ✅ Found ${superAdmins.length} super admin(s):`);
      superAdmins.forEach(admin => {
        console.log(`      - ${admin.email}`);
      });
    } else {
      console.log('   ⚠️  No super admins found');
      console.log('   Recommended: Set at least one user as super admin');
      console.log('   Run this SQL in Supabase Dashboard:');
      console.log('   UPDATE users SET is_super_admin = true WHERE email = \'your-email@example.com\';');
      hasErrors = true;
    }
  } catch (error) {
    console.log('   ❌ Error checking super admins:', error.message);
    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (hasErrors) {
    console.log('⚠️  SETUP INCOMPLETE - Manual steps required');
    console.log('\n📋 Next steps:');
    console.log('1. Apply the migration SQL from:');
    console.log('   supabase/migrations/20251110_support_system_schema.sql');
    console.log('2. Create "public" storage bucket in Supabase Dashboard');
    console.log('3. Set at least one user as super_admin');
    console.log('\nAfter completing these steps, run:');
    console.log('   node scripts/check-support-db.js');
  } else {
    console.log('✅ SETUP COMPLETE - Support system is ready!');
    console.log('\nYou can now use:');
    console.log('- /support/help - Contact support form');
    console.log('- Error reporting - Automatic from error toasts');
    console.log('- /support/login - Forgot password (manual reset)');
  }
  console.log('='.repeat(60));
}

setupSupportSystem().catch(console.error);
