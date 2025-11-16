import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyUserAccess } from '@/lib/auth-helper';
import {
  createImportResults,
  addSuccess,
  addFailure,
  addWarning,
  verifyImportCounts,
  generateImportSummary,
  type ImportResults
} from '@/lib/errors/importResultsFormatter';
import {
  PerformanceTimer,
  checkDatasetSize,
  logAPIStart,
  logAPIComplete,
  logBatchProgress
} from '@/lib/monitoring/performance';
import { chunkArray } from '@/lib/utils/arrayUtils';
import { withErrorHandler, validateRequired } from '@/lib/middleware/errorHandler';

/**
 * POST /api/timeline/import/confirm
 * Import reviewed and confirmed events, pain points, and learnings
 * Supports both old Circle K format and new LLM parser format
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Start performance monitoring
  const performanceTimer = new PerformanceTimer('Timeline Import', {});
  const requestId = performanceTimer.getRequestId();

  logAPIStart('POST', '/api/timeline/import/confirm', requestId);

  // Verify user access
  const { authorized, userId } = await verifyUserAccess(request);
  if (!authorized || !userId) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const supabase = await createClient();
  const body = await request.json();

  const { org_id, events, pain_points, learnings, raw_text, source_type = 'bulk_import_llm' } = body;

  // Validate required fields
  validateRequired(body, ['org_id', 'events']);

    // Check dataset sizes and log warnings if large
    checkDatasetSize('Events', events.length, requestId);
    if (pain_points) checkDatasetSize('Pain Points', pain_points.length, requestId);
    if (learnings) checkDatasetSize('Learnings', learnings.length, requestId);

    // Create import session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('import_sessions')
      .insert({
        org_id,
        user_id: userId,
        source_type,
        raw_text,
        events_parsed: events.length,
        events_imported: 0,
        pain_points_created: 0,
        learnings_created: 0,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;
    const sessionId = sessionData.id;

    // Create result trackers for each import type
    const eventResults = createImportResults<typeof events[0]>();
    const painPointResults = createImportResults<typeof pain_points[0]>();
    const learningResults = createImportResults<typeof learnings[0]>();

    // Prepare all events for batch insert
    const eventsToInsert = events.map((event: any) => ({
      org_id,
      event_type: event.event_type,
      event_category: event.event_category,
      title: event.title,
      description: event.description || null,
      event_timestamp: new Date(event.event_timestamp).toISOString(),
      sentiment: event.sentiment || 'neutral',
      severity: event.severity || 'medium',
      tags: event.tags || [],
      mentioned_people: event.mentioned_people || [],
      mentioned_features: event.mentioned_features || [],
      follow_up_required: event.follow_up_required || false,
      follow_up_date: event.follow_up_date ? new Date(event.follow_up_date).toISOString().split('T')[0] : null,
      logged_by: userId,
      source: source_type,
      parse_confidence: event.parse_confidence || 1.0,
    }));

    // Insert events in batches of 50 for better performance
    const eventBatches = chunkArray(eventsToInsert, 50);
    let processedEvents = 0;

    for (let batchIndex = 0; batchIndex < eventBatches.length; batchIndex++) {
      const batch = eventBatches[batchIndex];
      const batchStartIndex = batchIndex * 50;

      try {
        const { data: batchData, error: batchError } = await supabase
          .from('trial_timeline_events')
          .insert(batch)
          .select('id');

        if (batchError) throw batchError;

        // Track successful inserts
        if (batchData) {
          batchData.forEach((record, idx) => {
            const originalEvent = events[batchStartIndex + idx];
            addSuccess(eventResults, record.id, originalEvent);
            processedEvents++;
          });
        }

        // Log progress for large imports
        if (events.length > 50) {
          logBatchProgress('Event Import', processedEvents, events.length, requestId);
        }
      } catch (error: any) {
        // Track all events in failed batch
        batch.forEach((_, idx) => {
          const originalEvent = events[batchStartIndex + idx];
          addFailure(eventResults, originalEvent, error, 'timeline_event_import');
        });
      }
    }

    // Insert pain points if provided
    if (pain_points && pain_points.length > 0) {
      for (const pp of pain_points) {
        try {
          // Check if similar pain point exists
          const { data: existing } = await supabase
            .from('pain_points')
            .select('*')
            .ilike('title', `%${pp.title.substring(0, 50)}%`)
            .single();

          if (existing) {
            // Update existing pain point
            const { error: updateError } = await supabase
              .from('pain_points')
              .update({
                reported_count: existing.reported_count + 1,
                affected_orgs: [...new Set([...existing.affected_orgs, org_id])],
                last_reported_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;

            addSuccess(painPointResults, existing.id, pp);
          } else {
            // Create new pain point
            const { data: ppData, error: ppError } = await supabase
              .from('pain_points')
              .insert({
                ...pp,
                affected_orgs: [org_id],
                status: 'open',
              })
              .select()
              .single();

            if (ppError) throw ppError;

            if (ppData) {
              addSuccess(painPointResults, ppData.id, pp);
            }
          }
        } catch (error: any) {
          addFailure(painPointResults, pp, error, 'pain_point_import');
        }
      }
    }

    // Insert learnings if provided
    if (learnings && learnings.length > 0) {
      for (const learning of learnings) {
        try {
          // Check if similar learning exists
          const { data: existing } = await supabase
            .from('learnings')
            .select('*')
            .ilike('title', `%${learning.title.substring(0, 50)}%`)
            .single();

          if (existing) {
            // Update existing learning
            const { error: updateError } = await supabase
              .from('learnings')
              .update({
                reported_count: existing.reported_count + 1,
                source_orgs: [...new Set([...existing.source_orgs, org_id])],
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;

            addSuccess(learningResults, existing.id, learning);
          } else {
            // Create new learning
            const { data: learningData, error: learningError } = await supabase
              .from('learnings')
              .insert({
                ...learning,
                source_orgs: [org_id],
                actionable: true,
                implemented: false,
              })
              .select()
              .single();

            if (learningError) throw learningError;

            if (learningData) {
              addSuccess(learningResults, learningData.id, learning);
            }
          }
        } catch (error: any) {
          addFailure(learningResults, learning, error, 'learning_import');
        }
      }
    }

    // Generate summaries with verification
    const eventSummary = generateImportSummary(eventResults, 'events', events.length);
    const painPointSummary = generateImportSummary(painPointResults, 'pain points', pain_points?.length || 0);
    const learningSummary = generateImportSummary(learningResults, 'learnings', learnings?.length || 0);

    // Verify counts
    verifyImportCounts(eventResults, events.length, 'events');
    if (pain_points) verifyImportCounts(painPointResults, pain_points.length, 'pain points');
    if (learnings) verifyImportCounts(learningResults, learnings.length, 'learnings');

    // Update import session with actual results
    await supabase
      .from('import_sessions')
      .update({
        events_imported: eventResults.successful.length,
        pain_points_created: painPointResults.successful.length,
        learnings_created: learningResults.successful.length,
        parse_stats: {
          total_events: events.length,
          total_pain_points: pain_points?.length || 0,
          total_learnings: learnings?.length || 0,
          failed_events: eventResults.failed.length,
          failed_pain_points: painPointResults.failed.length,
          failed_learnings: learningResults.failed.length,
        },
      })
      .eq('id', sessionId);

    // Determine overall success (true only if NO failures)
    const overallSuccess = eventSummary.success && painPointSummary.success && learningSummary.success;

    // Stop performance timer and log completion
    const timing = performanceTimer.stop();
    logAPIComplete(
      'POST',
      '/api/timeline/import/confirm',
      timing.duration,
      requestId,
      overallSuccess,
      {
        events_imported: eventResults.successful.length,
        pain_points_created: painPointResults.successful.length,
        learnings_created: learningResults.successful.length,
        total_items: events.length + (pain_points?.length || 0) + (learnings?.length || 0)
      }
    );

    return NextResponse.json({
      success: overallSuccess,
      data: {
        session_id: sessionId,
        events_imported: eventResults.successful.length,
        pain_points_created: painPointResults.successful.length,
        learnings_created: learningResults.successful.length,
        inserted_event_ids: eventResults.successful.map(s => s.id),
        summaries: {
          events: eventSummary,
          pain_points: painPointSummary,
          learnings: learningSummary,
        },
        // Include failed items for debugging/retry
        failed: {
          events: eventResults.failed,
          pain_points: painPointResults.failed,
          learnings: learningResults.failed,
        },
        warnings: [
          ...eventResults.warnings,
          ...painPointResults.warnings,
          ...learningResults.warnings,
        ],
      }
    });
});
