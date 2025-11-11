import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCircleKStyleNotes } from '@/lib/timeline/parser';

/**
 * POST /api/timeline/import
 * Parse and import bulk CRM notes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { org_id, raw_text, source_type = 'crm_notes' } = body;

    if (!org_id || !raw_text) {
      return NextResponse.json(
        { success: false, error: 'org_id and raw_text are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse the text
    const parseResult = parseCircleKStyleNotes(raw_text);

    // Return parsed events for review (don't insert yet)
    return NextResponse.json({
      success: true,
      data: {
        events: parseResult.events,
        pain_points: parseResult.pain_points,
        learnings: parseResult.learnings,
        overall_confidence: parseResult.overall_confidence,
      }
    });
  } catch (error: any) {
    console.error('Error parsing import:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse import' },
      { status: 500 }
    );
  }
}
