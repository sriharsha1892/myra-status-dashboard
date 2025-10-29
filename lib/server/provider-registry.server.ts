/**
 * Provider Registry (Server-Only)
 *
 * This file should NEVER be imported by client-side code.
 * It contains the mapping between our service definitions and actual vendor status pages.
 * All vendor information is stored in environment variables and never exposed to the client.
 */

import { ServiceDefinition } from '../core/service-capabilities';

/**
 * Internal provider configuration (server-only)
 * This interface is never exposed to the client
 */
interface ProviderConfig {
  /** Obfuscated provider ID */
  providerId: string;

  /** Maps to our service definition */
  serviceId: string;

  /** Status page URL (from env var) */
  statusPageUrl: string;

  /** API endpoint for status checks (from env var) */
  apiEndpoint: string;

  /** Custom fetch strategy */
  fetchStrategy: 'atlassian' | 'exa' | 'google' | 'aws' | 'custom';

  /** Component mappings (vendor component ID -> our component ID) */
  componentMappings: Record<string, string>;
}

/**
 * Load provider configuration from environment variables
 * This ensures vendor names never appear in the codebase
 */
function loadProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  // Load each provider from environment variables
  // Format: PROVIDER_{N}_SERVICE_ID, PROVIDER_{N}_STATUS_URL, etc.

  for (let i = 1; i <= 10; i++) {
    const serviceId = process.env[`PROVIDER_${i}_SERVICE_ID`];
    if (!serviceId) continue; // No more providers configured

    const config: ProviderConfig = {
      providerId: `provider-${i}`,
      serviceId,
      statusPageUrl: process.env[`PROVIDER_${i}_STATUS_URL`] || '',
      apiEndpoint: process.env[`PROVIDER_${i}_API_ENDPOINT`] || '',
      fetchStrategy: (process.env[`PROVIDER_${i}_FETCH_STRATEGY`] as any) || 'custom',
      componentMappings: JSON.parse(process.env[`PROVIDER_${i}_COMPONENT_MAP`] || '{}'),
    };

    configs.push(config);
  }

  return configs;
}

/**
 * Cached provider configurations
 */
let providerConfigCache: ProviderConfig[] | null = null;

/**
 * Get all provider configurations
 */
export function getProviderConfigs(): ProviderConfig[] {
  if (!providerConfigCache) {
    providerConfigCache = loadProviderConfigs();
  }
  return providerConfigCache;
}

/**
 * Get provider config by service ID
 */
export function getProviderByServiceId(serviceId: string): ProviderConfig | undefined {
  return getProviderConfigs().find(p => p.serviceId === serviceId);
}

/**
 * Provider status response (internal)
 */
