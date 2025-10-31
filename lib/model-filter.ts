/**
 * Model filtering utilities to only show incidents relevant to our specific models
 */

import { Incident, Provider } from './types';

/**
 * List of models we actually use in production
 */
export const TRACKED_MODELS = {
  openai: [
    'GPT-5',
    'GPT-5 mini',
    'GPT-5-mini',
    'gpt-5',
    'gpt-5-mini',
    'gpt5',
    'gpt5-mini',
  ],
  anthropic: [
    'Claude Sonnet 4',
    'Claude Sonnet 4.5',
    'Claude Haiku 4.5',
    'Claude 4 Sonnet',
    'Claude 4.5 Sonnet',
    'claude-sonnet-4',
    'claude-sonnet-4.5',
    'claude-haiku-4.5',
    'claude-4-sonnet',
    'sonnet-4',
    'sonnet-4.5',
    'haiku-4.5',
  ],
  google: [
    'Gemini Flash',
    'Gemini Flash Light',
    'Gemini 2.0 Flash',
    'gemini-flash',
    'gemini-2.0-flash',
  ],
};

/**
 * Models to explicitly ignore (older versions)
 */
export const IGNORED_MODELS = [
  'GPT-4',
  'GPT-4o',
  'GPT-4 Turbo',
  'gpt-4',
  'gpt-4o',
  'gpt-4-turbo',
  'Claude 3',
  'Claude 3.5',
  'claude-3',
  'claude-3.5-sonnet',
  'Gemini Pro',
  'Gemini 1.5',
];

/**
 * Checks if an incident is relevant to our tracked models
 */
export function isIncidentRelevant(incident: Incident, provider: Provider): boolean {
  // For infrastructure providers (AWS), all incidents are relevant
  if (provider.id === 'aws') {
    return true;
  }

  // For search services (Exa, Brave), all incidents are relevant
  if (provider.id === 'exa' || provider.id === 'brave') {
    return true;
  }

  const incidentText = `${incident.name} ${incident.incident_updates?.map(u => u.body).join(' ')}`.toLowerCase();

  // Check if incident explicitly mentions an ignored model - if so, skip it
  const mentionsIgnoredModel = IGNORED_MODELS.some(model =>
    incidentText.includes(model.toLowerCase())
  );
  if (mentionsIgnoredModel) {
    return false;
  }

  // Get tracked models for this provider
  const trackedModels = TRACKED_MODELS[provider.id as keyof typeof TRACKED_MODELS];
  if (!trackedModels) {
    // Provider not in our tracking list - include all incidents
    return true;
  }

  // Check if incident mentions any of our tracked models
  const mentionsTrackedModel = trackedModels.some(model =>
    incidentText.includes(model.toLowerCase())
  );

  // Also check for generic API incidents that don't mention specific models
  const isGenericApiIncident =
    incidentText.includes('api') &&
    !incidentText.includes('gpt-') &&
    !incidentText.includes('claude-') &&
    !incidentText.includes('gemini-');

  return mentionsTrackedModel || isGenericApiIncident;
}

/**
 * Filters incidents to only show relevant ones
 */
export function filterRelevantIncidents(
  incidents: Incident[],
  provider: Provider
): Incident[] {
  return incidents.filter(incident => isIncidentRelevant(incident, provider));
}

/**
 * Sanitizes incident names to remove provider-specific references
 */
export function sanitizeIncidentName(name: string): string {
  return name
    .replace(/\b(AWS|Amazon Web Services|OpenAI|Anthropic|Google|Gemini|Exa|Brave)\b/gi, 'Service')
    .replace(/\b(GPT-5|GPT-5 mini|Claude Sonnet 4\.5|Claude Haiku 4\.5|Gemini Flash)\b/gi, 'Model')
    .replace(/\b(API Gateway|Lambda|S3|EC2)\b/gi, 'Component')
    .replace(/Service Service/gi, 'Service')
    .replace(/Model Model/gi, 'Model')
    .trim();
}
