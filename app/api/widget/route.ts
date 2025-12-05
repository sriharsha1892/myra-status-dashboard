import { NextRequest, NextResponse } from 'next/server';

/**
 * Widget API - CORS-enabled endpoint for embeddable status widget
 *
 * Returns simplified status data for external embedding.
 * Supports CORS for cross-origin requests.
 *
 * Query parameters:
 * - providers: Comma-separated list of provider IDs to include (optional)
 *
 * Response format:
 * {
 *   overallStatus: 'operational' | 'degraded' | 'outage',
 *   statusMessage: string,
 *   servicesOperational: number,
 *   servicesTotal: number,
 *   lastUpdated: string,
 *   providers?: ProviderSummary[]
 * }
 */

interface ProviderSummary {
  id: string;
  name: string;
  status: string;
  uptime: number;
}

interface WidgetResponse {
  overallStatus: 'operational' | 'degraded' | 'outage';
  statusMessage: string;
  servicesOperational: number;
  servicesTotal: number;
  lastUpdated: string;
  providers?: ProviderSummary[];
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'public, max-age=30, s-maxage=30',
};

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    // Fetch status from the main status API
    const baseUrl = request.nextUrl.origin;
    const statusResponse = await fetch(`${baseUrl}/api/status/current`, {
      cache: 'no-store',
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to fetch status data');
    }

    const statusData = await statusResponse.json();

    // Get optional provider filter from query
    const providersParam = request.nextUrl.searchParams.get('providers');
    const providerFilter = providersParam
      ? providersParam.split(',').map((p) => p.trim().toLowerCase())
      : null;

    // Process providers
    let providers = statusData.providers || [];

    // Apply filter if specified
    if (providerFilter) {
      providers = providers.filter((p: any) =>
        providerFilter.includes(p.provider.id.toLowerCase())
      );
    }

    // Calculate overall status
    const hasOutage = providers.some(
      (p: any) =>
        p.status === 'major_outage' ||
        p.status === 'partial_outage'
    );
    const hasDegraded = providers.some(
      (p: any) =>
        p.status === 'degraded_performance' ||
        p.status === 'under_maintenance'
    );

    const operationalCount = providers.filter(
      (p: any) => p.status === 'operational'
    ).length;

    let overallStatus: 'operational' | 'degraded' | 'outage';
    let statusMessage: string;

    if (hasOutage) {
      overallStatus = 'outage';
      statusMessage = 'Service Disruption';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
      statusMessage = 'Partial Degradation';
    } else {
      overallStatus = 'operational';
      statusMessage = 'All Systems Operational';
    }

    // Build provider summaries
    const providerSummaries: ProviderSummary[] = providers.map((p: any) => ({
      id: p.provider.id,
      name: p.provider.displayName,
      status: p.status,
      uptime: p.uptime || 100,
    }));

    const response: WidgetResponse = {
      overallStatus,
      statusMessage,
      servicesOperational: operationalCount,
      servicesTotal: providers.length,
      lastUpdated: statusData.lastUpdated,
      providers: providerSummaries,
    };

    return NextResponse.json(response, {
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('Widget API error:', error);

    return NextResponse.json(
      {
        overallStatus: 'operational',
        statusMessage: 'Status Unavailable',
        servicesOperational: 0,
        servicesTotal: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message || 'Failed to fetch status',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
