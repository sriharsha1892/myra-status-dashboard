/**
 * Email System Test Script
 *
 * Tests Brevo email configuration and sends a sample notification
 *
 * Usage: node scripts/test-email-system.js <your-email@example.com>
 */

require('dotenv').config({ path: '.env.local' });

async function testEmailSystem() {
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error('❌ Please provide a test email address:');
    console.error('   node scripts/test-email-system.js your-email@example.com');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  EMAIL SYSTEM TEST');
  console.log('='.repeat(60) + '\n');

  // Check environment variables
  console.log('📋 Checking configuration...\n');

  const brevoKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'notifications@example.com';
  const fromName = process.env.FROM_NAME || 'Myra Status Dashboard';
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  if (!brevoKey) {
    console.error('❌ BREVO_API_KEY not found in .env.local');
    console.error('   Please add your Brevo API key to .env.local');
    process.exit(1);
  }

  console.log(`✅ BREVO_API_KEY: ${brevoKey.substring(0, 20)}...`);
  console.log(`✅ FROM_EMAIL: ${fromEmail}`);
  console.log(`✅ FROM_NAME: ${fromName}`);
  console.log(`✅ BASE_URL: ${baseUrl}`);
  console.log(`✅ Test recipient: ${testEmail}\n`);

  // Import email sending function
  console.log('📧 Sending test email...\n');

  try {
    // Dynamic import since we're using ES modules
    const { sendNotificationEmail } = await import('../lib/email/send-notification-email.ts');

    // Test 1: Send a mention notification
    console.log('Test 1: Mention Notification');
    const mentionResult = await sendNotificationEmail('mention', {
      to: testEmail,
      toName: 'Test User',
      actorName: 'Claude (Email System Test)',
      orgName: 'Test Organization',
      notePreview: 'This is a test mention notification from your email system. If you receive this, Brevo is configured correctly!',
      actionUrl: '/support/trials/test-123',
      notePriority: 60,
    });

    if (mentionResult.success) {
      console.log(`✅ Mention email sent successfully!`);
      console.log(`   Message ID: ${mentionResult.messageId}`);
    } else {
      console.error(`❌ Failed to send mention email:`);
      console.error(`   Reason: ${mentionResult.reason}`);
      if (mentionResult.error) {
        console.error(`   Error:`, mentionResult.error);
      }
    }

    console.log('\n');

    // Test 2: Send a trial handoff notification
    console.log('Test 2: Trial Handoff Notification');
    const handoffResult = await sendNotificationEmail('trial_handoff', {
      to: testEmail,
      toName: 'Test User',
      orgName: 'Test Organization',
      previousAccountManager: 'previous@example.com',
      newAccountManager: testEmail,
      handoffReason: 'Email system testing',
      contextNotes: 'This is a test handoff notification to verify the email templates are rendering correctly.',
      actionUrl: '/support/trials/test-123',
      actorName: 'Claude (Email System Test)',
    });

    if (handoffResult.success) {
      console.log(`✅ Handoff email sent successfully!`);
      console.log(`   Message ID: ${handoffResult.messageId}`);
    } else {
      console.error(`❌ Failed to send handoff email:`);
      console.error(`   Reason: ${handoffResult.reason}`);
      if (handoffResult.error) {
        console.error(`   Error:`, handoffResult.error);
      }
    }

    console.log('\n');

    // Summary
    console.log('='.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    const bothSuccess = mentionResult.success && handoffResult.success;

    if (bothSuccess) {
      console.log('✅ All tests passed!');
      console.log(`\n📬 Check your inbox at ${testEmail}`);
      console.log('   You should receive 2 test emails:');
      console.log('   1. Mention Notification');
      console.log('   2. Trial Handoff Notification\n');
      console.log('💡 Next steps:');
      console.log('   - Integrate email sending into notification creation');
      console.log('   - Build digest generation logic');
      console.log('   - Set up cron jobs for scheduled digests\n');
    } else {
      console.error('❌ Some tests failed. Please check the errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

testEmailSystem();
