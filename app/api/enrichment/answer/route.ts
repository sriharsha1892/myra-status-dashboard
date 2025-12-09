/**
 * POST /api/enrichment/answer
 * Submit an enrichment answer and update the target table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getQuestionById, calculateOrgCompleteness, calculateUserCompleteness } from '@/lib/enrichment';
import type { AnswerRequest, AnswerResponse } from '@/lib/enrichment/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AnswerRequest = await request.json();
    const { sessionId, questionId, entityIds, value, source, aiConfidence } = body;

    if (!questionId || !entityIds || entityIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get question definition
    const question = getQuestionById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Unknown question' }, { status: 400 });
    }

    // Determine the correct ID column based on entity type
    const idColumn = question.entityType === 'organization' ? 'org_id' : 'user_id';

    // Update the target table with the new value (using any for dynamic table access)
    const { error: updateError, count } = await (supabase as any)
      .from(question.targetTable)
      .update({ [question.targetField]: value })
      .in(idColumn, entityIds);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Record the answer in enrichment_answers for audit
    if (sessionId) {
      try {
        const answerRecords = entityIds.map(entityId => ({
          session_id: sessionId,
          question_id: questionId,
          entity_type: question.entityType,
          entity_id: entityId,
          status: 'answered',
          value: { answer: value },
          source,
          ai_confidence: aiConfidence,
          answered_by: user.email,
        }));

        const { error: answerError } = await (supabase as any)
          .from('enrichment_answers')
          .insert(answerRecords);

        if (answerError) {
          console.warn('Failed to record answer audit:', answerError);
        }

        // Update session answer count
        const { data: session } = await (supabase as any)
          .from('enrichment_sessions')
          .select('answers_given')
          .eq('id', sessionId)
          .single();

        if (session) {
          await (supabase as any)
            .from('enrichment_sessions')
            .update({ answers_given: (session.answers_given || 0) + 1 })
            .eq('id', sessionId);
        }
      } catch (e) {
        console.warn('Audit recording error:', e);
      }
    }

    // Calculate new completeness score
    let newCompletenessScore = 0;
    if (question.entityType === 'organization') {
      const { data: orgs } = await supabase
        .from('trial_organizations')
        .select('org_id, health_status, deal_momentum, description')
        .in('org_id', entityIds);

      if (orgs) {
        newCompletenessScore = calculateOrgCompleteness(
          (orgs as any[]).map(o => ({ id: o.org_id, ...o }))
        ).score;
      }
    } else {
      const { data: users } = await supabase
        .from('trial_users')
        .select('user_id, influence, role')
        .in('user_id', entityIds);

      if (users) {
        newCompletenessScore = calculateUserCompleteness(
          (users as any[]).map(u => ({ id: u.user_id, ...u }))
        ).score;
      }
    }

    const response: AnswerResponse = {
      success: true,
      updatedCount: count || entityIds.length,
      newCompletenessScore,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error submitting answer:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit answer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
