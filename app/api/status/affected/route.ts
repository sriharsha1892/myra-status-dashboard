import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * "I'm Affected" API for incident confirmation
 *
 * POST - Increment affected count for an incident
 * GET - Get affected count for an incident
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');

    if (!incidentId) {
      return NextResponse.json(
        { success: false, error: 'Missing incidentId parameter' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Note: Using type cast since incident_affected_counts table types may not be generated yet
    const { data, error } = await (supabase
      .from('incident_affected_counts') as any)
      .select('affected_count')
      .eq('incident_id', incidentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's OK, just means 0 count
      console.error('Error fetching affected count:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const result = data as { affected_count: number } | null;

    return NextResponse.json({
      success: true,
      affectedCount: result?.affected_count || 0,
    });
  } catch (error: any) {
    console.error('Error in affected count GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get affected count' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { incidentId, providerId } = body;

    if (!incidentId) {
      return NextResponse.json(
        { success: false, error: 'Missing incidentId' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // First try to get existing record
    // Note: Using type cast since incident_affected_counts table types may not be generated yet
    const { data: existingData } = await (supabase
      .from('incident_affected_counts') as any)
      .select('id, affected_count')
      .eq('incident_id', incidentId)
      .single();

    const existing = existingData as { id: string; affected_count: number } | null;
    let newCount: number;

    if (existing) {
      // Increment existing count
      const { data, error } = await (supabase
        .from('incident_affected_counts') as any)
        .update({
          affected_count: existing.affected_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('affected_count')
        .single();

      if (error) {
        throw error;
      }
      const result = data as { affected_count: number };
      newCount = result.affected_count;
    } else {
      // Create new record
      const { data, error } = await (supabase
        .from('incident_affected_counts') as any)
        .insert({
          incident_id: incidentId,
          provider_id: providerId || 'unknown',
          affected_count: 1,
        })
        .select('affected_count')
        .single();

      if (error) {
        throw error;
      }
      const result = data as { affected_count: number };
      newCount = result.affected_count;
    }

    return NextResponse.json({
      success: true,
      affectedCount: newCount,
    });
  } catch (error: any) {
    console.error('Error in affected count POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record affected status' },
      { status: 500 }
    );
  }
}
