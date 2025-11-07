import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/account-managers
 * Returns list of all users for account manager dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get all users from Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching account managers:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Map to dropdown format
    const managers = data.users.map(user => ({
      user_id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
      role: user.user_metadata?.role || 'Team',
    }));

    // Sort by name
    managers.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return NextResponse.json({ managers });
  } catch (error) {
    console.error('Error in GET /api/account-managers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
