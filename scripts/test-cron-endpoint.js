#!/usr/bin/env node

/**
 * Test Trial Expiring Cron Endpoint
 * Manually triggers the cron job to test trial expiring notifications
 */

require('dotenv').config({ path: '.env.local' });

async function testCronEndpoint() {
  console.log('🧪 Testing trial expiring cron endpoint...\n');

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('❌ CRON_SECRET not found in .env.local');
    process.exit(1);
  }

  console.log('✅ CRON_SECRET found\n');
  console.log('📡 Sending request to http://localhost:3000/api/cron/trial-expiring\n');

  try {
    const response = await fetch('http://localhost:3000/api/cron/trial-expiring', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Cron endpoint failed:', data);
      console.error('Status:', response.status);
      process.exit(1);
    }

    console.log('✅ Cron endpoint executed successfully!\n');
    console.log('📊 Results:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');

    if (data.trialsProcessed === 0) {
      console.log('ℹ️  No trials are expiring in 2 days');
      console.log('   This is expected if no trials match the criteria\n');
    } else {
      console.log(`✅ Processed ${data.trialsProcessed} trial(s)`);
      console.log('📧 Check your email and in-app notifications!\n');
    }

    console.log('🎉 Trial expiring notifications system is working!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure your dev server is running:');
    console.error('  npm run dev\n');
    process.exit(1);
  }
}

testCronEndpoint();
