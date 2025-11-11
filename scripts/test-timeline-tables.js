#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTables() {
  console.log('🔍 Testing Timeline tables...\n');

  const tables = [
    'trial_timeline_events',
    'pain_points',
    'learnings',
    'import_sessions',
    'event_type_taxonomy',
    'timeline_views'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Table exists`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n📋 Checking event types...');
  const { data: types, error: typesError } = await supabase
    .from('event_type_taxonomy')
    .select('event_type')
    .limit(5);

  if (types && types.length > 0) {
    console.log(`✅ Found ${types.length} event types (sample):`, types.map(t => t.event_type).join(', '));
  } else {
    console.log('❌ No event types found - migration may not have run completely');
  }
}

testTables();
