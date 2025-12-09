// Email API - List and parse emails
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmails, parseAndCreateEmail } from '@/lib/email/service';
import type { IngestionMethod } from '@/lib/email/types';

// GET /api/email - List emails
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const emails = await getEmails({
      org_id,
      status,
      limit,
      offset,
    });

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

// POST /api/email - Parse and create email
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { raw_content, ingestion_method, org_id } = body;

    if (!raw_content || typeof raw_content !== 'string') {
      return NextResponse.json(
        { error: 'raw_content is required' },
        { status: 400 }
      );
    }

    if (!ingestion_method || !['paste', 'webhook', 'forward'].includes(ingestion_method)) {
      return NextResponse.json(
        { error: 'Valid ingestion_method is required (paste, webhook, forward)' },
        { status: 400 }
      );
    }

    const email = await parseAndCreateEmail(
      {
        raw_content,
        ingestion_method: ingestion_method as IngestionMethod,
        org_id,
      },
      user.id
    );

    return NextResponse.json({ email }, { status: 201 });
  } catch (error) {
    console.error('Error parsing email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse email' },
      { status: 500 }
    );
  }
}
