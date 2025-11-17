import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNotificationEmail } from '@/lib/email/send-notification-email';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const { data: userData } = await supabase
      .from('users' as any)
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single() as any;

    if (userData?.role !== 'Admin' || !userData?.is_super_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Send test mention email
    const result = await sendNotificationEmail('mention', {
      to: email,
      toName: email.split('@')[0],
      actorName: 'System Admin (Test)',
      orgName: 'Test Organization',
      notePreview: 'This is a test email to verify your Brevo configuration is working correctly. If you receive this email, everything is set up properly!',
      actionUrl: '/support/admin/email-settings',
      notePriority: 60,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.reason || 'Failed to send test email',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
