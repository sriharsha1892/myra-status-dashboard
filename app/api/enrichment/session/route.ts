/**
 * POST /api/enrichment/session
 * Complete or update an enrichment session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CompleteSessionRequest {
  sessionId: string;
  completenessAfter: number;
}

interface SkipQuestionRequest {
  sessionId: string;
  questionId: string;
  entityIds: string[];
  entityType: 'organization' | 'user';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;

    if (action === 'complete') {
      const { sessionId, completenessAfter } = body as CompleteSessionRequest;

      const { error } = await (supabase as any)
        .from('enrichment_sessions')
        .update({
          completed_at: new Date().toISOString(),
          completeness_after: completenessAfter,
        })
        .eq('id', sessionId)
        .eq('user_email', user.email);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'skip') {
      const { sessionId, questionId, entityIds, entityType } = body as SkipQuestionRequest;

      // Record skipped answers
      const skips = entityIds.map(entityId => ({
        session_id: sessionId,
        question_id: questionId,
        entity_type: entityType,
        entity_id: entityId,
        status: 'skipped',
        answered_by: user.email,
      }));

      try {
        const { error: skipError } = await (supabase as any)
          .from('enrichment_answers')
          .insert(skips);

        if (skipError) {
          console.warn('Failed to record skip:', skipError);
        }

        // Increment skip count on session
        const { data: session } = await (supabase as any)
          .from('enrichment_sessions')
          .select('answers_skipped')
          .eq('id', sessionId)
          .single();

        if (session) {
          await (supabase as any)
            .from('enrichment_sessions')
            .update({ answers_skipped: (session.answers_skipped || 0) + 1 })
            .eq('id', sessionId);
        }
      } catch (e) {
        console.warn('Skip recording error:', e);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error with session:', error);
    const message = error instanceof Error ? error.message : 'Session operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const { data: session, error } = await (supabase as any)
      .from('enrichment_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_email', user.email)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error: unknown) {
    console.error('Error fetching session:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
