#!/usr/bin/env node

/**
 * Test Account Manager Invitation Email
 * Sends a test invitation email to verify the system works
 */

require('dotenv').config({ path: '.env.local' });
const { sendAccountManagerInvitationEmail } = require('../lib/email/resend');

async function testInvitationEmail() {
  console.log('🧪 Testing account manager invitation email...\n');

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found\n');

  try {
    const result = await sendAccountManagerInvitationEmail({
      to: 'sriharsha@mordorintelligence.com', // Send to your verified email
      name: 'Test Account Manager',
      email: 'test.am@example.com',
      password: 'Test@myRA2025!X3P',
      role: 'Account Manager',
      invitedBy: 'Sriharsha (Admin)',
    });

    if (result.success) {
      console.log('✅ Invitation email sent successfully!');
      console.log('📧 Check your inbox at: sriharsha@mordorintelligence.com\n');
      console.log('🎉 The invitation email system is working!\n');
      console.log('📝 The email includes:');
      console.log('   - Welcome message with inviter name');
      console.log('   - Login credentials (email & password)');
      console.log('   - Direct login button');
      console.log('   - What they can do section');
      console.log('   - Security tips\n');
    } else {
      console.error('❌ Failed to send invitation email:', result.error);

      if (result.error?.message?.includes('validation_error')) {
        console.log('\n⚠️  Note: On Resend free tier, you can only send to your verified email.');
        console.log('   In production with a verified domain, emails will work for all users.\n');
      }

      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testInvitationEmail();
