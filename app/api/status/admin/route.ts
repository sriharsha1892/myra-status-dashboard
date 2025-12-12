import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StatusCache } from '@/lib/status-cache';
import { isAdmin } from '@/lib/support/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get full provider status (not sanitized)
    const cache = StatusCache.getInstance();
    const { providers, isStale, isColdStart } = await cache.getStatuses();
    const overallStatus = cache.getOverallStatus();

    // Return full provider data for admin view
    const response = {
      providers: providers.map(p => ({
        provider: {
          id: p.provider.id,
          name: p.provider.name, // Real vendor name (e.g., "OpenAI")
          displayName: p.provider.displayName,
          userFacingName: p.provider.userFacingName,
          statusPageUrl: p.provider.statusPageUrl,
          apiEndpoint: p.provider.apiEndpoint,
          color: p.provider.color,
          priority: p.provider.priority,
          models: p.provider.models,
          role: p.provider.role,
          regions: p.provider.regions,
          services: p.provider.services,
        },
        status: p.status,
        indicator: p.indicator,
        lastUpdated: p.lastUpdated,
        components: p.components, // Full component data
        incidents: p.incidents, // Full incident data with real names
        scheduledMaintenances: p.scheduledMaintenances,
        uptimePercentage: cache.getUptimePercentage(p.provider.id),
        history: cache.getHistory(p.provider.id),
      })),
      lastUpdated: new Date().toISOString(),
      overallStatus,
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
    console.error('Error in admin status API:', error);
    return NextResponse.json(
      { error: 'Unable to retrieve system status' },
      { status: 500 }
    );
  }
}
