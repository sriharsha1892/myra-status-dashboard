import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helper';
// Email notifications temporarily disabled
// import { sendAccountManagerInvitationEmail } from '@/lib/email/resend';

/**
 * POST /api/admin/users/resend-invite
 * Resend invitation email to a user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, role } = body;

    // Validate required fields
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: 'Email, name, password, and role are required' },
        { status: 400 }
      );
    }

    // Email notifications temporarily disabled
    return NextResponse.json(
      { error: 'Email notifications are currently disabled. Please share credentials manually.' },
      { status: 503 }
    );

    // const adminName = authResult.user.user_metadata?.name || authResult.user.email || 'Admin';
    // const emailResult = await sendAccountManagerInvitationEmail({
    //   to: email,
    //   name,
    //   email,
    //   password,
    //   role,
    //   invitedBy: adminName,
    // });
    // if (emailResult.success) {
    //   return NextResponse.json({
    //     success: true,
    //     message: 'Invitation email sent successfully',
    //   });
    // } else {
    //   console.error('Failed to send invitation email:', emailResult.error);
    //   return NextResponse.json(
    //     { error: 'Failed to send invitation email' },
    //     { status: 500 }
    //   );
    // }
  } catch (error: any) {
    console.error('Error in resend-invite API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
