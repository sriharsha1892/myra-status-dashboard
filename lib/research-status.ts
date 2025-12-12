/**
 * Research Status Model
 *
 * Transforms provider-level status into user-centric research readiness status.
 * Users see "Research Engine" status, not individual provider status.
 */

import { ProviderStatus, ServiceStatus } from './types';

// Research Engine Status (simplified for users)
export type ResearchEngineStatus = 'operational' | 'delayed' | 'unavailable';

// Pipeline stage status
export type PipelineStageStatus = 'operational' | 'delayed' | 'unavailable';

// Auth provider status
export type AuthProviderStatus = 'available' | 'unavailable';

// Pipeline stage definition
export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: PipelineStageStatus;
  // Which providers affect this stage (internal, not exposed to users)
  providerIds: string[];
}

// Auth provider definition
export interface AuthProviderInfo {
  id: string;
  name: string;
  status: AuthProviderStatus;
  message: string;
}

// Main research status response (user-facing)
export interface ResearchStatusResponse {
  // Main research engine status
  researchEngine: {
    status: ResearchEngineStatus;
    message: string;
    affectedStages: string[]; // Names of stages with issues
  };

  // Auth status (separate, user-specific)
  authentication: {
    google: AuthProviderInfo;
    microsoft: AuthProviderInfo;
  };

  // Pipeline visualization
  pipeline: {
    stages: PipelineStage[];
  };

  // Active incidents (sanitized for users)
  incidents: SanitizedIncident[];

  // Metadata
  lastUpdated: string;

  // Uptime stats
  uptimeStats: {
    thirtyDayUptime: number;
    incidentsThisMonth: number;
  };
}

// Sanitized incident for user display
export interface SanitizedIncident {
  id: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  message: string;
  affectedArea: string; // e.g., "Web search services"
  createdAt: string;
  updatedAt: string;
  updates: {
    timestamp: string;
    status: string;
    message: string;
  }[];
}

// Pipeline stage definitions (maps to providers internally)
export const PIPELINE_STAGES: Omit<PipelineStage, 'status'>[] = [
  {
    id: 'planning',
    name: 'Research Planning',
    description: 'Processing requests and creating research briefs',
    providerIds: ['anthropic'],
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Finding and analyzing web content',
    providerIds: ['exa', 'openai'],
  },
  {
    id: 'validation',
    name: 'Data Validation',
    description: 'Validating research accuracy',
    providerIds: ['openai'],
  },
  {
    id: 'output',
    name: 'Output Generation',
    description: 'Creating final presentations and reports',
    providerIds: ['anthropic'],
  },
];

// Research engine providers (excluding auth)
const RESEARCH_PROVIDER_IDS = ['openai', 'anthropic', 'exa', 'google', 'aws'];

// Auth provider IDs
const AUTH_PROVIDER_IDS = ['google-workspace', 'microsoft-entraid'];

/**
 * Maps provider service status to simplified stage status
 */
function mapToStageStatus(providerStatus: ServiceStatus): PipelineStageStatus {
  switch (providerStatus) {
    case 'operational':
      return 'operational';
    case 'degraded_performance':
    case 'partial_outage':
    case 'under_maintenance':
      return 'delayed';
    case 'major_outage':
    case 'unknown':
      return 'unavailable';
    default:
      return 'operational';
  }
}

/**
 * Get the worst status from multiple statuses
 */
function getWorstStatus(statuses: PipelineStageStatus[]): PipelineStageStatus {
  if (statuses.includes('unavailable')) return 'unavailable';
  if (statuses.includes('delayed')) return 'delayed';
  return 'operational';
}

/**
 * Calculate research engine status from provider statuses
 */
export function calculateResearchEngineStatus(
  providers: ProviderStatus[]
): ResearchEngineStatus {
  const researchProviders = providers.filter(p =>
    RESEARCH_PROVIDER_IDS.includes(p.provider.id)
  );

  // Check for AWS outage first (infrastructure = complete outage)
  const awsProvider = researchProviders.find(p => p.provider.id === 'aws');
  if (awsProvider?.status === 'major_outage') {
    return 'unavailable';
  }

  // Check primary providers (OpenAI, Anthropic, Exa)
  const primaryProviders = researchProviders.filter(p =>
    p.provider.priority === 'primary'
  );

  const hasAnyMajorOutage = primaryProviders.some(p =>
    p.status === 'major_outage'
  );

  const hasAnyDegradation = primaryProviders.some(p =>
    p.status === 'degraded_performance' ||
    p.status === 'partial_outage' ||
    p.status === 'under_maintenance'
  );

  // If any primary provider has major outage, check if fallback (Google) is available
  if (hasAnyMajorOutage) {
    const googleProvider = researchProviders.find(p => p.provider.id === 'google');
    const googleOperational = googleProvider?.status === 'operational' ||
                               googleProvider?.status === 'degraded_performance';

    // If no fallback available, research is unavailable
    if (!googleOperational) {
      return 'unavailable';
    }
    // If fallback available, research is delayed (retrying)
    return 'delayed';
  }

  if (hasAnyDegradation) {
    return 'delayed';
  }

  return 'operational';
}

/**
 * Calculate pipeline stage statuses
 */
export function calculatePipelineStages(
  providers: ProviderStatus[]
): PipelineStage[] {
  return PIPELINE_STAGES.map(stage => {
    const stageProviders = providers.filter(p =>
      stage.providerIds.includes(p.provider.id)
    );

    const stageStatuses = stageProviders.map(p => mapToStageStatus(p.status));
    const worstStatus = getWorstStatus(stageStatuses);

    return {
      ...stage,
      status: worstStatus,
    };
  });
}

