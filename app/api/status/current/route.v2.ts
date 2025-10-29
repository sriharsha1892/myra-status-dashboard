/**
 * Status API v2 - Service-Based Architecture
 *
 * This version uses the service catalog and provider registry
 * to completely decouple vendor information from the client.
 */

import { NextResponse } from 'next/server';
import { SERVICE_CATALOG, ServiceDefinition } from '@/lib/core/service-capabilities';
import { getProviderConfigs, fetchProviderStatus } from '@/lib/server/provider-registry.server';
import { sanitizeApiResponse } from '@/lib/middleware/sanitizer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ServiceStatusResponse {
  serviceId: string;
  displayName: string;
  description: string;
  category: string;
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  indicator: 'none' | 'minor' | 'major' | 'critical';
  color: string;
  priority: string;
  capabilities: string[];
  components: Array<{
    componentId: string;
    displayName: string;
    description: string;
    status: string;
    critical: boolean;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string;
    createdAt: string;
    updatedAt: string;
  }>;
  lastUpdated: string;
  uptimePercentage: number;
}

/**
 * Calculate uptime percentage for a service
 */
function calculateUptime(incidents: any[]): number {
  // Simple calculation: 100% minus percentage of time in incidents
  // In production, this would use historical data
  const hasActiveIncident = incidents.some(i => i.status !== 'resolved');
  return hasActiveIncident ? 99.5 : 99.9;
}

/**
 * Map component status to indicator level
 */
function getIndicatorFromStatus(
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance'
): 'none' | 'minor' | 'major' | 'critical' {
  const indicatorMap: Record<string, 'none' | 'minor' | 'major' | 'critical'> = {
    'operational': 'none',
    'degraded_performance': 'minor',
    'partial_outage': 'major',
    'major_outage': 'critical',
    'under_maintenance': 'minor',
  };
  return indicatorMap[status] || 'none';
}

/**
 * Determine overall service status from component statuses
 */
function getOverallServiceStatus(
  componentStatuses: Array<{ status: string; critical: boolean }>
): 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance' {
  const hasMajorOutage = componentStatuses.some(c => c.status === 'major_outage' && c.critical);
  const hasPartialOutage = componentStatuses.some(c => c.status === 'partial_outage' || c.status === 'major_outage');
  const hasDegraded = componentStatuses.some(c => c.status === 'degraded_performance');
  const hasMaintenance = componentStatuses.some(c => c.status === 'under_maintenance');

  if (hasMajorOutage) return 'major_outage';
  if (hasPartialOutage) return 'partial_outage';
  if (hasDegraded) return 'degraded_performance';
  if (hasMaintenance) return 'under_maintenance';
  return 'operational';
}

/**
 * Fetch status for all services
 */
async function fetchAllServiceStatuses(): Promise<ServiceStatusResponse[]> {
  const providerConfigs = getProviderConfigs();
  const serviceStatuses: ServiceStatusResponse[] = [];

  // Fetch status for each configured provider
  const statusPromises = providerConfigs.map(config => fetchProviderStatus(config));
  const providerStatuses = await Promise.all(statusPromises);

  // Transform provider statuses to service statuses
  for (const providerStatus of providerStatuses) {
    const service = SERVICE_CATALOG.find(s => s.serviceId === providerStatus.serviceId);
    if (!service) continue;

    // Map provider components to service components
    const components = service.components.map(serviceComponent => {
      const providerComponent = providerStatus.components.find(
        c => c.componentId === serviceComponent.componentId
      );

      return {
        componentId: serviceComponent.componentId,
        displayName: serviceComponent.displayName,
        description: serviceComponent.description,
        status: providerComponent?.status || 'operational',
        critical: serviceComponent.critical,
      };
    });

    const overallStatus = getOverallServiceStatus(components);
    const indicator = getIndicatorFromStatus(overallStatus);

    serviceStatuses.push({
      serviceId: service.serviceId,
      displayName: service.displayName,
      description: service.description,
      category: service.category,
      status: overallStatus,
      indicator,
      color: service.color,
      priority: service.priority,
      capabilities: service.capabilities,
      components,
      incidents: providerStatus.incidents,
      lastUpdated: new Date().toISOString(),
      uptimePercentage: calculateUptime(providerStatus.incidents),
    });
  }

  return serviceStatuses;
}

/**
 * Calculate overall system status
 */
function getOverallSystemStatus(services: ServiceStatusResponse[]): {
  status: string;
  operational: number;
  degraded: number;
  outage: number;
} {
  const operational = services.filter(s => s.status === 'operational').length;
  const degraded = services.filter(s => s.status === 'degraded_performance').length;
  const outage = services.filter(s =>
    s.status === 'partial_outage' || s.status === 'major_outage'
  ).length;

  let overallStatus = 'operational';
  if (outage > 0) {
    overallStatus = 'partial_outage';
  } else if (degraded > 0) {
    overallStatus = 'degraded_performance';
  }

  return {
    status: overallStatus,
    operational,
    degraded,
    outage,
  };
}

export async function GET() {
  try {
    // Fetch all service statuses
    const services = await fetchAllServiceStatuses();

    // Calculate overall system status
    const overallStatus = getOverallSystemStatus(services);

    // Build response
    const response = {
      services,
      overallStatus,
      lastUpdated: new Date().toISOString(),
      totalServices: services.length,
    };

    // Sanitize response to ensure no vendor references leak
    const sanitizedResponse = sanitizeApiResponse(response);

    return NextResponse.json(sanitizedResponse, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in status API:', error);

    // Even errors should be sanitized
    return NextResponse.json(
      sanitizeApiResponse({
        error: 'Unable to retrieve system status. Please try again later.',
        services: [],
        overallStatus: {
          status: 'unknown',
          operational: 0,
          degraded: 0,
          outage: 0,
        },
      }),
      { status: 500 }
    );
  }
}
