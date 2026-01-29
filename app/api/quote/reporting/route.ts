import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type MetricType = 'hubspot' | 'apollo' | 'inbound';

export interface HubSpotMetrics {
  sent: number;
  reached: number;
  followed: number;
  qualified: number;
}

export interface ApolloMetrics {
  contacted: number;
  responses: number;
  qualified: number;
}

export interface InboundMetrics {
  visitors_en: number;
  visitors_non_en: number;
  leads: number;
  active: number;
}

export interface GTMMetric {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  entry_date: string;
  metric_type: MetricType;
  data: HubSpotMetrics | ApolloMetrics | InboundMetrics;
}

export interface GTMMetricsResponse {
  hubspot: HubSpotMetrics | null;
  apollo: ApolloMetrics | null;
  inbound: InboundMetrics | null;
  lastUpdated: string | null;
}

// GET - Fetch GTM metrics for dashboard
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch latest metrics for each type within the date range
    const { data, error } = await supabase
      .from('gtm_metrics')
      .select('*')
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0])
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('GTM metrics fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get latest entry for each metric type
    const metrics: GTMMetricsResponse = {
      hubspot: null,
      apollo: null,
      inbound: null,
      lastUpdated: null,
    };

    let latestDate: string | null = null;

    for (const entry of data || []) {
      const type = entry.metric_type as MetricType;
      if (!metrics[type]) {
        metrics[type] = entry.data;
        if (!latestDate || entry.entry_date > latestDate) {
          latestDate = entry.entry_date;
        }
      }
    }

    metrics.lastUpdated = latestDate;

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('GTM metrics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GTM metrics' },
      { status: 500 }
    );
  }
}

// POST - Save GTM metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entry_date, metrics, created_by = 'admin' } = body;

    if (!entry_date) {
      return NextResponse.json(
        { error: 'entry_date is required' },
        { status: 400 }
      );
    }

    if (!metrics || typeof metrics !== 'object') {
      return NextResponse.json(
        { error: 'metrics object is required' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each metric type
    for (const [metricType, data] of Object.entries(metrics)) {
      if (!data || typeof data !== 'object') continue;

      // Upsert: insert or update if exists
      const { data: upsertedData, error } = await supabase
        .from('gtm_metrics')
        .upsert(
          {
            entry_date,
            metric_type: metricType,
            data,
            created_by,
          },
          {
            onConflict: 'entry_date,metric_type',
          }
        )
        .select()
        .single();

      if (error) {
        errors.push({ metric_type: metricType, error: error.message });
      } else {
        results.push(upsertedData);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to save metrics', errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saved: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('GTM metrics POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save GTM metrics' },
      { status: 500 }
    );
  }
}
