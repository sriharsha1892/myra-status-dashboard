/**
 * POST /api/enrichment/analyze
 * Analyze entities and return prioritized questions with current values
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getQuestionsForEntityType,
  sortQuestionsByPriority,
  calculateOrgCompleteness,
  calculateUserCompleteness,
  calculateCombinedCompleteness,
  inferSuggestionsWithGroq,
} from '@/lib/enrichment';
import type { AnalyzeRequest, AnalyzeResponse, QuestionWithContext } from '@/lib/enrichment/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AnalyzeRequest = await request.json();
    const { entityIds, entityType, userRole } = body;

    if (!entityIds || entityIds.length === 0) {
      return NextResponse.json({ error: 'No entity IDs provided' }, { status: 400 });
    }

    // Fetch entity data based on type (with extra fields for AI inference)
    let entities: Array<{ id: string; name: string; [key: string]: unknown }> = [];
    let entitiesForInference: Array<{ id: string; [key: string]: unknown }> = [];

    if (entityType === 'organization') {
      const { data: orgs, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, health_status, deal_momentum, description, mrr, employee_count, industry')
        .in('org_id', entityIds);

      if (error) throw error;

      entities = (orgs || []).map(org => ({
        id: org.org_id,
        name: org.org_name || 'Unnamed Org',
        health_status: org.health_status,
        deal_momentum: org.deal_momentum,
        description: org.description,
      }));

      // Fetch recent timeline events for inference
      const { data: events } = await supabase
        .from('trial_timeline_events')
        .select('org_id, event_type, event_timestamp')
        .in('org_id', entityIds)
        .gte('event_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('event_timestamp', { ascending: false });

      // Build entities with inference data
      entitiesForInference = (orgs || []).map(org => {
        const orgEvents = (events || []).filter(e => e.org_id === org.org_id);
        return {
          id: org.org_id,
          org_name: org.org_name,
          mrr: org.mrr,
          employee_count: org.employee_count,
          industry: org.industry,
          recentEvents: orgEvents.map(e => ({
            event_type: e.event_type,
            timestamp: e.event_timestamp,
          })),
        };
      });
    } else if (entityType === 'user') {
      const { data: users, error } = await supabase
        .from('trial_users')
        .select('user_id, name, email, influence, role, title')
        .in('user_id', entityIds);

      if (error) throw error;

      entities = (users || []).map(u => ({
        id: u.user_id,
        name: u.name || u.email?.split('@')[0] || 'Unknown',
        influence: u.influence,
        role: u.role,
      }));

      entitiesForInference = (users || []).map(u => ({
        id: u.user_id,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title || u.role, // Use title or fall back to role
      }));
    }

    // Get relevant questions for this entity type and user role
    const questions = sortQuestionsByPriority(
      getQuestionsForEntityType(entityType, userRole)
    );

    // Run AI inference on entities using Groq
    const questionIds = questions.map(q => q.id);
    const aiSuggestions = await inferSuggestionsWithGroq(entityType, entitiesForInference, questionIds);

    // Build questions with context (current values for each entity)
    const questionsWithContext: QuestionWithContext[] = questions.map(q => {
      const entitiesWithValues = entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        currentValue: entity[q.targetField] ?? null,
      }));

      // Filter to only entities missing this field
      const entitiesNeedingAnswer = entitiesWithValues.filter(e =>
        e.currentValue === null || e.currentValue === undefined || e.currentValue === ''
      );

      // Get AI suggestion for this question
      const aiSuggestion = aiSuggestions.get(q.id);

      return {
        ...q,
        entities: entitiesNeedingAnswer,
        aiSuggestion: aiSuggestion || undefined,
      };
    }).filter(q => q.entities.length > 0); // Only include questions with missing data

    // Calculate completeness score
    let completenessScore = 0;
    if (entityType === 'organization') {
      completenessScore = calculateOrgCompleteness(entities).score;
    } else {
      completenessScore = calculateUserCompleteness(entities).score;
    }

    // Create a session for tracking (type assertion for new table not in types yet)
    let sessionId = '';
    try {
      const { data: session, error: sessionError } = await (supabase as any)
        .from('enrichment_sessions')
        .insert({
          user_email: user.email,
          user_role: userRole,
          trigger: 'post_import',
          entity_ids: entityIds,
          questions_presented: questionsWithContext.map(q => q.id),
          completeness_before: completenessScore,
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Failed to create session:', sessionError);
      } else if (session) {
        sessionId = session.id;
      }
    } catch (e) {
      console.error('Session creation error:', e);
    }

    const response: AnalyzeResponse = {
      questions: questionsWithContext,
      completenessScore,
      sessionId,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error analyzing entities:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze entities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
