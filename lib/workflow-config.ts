import { ProviderStatus } from './types';

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  primaryServices: string[]; // Provider IDs
  fallbackServices?: string[]; // Provider IDs
  requiredModels?: string[]; // Specific models needed
  order: number;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'orchestrator',
    name: 'Research Orchestrator',
    description: 'Processes requests, creates research briefs, and coordinates workflow',
    primaryServices: ['anthropic'],
    requiredModels: ['Claude Sonnet 4.5', 'Claude 4.5 Sonnet'],
    fallbackServices: [],
    order: 1,
  },
  {
    id: 'architect',
    name: 'Research Architect',
    description: 'Designs methodology and develops research themes',
    primaryServices: ['openai'],
    requiredModels: ['GPT-5'],
    fallbackServices: ['google'],
    order: 2,
  },
  {
    id: 'scouts',
    name: 'Web Scouts',
    description: 'Parallel data collection from web sources',
    primaryServices: ['openai', 'exa'],
    requiredModels: ['GPT-5 mini', 'GPT-5-mini'],
    fallbackServices: ['brave', 'google'],
    order: 3,
  },
  {
    id: 'validator',
    name: 'Data Validator',
    description: 'Validates research accuracy and identifies gaps',
    primaryServices: ['openai'],
    requiredModels: ['GPT-5 mini', 'GPT-5-mini'],
    fallbackServices: ['google'],
    order: 4,
  },
  {
    id: 'presenter',
    name: 'Output Generator',
    description: 'Formats and generates final presentations',
    primaryServices: ['anthropic'],
    requiredModels: ['Claude Haiku 4.5'],
    fallbackServices: [],
    order: 5,
  },
];

/**
 * Determines the status of a workflow stage based on provider statuses
 */
export function getStageStatus(
  stage: WorkflowStage,
  providers: ProviderStatus[]
): 'operational' | 'degraded' | 'outage' {
  // Check if primary services are operational
  const primaryStatuses = stage.primaryServices.map(serviceId => {
    const provider = providers.find(p => p.provider.id === serviceId);
    return provider?.status || 'unknown';
  });

  // If any primary service has major outage, stage is down
  if (primaryStatuses.some(s => s === 'major_outage')) {
    return 'outage';
  }

  // If any primary service is degraded/partial, stage is degraded
  if (primaryStatuses.some(s => s === 'degraded_performance' || s === 'partial_outage')) {
    return 'degraded';
  }

  // All primary services operational
  return 'operational';
}

/**
 * Gets affected stages when a provider has issues
 */
export function getAffectedStages(providerId: string): WorkflowStage[] {
  return WORKFLOW_STAGES.filter(
    stage =>
      stage.primaryServices.includes(providerId) ||
      stage.fallbackServices?.includes(providerId)
  );
}

/**
 * Checks if specific models are affected by an incident
 */
export function isModelRelevant(incidentName: string, requiredModels?: string[]): boolean {
  if (!requiredModels || requiredModels.length === 0) return true;

  const lowerIncident = incidentName.toLowerCase();

  // Check if incident mentions any of our required models
  return requiredModels.some(model => {
    const lowerModel = model.toLowerCase();
    return lowerIncident.includes(lowerModel);
  });
}
