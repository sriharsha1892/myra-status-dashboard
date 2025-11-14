/**
 * Bulk User Import API Endpoint
 * Uses Groq AI to parse unstructured user data and import trial users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseUsers,
  type RawUserData,
  type ParsedUser,
} from '@/lib/ai/userParser';
import { isGroqAvailable } from '@/lib/ai/groqClient';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Check if Groq is available
    if (!isGroqAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI features not configured - GROQ_API_KEY missing',
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { org_id, raw_text, account_manager } = body;

    // Validate input
    if (!org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'org_id is required',
        },
        { status: 400 }
      );
    }

    if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'raw_text is required and must be a non-empty string',
        },
        { status: 400 }
      );
    }

    if (!account_manager) {
      return NextResponse.json(
        {
          success: false,
          error: 'account_manager is required',
        },
        { status: 400 }
      );
    }

    console.log(`Parsing users for org ${org_id}...`);

    // Parse users using AI
    const parseResult = await parseUsers({ rawText: raw_text });

    if (!parseResult.success || parseResult.users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || 'No valid users found in the provided text',
          invalid: parseResult.invalid,
          duplicates: parseResult.duplicates,
        },
        { status: 400 }
      );
    }

    console.log(`AI parsed ${parseResult.users.length} users`);

    // Check for existing users in this org
    const emails = parseResult.users.map(u => u.email);
    const { data: existingUsers } = await supabaseAdmin
      .from('trial_users')
      .select('email')
      .eq('org_id', org_id)
      .in('email', emails);

    const existingEmails = new Set(existingUsers?.map(u => u.email) || []);

    // Filter out existing users
    const newUsers = parseResult.users.filter(u => !existingEmails.has(u.email));
    const skippedUsers = parseResult.users.filter(u => existingEmails.has(u.email));

    if (newUsers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'All users already exist in this organization',
          summary: {
            parsed: parseResult.users.length,
            new: 0,
            existing: skippedUsers.length,
            failed: 0,
          },
          skipped: skippedUsers.map(u => ({
            email: u.email,
            name: u.name,
            reason: 'Already exists in organization',
          })),
        },
        { status: 400 }
      );
    }

    console.log(`Importing ${newUsers.length} new users (${skippedUsers.length} already exist)`);

    // Insert users into trial_users table
    const usersToInsert = newUsers.map(user => ({
      org_id,
      name: user.name,
      email: user.email,
      role: user.role,
      account_manager,
      current_stage: 'invited',
      invited_at: new Date().toISOString(),
    }));

    const { data: insertedUsers, error: insertError } = await supabaseAdmin
      .from('trial_users')
      .insert(usersToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting users:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to insert users into database',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    console.log(`Successfully imported ${insertedUsers?.length || 0} users`);

    // Prepare results
    const results = newUsers.map(user => ({
      email: user.email,
      name: user.name,
      role: user.role,
      confidence: user.confidence,
      success: true,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        parsed: parseResult.users.length,
        new: insertedUsers?.length || 0,
        existing: skippedUsers.length,
        failed: 0,
        invalid: parseResult.invalid?.length || 0,
        duplicates: parseResult.duplicates?.length || 0,
      },
      results,
      skipped: skippedUsers.map(u => ({
        email: u.email,
        name: u.name,
        role: u.role,
        reason: 'Already exists in organization',
      })),
      invalid: parseResult.invalid || [],
      duplicates: parseResult.duplicates || [],
      inserted_users: insertedUsers,
    });
  } catch (error: any) {
    console.error('User import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user import is available
export async function GET(request: NextRequest) {
  const available = isGroqAvailable();

  return NextResponse.json({
    available,
    message: available
      ? 'AI user parsing is available'
      : 'AI user parsing is not available - GROQ_API_KEY not configured',
  });
}
