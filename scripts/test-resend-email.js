#!/usr/bin/env node

/**
 * Test Resend Email Integration
 * Sends a test email to verify Resend API key is working
 */

require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('🧪 Testing Resend email integration...\n');

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found:', process.env.RESEND_API_KEY.substring(0, 10) + '...\n');

  try {
    const { data, error } = await resend.emails.send({
      from: 'MyRA AI <onboarding@resend.dev>',
      to: ['sriharsha@mordorintelligence.com'], // Send test to your verified email
      subject: '🧪 Test Email from MyRA Trial Notifications System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 40px; color: white; text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700;">🎉 Email Test Successful!</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.95;">
                Your Resend integration is working perfectly
              </p>
            </div>

            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1a202c;">System Status</h2>

              <div style="margin-bottom: 15px;">
                <strong style="color: #4a5568;">API Key:</strong>
                <span style="color: #22c55e; margin-left: 10px;">✓ Valid</span>
              </div>

              <div style="margin-bottom: 15px;">
                <strong style="color: #4a5568;">Email Delivery:</strong>
                <span style="color: #22c55e; margin-left: 10px;">✓ Working</span>
              </div>

              <div style="margin-bottom: 15px;">
                <strong style="color: #4a5568;">Templates:</strong>
                <span style="color: #22c55e; margin-left: 10px;">✓ Loaded</span>
              </div>

              <div>
                <strong style="color: #4a5568;">Cron Schedule:</strong>
                <span style="color: #3b82f6; margin-left: 10px;">9:00 AM IST Daily</span>
              </div>
            </div>

            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 25px;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a202c;">✨ What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #4a5568; line-height: 1.8;">
                <li>Trial expiring notifications will run daily at 9 AM IST</li>
                <li>Account managers will receive emails 2 days before trial expiration</li>
                <li>In-app notifications will appear in the priority category</li>
                <li>System automatically prevents duplicate notifications</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Generated with ❤️ by MyRA AI Trial Management System
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Powered by Resend | Scheduled via Vercel Cron
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      process.exit(1);
    }

    console.log('✅ Test email sent successfully!');
    console.log('📧 Email ID:', data.id);
    console.log('📬 Check admin@myra.ai inbox for the test email\n');
    console.log('🎉 Resend integration is working perfectly!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testEmail();
