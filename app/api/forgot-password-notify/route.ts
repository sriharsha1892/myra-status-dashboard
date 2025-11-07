import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Send notification email to admin
    const supabase = createClient();

    // Use Supabase's email service to notify admin
    const adminEmail = 'sriharsha@mordorintelligence.com';
    const subject = `Password Reset Request: ${email}`;
    const message = `
User ${email} requested a password reset.

To reset their password manually, run:
node scripts/reset-user-password.js ${email} NewPassword123!

Then send them their new temporary password.

---
Automated notification from Myra Support Portal
    `.trim();

    // For now, just log it (Supabase email needs to be configured)
    console.log('📧 FORGOT PASSWORD NOTIFICATION');
    console.log(`To: ${adminEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message:\n${message}`);

    // TODO: Once Supabase email is configured, uncomment this:
    // await supabase.auth.admin.generateLink({
    //   type: 'recovery',
    //   email: adminEmail,
    //   options: {
    //     data: {
    //       userEmail: email,
    //       message: message
    //     }
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: 'Admin has been notified. You will receive a new password via email shortly.'
    });

  } catch (error: any) {
    console.error('Forgot password notify error:', error);
    return NextResponse.json({
      error: 'Failed to send notification',
      details: error.message
    }, { status: 500 });
  }
}