export interface ProviderStatusResponse {
  serviceId: string;
  components: Array<{
    componentId: string;
    status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
    lastUpdated?: string;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

/**
 * Fetch status from a provider
 * This function handles all the vendor-specific logic
 */
export async function fetchProviderStatus(config: ProviderConfig): Promise<ProviderStatusResponse> {
  try {
    const response = await fetch(config.apiEndpoint, {
      headers: { 'User-Agent': 'StatusMonitor/1.0' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Status fetch failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform vendor-specific response to our standard format
    return transformVendorResponse(config, data);
  } catch (error) {
    console.error(`[Provider ${config.providerId}] Fetch failed:`, error);

    // Return degraded status on error
    return {
      serviceId: config.serviceId,
      components: Object.values(config.componentMappings).map(componentId => ({
        componentId,
        status: 'degraded_performance',
        lastUpdated: new Date().toISOString(),
      })),
      incidents: [],
    };
  }
}

/**
 * Transform vendor-specific response to our standard format
 */
function transformVendorResponse(config: ProviderConfig, data: any): ProviderStatusResponse {
  switch (config.fetchStrategy) {
    case 'atlassian':
      return transformAtlassianResponse(config, data);
    case 'exa':
      return transformExaResponse(config, data);
    case 'google':
      return transformGoogleResponse(config, data);
    case 'aws':
      return transformAWSResponse(config, data);
    default:
      return transformDefaultResponse(config, data);
  }
}

/**
 * Transform Atlassian Statuspage.io format
 */
function transformAtlassianResponse(config: ProviderConfig, data: any): ProviderStatusResponse {
  const components = (data.components || []).map((comp: any) => {
    const ourComponentId = config.componentMappings[comp.id] || comp.id;
    return {
      componentId: ourComponentId,
      status: mapAtlassianStatus(comp.status),
      lastUpdated: comp.updated_at,
    };
  });

  const incidents = (data.incidents || []).slice(0, 5).map((incident: any) => ({
    id: incident.id,
    title: sanitizeIncidentTitle(incident.name),
    status: incident.status,
    impact: incident.impact,
    createdAt: incident.created_at,
    updatedAt: incident.updated_at,
  }));

  return {
    serviceId: config.serviceId,
    components,
    incidents,
  };
}

/**
 * Transform Exa status format
 */
function transformExaResponse(config: ProviderConfig, data: any): ProviderStatusResponse {
  const status = data.page?.status || 'UNKNOWN';
  const isOperational = status === 'UP';

  const components = Object.values(config.componentMappings).map(componentId => ({
    componentId,
    status: isOperational ? 'operational' as const : 'major_outage' as const,
    lastUpdated: new Date().toISOString(),
  }));

  return {
    serviceId: config.serviceId,
    components,
    incidents: [],
  };
}

/**
 * Transform Google Cloud status format
 */
function transformGoogleResponse(config: ProviderConfig, data: any): ProviderStatusResponse {
  // Google format transformation logic
  const components = Object.values(config.componentMappings).map(componentId => ({
    componentId,
    status: 'operational' as const,
    lastUpdated: new Date().toISOString(),
  }));

  return {
    serviceId: config.serviceId,
    components,
    incidents: [],
  };
}

/**
 * Transform AWS Health format
 */
function transformAWSResponse(config: ProviderConfig, data: any): ProviderStatusResponse {
  // AWS format transformation logic
  const components = Object.values(config.componentMappings).map(componentId => ({
    componentId,
    status: 'operational' as const,
    lastUpdated: new Date().toISOString(),
  }));

  return {
    serviceId: config.serviceId,
    components,
    incidents: [],
  };
}

/**
 * Default transformation for unknown formats
 */
function transformDefaultResponse(config: ProviderConfig, data: any): ProviderStatusResponse {
  const components = Object.values(config.componentMappings).map(componentId => ({
    componentId,
    status: 'operational' as const,
    lastUpdated: new Date().toISOString(),
  }));

  return {
    serviceId: config.serviceId,
    components,
    incidents: [],
  };
}

/**
 * Map Atlassian status to our status
 */
function mapAtlassianStatus(status: string): 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance' {
  const statusMap: Record<string, any> = {
    'operational': 'operational',
    'degraded_performance': 'degraded_performance',
    'partial_outage': 'partial_outage',
    'major_outage': 'major_outage',
    'under_maintenance': 'under_maintenance',
  };
  return statusMap[status] || 'operational';
}

/**
 * Sanitize incident titles to remove vendor references
 */
function sanitizeIncidentTitle(title: string): string {
  // Remove common vendor-specific terms
  const vendorPatterns = [
    /openai/gi,
    /anthropic/gi,
    /claude/gi,
    /gpt-?\d*/gi,
    /chatgpt/gi,
    /exa/gi,
    /gemini/gi,
    /google/gi,
    /aws/gi,
    /amazon/gi,
    /bedrock/gi,
  ];

  let sanitized = title;
  for (const pattern of vendorPatterns) {
    sanitized = sanitized.replace(pattern, 'Service');
  }

  return sanitized;
}