/**
 * Get user-friendly message for research engine status
 */
export function getResearchEngineMessage(
  status: ResearchEngineStatus,
  affectedStages: string[]
): string {
  switch (status) {
    case 'operational':
      return 'myRA is operational. Research will complete normally.';
    case 'delayed':
      if (affectedStages.length > 0) {
        return `myRA is experiencing delays. ${affectedStages[0]} services are being retried.`;
      }
      return 'myRA is experiencing delays. Research will complete but may take longer than usual.';
    case 'unavailable':
      return 'myRA is temporarily unavailable. We are working to restore service.';
    default:
      return 'myRA status is being checked.';
  }
}

/**
 * Calculate auth provider status
 */
export function calculateAuthStatus(
  providers: ProviderStatus[]
): { google: AuthProviderInfo; microsoft: AuthProviderInfo } {
  const googleProvider = providers.find(p => p.provider.id === 'google-workspace');
  const microsoftProvider = providers.find(p => p.provider.id === 'microsoft-entraid');

  const getAuthProviderInfo = (
    provider: ProviderStatus | undefined,
    name: string,
    id: string
  ): AuthProviderInfo => {
    if (!provider) {
      // If provider not being monitored yet, assume available
      return {
        id,
        name,
        status: 'available',
        message: `${name} sign-in is available`,
      };
    }

    const isAvailable = provider.status === 'operational' ||
                        provider.status === 'degraded_performance';

    return {
      id,
      name,
      status: isAvailable ? 'available' : 'unavailable',
      message: isAvailable
        ? `${name} sign-in is available`
        : `${name} sign-in is temporarily unavailable`,
    };
  };

  return {
    google: getAuthProviderInfo(googleProvider, 'Google', 'google-workspace'),
    microsoft: getAuthProviderInfo(microsoftProvider, 'Microsoft', 'microsoft-entraid'),
  };
}

/**
 * Sanitize incidents for user display (remove vendor names, generic messages)
 */
export function sanitizeIncidents(
  providers: ProviderStatus[]
): SanitizedIncident[] {
  const allIncidents: SanitizedIncident[] = [];

  // Map provider IDs to user-friendly area names
  const areaNames: Record<string, string> = {
    'openai': 'Research architecture services',
    'anthropic': 'Research orchestration services',
    'exa': 'Web search services',
    'google': 'Backup processing services',
    'aws': 'Platform infrastructure',
    'google-workspace': 'Google sign-in',
    'microsoft-entraid': 'Microsoft sign-in',
  };

  for (const provider of providers) {
    for (const incident of provider.incidents || []) {
      // Skip resolved incidents older than 24 hours
      const updatedAt = new Date(incident.updated_at);
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (incident.status === 'resolved' && updatedAt.getTime() < twentyFourHoursAgo) {
        continue;
      }

      // Map incident status
      const statusMap: Record<string, SanitizedIncident['status']> = {
        'investigating': 'investigating',
        'identified': 'identified',
        'monitoring': 'monitoring',
        'resolved': 'resolved',
        'postmortem': 'resolved',
      };

      // Create sanitized incident
      allIncidents.push({
        id: incident.id,
        status: statusMap[incident.status] || 'investigating',
        message: getSanitizedIncidentMessage(incident.status),
        affectedArea: areaNames[provider.provider.id] || 'System services',
        createdAt: incident.created_at,
        updatedAt: incident.updated_at,
        updates: (incident.incident_updates || []).map(update => ({
          timestamp: update.created_at,
          status: update.status,
          message: getSanitizedUpdateMessage(update.status),
        })),
      });
    }
  }

  // Sort by most recent first
  return allIncidents.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Get sanitized incident message (no vendor names)
 */
function getSanitizedIncidentMessage(status: string): string {
  switch (status) {
    case 'investigating':
      return 'Issue detected - investigating';
    case 'identified':
      return 'Root cause identified - working on resolution';
    case 'monitoring':
      return 'Fix deployed - monitoring for stability';
    case 'resolved':
    case 'postmortem':
      return 'Issue resolved - all services operating normally';
    default:
      return 'Status update';
  }
}

/**
 * Get sanitized update message
 */
function getSanitizedUpdateMessage(status: string): string {
  switch (status) {
    case 'investigating':
      return 'Our systems are investigating the issue';
    case 'identified':
      return 'Root cause identified, working on resolution';
    case 'monitoring':
      return 'Fix deployed, monitoring for stability';
    case 'resolved':
      return 'All services operating normally';
    default:
      return 'Status update';
  }
}

/**
 * Build complete research status response
 */
export function buildResearchStatusResponse(
  providers: ProviderStatus[],
  uptimeStats: { thirtyDayUptime: number; incidentsThisMonth: number }
): ResearchStatusResponse {
  const pipelineStages = calculatePipelineStages(providers);
  const affectedStages = pipelineStages
    .filter(s => s.status !== 'operational')
    .map(s => s.name);

  const engineStatus = calculateResearchEngineStatus(providers);

  return {
    researchEngine: {
      status: engineStatus,
      message: getResearchEngineMessage(engineStatus, affectedStages),
      affectedStages,
    },
    authentication: calculateAuthStatus(providers),
    pipeline: {
      stages: pipelineStages,
    },
    incidents: sanitizeIncidents(providers),
    lastUpdated: new Date().toISOString(),
    uptimeStats,
  };
}
