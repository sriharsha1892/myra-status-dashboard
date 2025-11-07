#!/usr/bin/env node
/**
 * Test if the API works directly (bypassing browser cache)
 */
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testAPI() {
  console.log('\n🧪 Testing API directly...\n');

  // Test the API endpoint
  const url = 'http://localhost:3000/api/admin/users';

  console.log(`Fetching: ${url}`);
  console.log('(This tests if the fix is deployed locally)\n');

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log('\n✅ API works! Issue is browser session cache.');
      console.log('👉 YOU MUST LOGOUT AND LOGIN AGAIN\n');
    } else {
      console.log('\n❌ API still failing. Checking...');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
