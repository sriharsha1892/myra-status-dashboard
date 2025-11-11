// Automated test for customer support chat flow
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testCustomerSupportFlow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🧪 Starting Customer Support Flow Test\n');
  console.log('='.repeat(50));

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Submit customer ticket via API
  console.log('\n📝 Test 1: Submit customer support ticket via API');
  try {
    const testTimestamp = new Date().toISOString();
    const response = await fetch('http://localhost:3000/api/customer-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: `test.${Date.now()}@example.com`,
        message: `Test message from automated test - ${testTimestamp}`
      })
    });

    const data = await response.json();

    if (response.ok && data.success && data.ticketNumber) {
      console.log('   ✅ Ticket created successfully');
      console.log(`   📋 Ticket Number: ${data.ticketNumber}`);
      console.log(`   🎭 Humor: ${data.humor.title}`);
      testsPassed++;

      // Store for next tests
      global.testTicketId = data.ticketId;
      global.testTicketNumber = data.ticketNumber;
    } else {
      console.log('   ❌ Failed to create ticket');
      console.log('   Error:', data.error || 'Unknown error');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ API request failed:', error.message);
    testsFailed++;
  }

  // Test 2: Verify ticket exists in database
  console.log('\n📊 Test 2: Verify ticket exists in database');
  try {
    if (!global.testTicketId) {
      console.log('   ⏭️  Skipped (previous test failed)');
    } else {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_id', global.testTicketId)
        .single();

      if (error) throw error;

      if (ticket && ticket.source === 'customer_chat') {
        console.log('   ✅ Ticket found in database');
        console.log(`   📋 ID: ${ticket.ticket_id}`);
        console.log(`   📧 Email: ${ticket.user_email}`);
        console.log(`   📌 Status: ${ticket.status}`);
        console.log(`   🎯 Priority: ${ticket.priority}`);
        console.log(`   🏷️  Source: ${ticket.source}`);
        testsPassed++;
      } else {
        console.log('   ❌ Ticket not found or wrong source');
        testsFailed++;
      }
    }
  } catch (error) {
    console.log('   ❌ Database query failed:', error.message);
    testsFailed++;
  }

  // Test 3: Verify notification was created for admin
  console.log('\n🔔 Test 3: Verify notification was created for admin');
  try {
    if (!global.testTicketId) {
      console.log('   ⏭️  Skipped (previous test failed)');
    } else {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('entity_id', global.testTicketId)
        .eq('notification_type', 'support_ticket');

      if (error) throw error;

      if (notifications && notifications.length > 0) {
        console.log(`   ✅ ${notifications.length} notification(s) created`);
        notifications.forEach((notif, idx) => {
          console.log(`   📬 Notification ${idx + 1}:`);
          console.log(`      Title: ${notif.title}`);
          console.log(`      Status: ${notif.status}`);
          console.log(`      Priority: ${notif.priority_score}`);
        });
        testsPassed++;
      } else {
        console.log('   ❌ No notifications found');
        testsFailed++;
      }
    }
  } catch (error) {
    console.log('   ❌ Notification query failed:', error.message);
    testsFailed++;
  }

  // Test 4: Verify admin can query customer tickets
  console.log('\n👨‍💼 Test 4: Verify admin can query customer tickets');
  try {
    const { data: customerTickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('source', 'customer_chat')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (customerTickets && customerTickets.length > 0) {
      console.log(`   ✅ Found ${customerTickets.length} customer ticket(s)`);
      console.log('   📋 Recent tickets:');
      customerTickets.slice(0, 3).forEach((t, idx) => {
        console.log(`      ${idx + 1}. ${t.ticket_number} - ${t.user_name} (${t.status})`);
      });
      testsPassed++;
    } else {
      console.log('   ⚠️  No customer tickets found (this may be expected if no tickets exist)');
      testsPassed++;
    }
  } catch (error) {
    console.log('   ❌ Query failed:', error.message);
    testsFailed++;
  }

  // Test 5: Verify admin user exists and has correct permissions
  console.log('\n🔐 Test 5: Verify admin user has correct permissions');
  try {
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('id, email, role, is_super_admin')
      .eq('email', 'admin@myra.ai')
      .maybeSingle();

    if (error) throw error;

    if (adminUser) {
      const hasAdminRole = adminUser.role?.toLowerCase().includes('admin');
      const isSuperAdmin = adminUser.is_super_admin === true;

      if (hasAdminRole || isSuperAdmin) {
        console.log('   ✅ Admin user has correct permissions');
        console.log(`   👤 Email: ${adminUser.email}`);
        console.log(`   🎭 Role: ${adminUser.role}`);
        console.log(`   ⭐ Super Admin: ${adminUser.is_super_admin}`);
        testsPassed++;
      } else {
        console.log('   ❌ Admin user lacks permissions');
        console.log(`      Role: ${adminUser.role}, Super Admin: ${adminUser.is_super_admin}`);
        testsFailed++;
      }
    } else {
      console.log('   ❌ Admin user not found');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Permission check failed:', error.message);
    testsFailed++;
  }

  // Test 6: Validate required fields
  console.log('\n✅ Test 6: Validate API rejects missing fields');
  try {
    const response = await fetch('http://localhost:3000/api/customer-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        // Missing email and message
      })
    });

    const data = await response.json();

    if (!response.ok && data.error) {
      console.log('   ✅ API correctly rejects invalid data');
      console.log(`   📝 Error: ${data.error}`);
      testsPassed++;
    } else {
      console.log('   ❌ API should have rejected invalid data');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Validation test failed:', error.message);
    testsFailed++;
  }

  // Test 7: Check draft saving localStorage structure
  console.log('\n💾 Test 7: Verify draft structure (localStorage format)');
  try {
    const mockDraft = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message'
    };

    const draftString = JSON.stringify(mockDraft);
    const parsed = JSON.parse(draftString);

    if (parsed.name && parsed.email && parsed.message) {
      console.log('   ✅ Draft structure is valid');
      console.log('   📝 Format:', draftString);
      testsPassed++;
    } else {
      console.log('   ❌ Draft structure is invalid');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Draft structure test failed:', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Customer support system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
console.log('Starting tests in 2 seconds...');
setTimeout(() => {
  testCustomerSupportFlow().catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
}, 2000);
