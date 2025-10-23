import { NextResponse } from 'next/server';
import { StatusCache } from '@/lib/status-cache';
import { StatusResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const cache = StatusCache.getInstance();
    const providers = await cache.getStatuses();
    const overallStatus = cache.getOverallStatus();

    // Add history and uptime to each provider
    const providersWithHistory = providers.map(p => ({
      ...p,
      history: cache.getHistory(p.provider.id),
      uptimePercentage: cache.getUptimePercentage(p.provider.id)
    }));

    const response = {
      providers: providersWithHistory,
      lastUpdated: new Date().toISOString(),
      overallStatus,
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
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
