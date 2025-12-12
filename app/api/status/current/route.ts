import { NextResponse } from 'next/server';
import { StatusCache } from '@/lib/status-cache';
import { buildResearchStatusResponse } from '@/lib/research-status';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const cache = StatusCache.getInstance();
    const { providers, isStale, isColdStart } = await cache.getStatuses();

    // Calculate uptime stats
    const uptimeStats = {
      thirtyDayUptime: calculateThirtyDayUptime(providers, cache),
      incidentsThisMonth: countIncidentsThisMonth(providers),
    };

    // Build user-centric research status response
    const researchStatus = buildResearchStatusResponse(providers, uptimeStats);

    // Add metadata
    const response = {
      ...researchStatus,
      isStale,
      isColdStart,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in status API:', error);
    return NextResponse.json(
      {
        researchEngine: {
          status: 'unavailable',
          message: 'Unable to retrieve system status. Please try again later.',
          affectedStages: [],
        },
        authentication: {
          google: { id: 'google-workspace', name: 'Google', status: 'unavailable', message: 'Status unavailable' },
          microsoft: { id: 'microsoft-entraid', name: 'Microsoft', status: 'unavailable', message: 'Status unavailable' },
        },
        pipeline: { stages: [] },
        incidents: [],
        lastUpdated: new Date().toISOString(),
        uptimeStats: { thirtyDayUptime: 0, incidentsThisMonth: 0 },
        isStale: true,
        isColdStart: true,
        error: 'Unable to retrieve system status',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate 30-day uptime percentage
 */
function calculateThirtyDayUptime(
  providers: any[],
  cache: ReturnType<typeof StatusCache.getInstance>
): number {
  // Get research engine providers only (exclude auth)
  const researchProviders = providers.filter(p =>
    ['openai', 'anthropic', 'exa', 'aws'].includes(p.provider.id)
  );

  if (researchProviders.length === 0) return 100;

  // Calculate average uptime across research providers
  const uptimes = researchProviders.map(p => cache.getUptimePercentage(p.provider.id));
  const averageUptime = uptimes.reduce((sum, u) => sum + u, 0) / uptimes.length;

  return Math.round(averageUptime * 10) / 10; // Round to 1 decimal
}

/**
 * Count incidents in the current month
 */
function countIncidentsThisMonth(providers: any[]): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let count = 0;
  for (const provider of providers) {
    for (const incident of provider.incidents || []) {
      const incidentDate = new Date(incident.created_at);
      if (incidentDate >= startOfMonth) {
        count++;
      }
    }
  }

  return count;
}
