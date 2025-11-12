/**
 * Resend Email Client Setup
 *
 * Used for sending trial expiring and trial stale notifications
 * Free tier: 100 emails/day, 3,000 emails/month
 *
 * Setup: https://resend.com/api-keys
 */

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not found. Email notifications will not work.');
  console.warn('   Get your API key from: https://resend.com/api-keys');
}

export const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key');

/**
 * Email configuration
 */
export const emailConfig = {
  from: process.env.RESEND_FROM_EMAIL || 'MyRA AI <onboarding@resend.dev>',
  replyTo: process.env.RESEND_REPLY_TO || 'support@myra.ai',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://myra-status-dashboard.vercel.app',
};

/**
 * Send trial expiring notification email
 */
export async function sendTrialExpiringEmail({
  to,
  orgName,
  trialEndDate,
  daysRemaining,
  orgId,
}: {
  to: string;
  orgName: string;
  trialEndDate: string;
  daysRemaining: number;
  orgId: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Cannot send email: RESEND_API_KEY not configured');
    return { error: 'Email service not configured' };
  }

  try {
    const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://myra-status-dashboard.vercel.app'}/support/trials/${orgId}`;

    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: [to],
      replyTo: emailConfig.replyTo,
      subject: `⏰ Trial Expiring Soon: ${orgName} (${daysRemaining} days remaining)`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px;">⏰ Trial Expiring Soon</h1>
            </div>

            <!-- Content -->
            <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 15px 0; font-size: 16px;">Hi there,</p>

              <p style="margin: 0 0 20px 0; font-size: 16px;">
                The trial for <strong>${orgName}</strong> is expiring in <strong style="color: #dc2626;">${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>.
              </p>

              <div style="background: white; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong style="color: #111;">Trial End Date:</strong><br>
                  ${new Date(trialEndDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <p style="margin: 20px 0 15px 0; font-size: 16px;">
                <strong>Recommended Actions:</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #555;">
                <li style="margin-bottom: 8px;">Check in with the customer about their trial experience</li>
                <li style="margin-bottom: 8px;">Address any blockers or questions they may have</li>
                <li style="margin-bottom: 8px;">Schedule a demo or follow-up call if needed</li>
                <li style="margin-bottom: 8px;">Prepare conversion materials and pricing discussions</li>
              </ul>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${actionUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                  View Trial Details →
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; color: #666; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0;">myRA AI - Trial Management Dashboard</p>
              <p style="margin: 0; color: #999;">
                This is an automated notification from your trial management system.
              </p>
            </div>

          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { error };
    }

    console.log('✅ Trial expiring email sent:', { to, orgName, emailId: data?.id });
    return { data };
  } catch (error: any) {
    console.error('Failed to send trial expiring email:', error);
    return { error: error.message };
  }
}

/**
 * Send trial stale notification email (for trials with no updates for 14+ days)
 */
export async function sendTrialStaleEmail({
  to,
  orgName,
  daysSinceLastUpdate,
  lastUpdateDate,
  orgId,
}: {
  to: string;
  orgName: string;
  daysSinceLastUpdate: number;
  lastUpdateDate: string;
  orgId: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Cannot send email: RESEND_API_KEY not configured');
    return { error: 'Email service not configured' };
  }

  try {
    const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://myra-status-dashboard.vercel.app'}/support/trials/${orgId}`;

    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: [to],
      replyTo: emailConfig.replyTo,
      subject: `🔔 Trial Needs Attention: ${orgName} (${daysSinceLastUpdate} days since last update)`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px;">🔔 Trial Needs Attention</h1>
            </div>

            <!-- Content -->
            <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 15px 0; font-size: 16px;">Hi there,</p>

              <p style="margin: 0 0 20px 0; font-size: 16px;">
                The trial for <strong>${orgName}</strong> hasn't been updated in <strong style="color: #d97706;">${daysSinceLastUpdate} days</strong>.
              </p>

              <div style="background: white; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong style="color: #111;">Last Updated:</strong><br>
                  ${new Date(lastUpdateDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <p style="margin: 20px 0 15px 0; font-size: 16px;">
                <strong>Suggested Actions:</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #555;">
                <li style="margin-bottom: 8px;">Reach out to the customer to check on progress</li>
                <li style="margin-bottom: 8px;">Update the trial status or add activity notes</li>
                <li style="margin-bottom: 8px;">Schedule a check-in call or demo</li>
                <li style="margin-bottom: 8px;">Re-engage if the trial has gone cold</li>
              </ul>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${actionUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                  Update Trial Status →
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; color: #666; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0;">myRA AI - Trial Management Dashboard</p>
              <p style="margin: 0; color: #999;">
                This is an automated notification from your trial management system.
              </p>
            </div>

          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { error };
    }

    console.log('✅ Trial stale email sent:', { to, orgName, emailId: data?.id });
    return { data };
  } catch (error: any) {
    console.error('Failed to send trial stale email:', error);
    return { error: error.message };
  }
}

/**
 * Send welcome/invitation email to new account manager
 */
export async function sendAccountManagerInvitationEmail({
  to,
  name,
  email,
  password,
  role,
  invitedBy,
}: {
  to: string;
  name: string;
  email: string;
  password: string;
  role: string;
  invitedBy: string;
}): Promise<{ success: boolean; error?: any }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('Cannot send email: RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: [to],
      replyTo: emailConfig.replyTo,
      subject: `🎉 Welcome to MyRA AI - Your Account is Ready!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 40px; color: white; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);">
              <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 700;">🎉 Welcome to MyRA AI!</h1>
              <p style="margin: 0; font-size: 18px; opacity: 0.95;">
                Your trial management account is ready
              </p>
            </div>

            <!-- Welcome message -->
            <div style="background: white; border-radius: 12px; padding: 30px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                ${invitedBy} has invited you to join <strong>MyRA AI</strong> as a <strong>${role}</strong>.
                Your account has been created and you're ready to start managing trial organizations!
              </p>
            </div>

            <!-- Credentials box -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1e3a8a; text-align: center;">
                🔐 Your Login Credentials
              </h2>

              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                <div style="margin-bottom: 15px;">
                  <strong style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 5px;">EMAIL</strong>
                  <code style="background: #f3f4f6; padding: 10px 15px; border-radius: 6px; display: block; font-size: 15px; color: #1f2937; font-family: monospace;">${email}</code>
                </div>

                <div>
                  <strong style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 5px;">PASSWORD</strong>
                  <code style="background: #fef3c7; padding: 10px 15px; border-radius: 6px; display: block; font-size: 15px; color: #92400e; font-family: monospace;">${password}</code>
                </div>
              </div>

              <p style="margin: 0; font-size: 13px; color: #6b7280; text-align: center;">
                💡 <em>Save these credentials in a secure location</em>
              </p>
            </div>

            <!-- Login button -->
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${emailConfig.appUrl}/support/login" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                🚀 Login to MyRA AI
              </a>
            </div>

            <!-- What you can do -->
            <div style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a202c;">✨ What you can do:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #4a5568; line-height: 1.8;">
                <li>Manage your assigned trial organizations</li>
                <li>Track engagement scores and trial timelines</li>
                <li>Add notes and comments on customer interactions</li>
                <li>Receive notifications for expiring trials</li>
                <li>View analytics and reports</li>
              </ul>
            </div>

            <!-- Security note -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                <strong>🔒 Security Tip:</strong> Please change your password after your first login by going to your Profile Settings.
              </p>
            </div>

            <!-- Need help -->
            <div style="background: white; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
                <strong>Need help getting started?</strong>
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Contact your admin or reach out to our support team
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Welcome to the team! 🎉
              </p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                MyRA AI - Trial Management Platform
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Login URL: ${emailConfig.appUrl}/support/login
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      return { success: false, error };
    }

    console.log('✅ Invitation email sent:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error };
  }
}
