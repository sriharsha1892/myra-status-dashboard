import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Verify super admin access
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

    // Check Brevo configuration server-side
    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    const fromName = process.env.FROM_NAME;
    const baseUrl = process.env.NEXT_PUBLIC_URL;

    const isConfigured = !!(brevoApiKey && fromEmail && fromName);

    return NextResponse.json({
      brevoConfigured: isConfigured,
      fromEmail: fromEmail || '',
      fromName: fromName || '',
      baseUrl: baseUrl || '',
      // Don't expose the actual API key
      hasApiKey: !!brevoApiKey,
    });
  } catch (error: any) {
    console.error('Error checking Brevo status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Brevo status' },
      { status: 500 }
    );
  }
}
