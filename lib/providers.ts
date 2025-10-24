import { Provider } from './types';

export const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI', // Internal use only - never exposed to client
    displayName: 'Research Orchestration',
    statusPageUrl: 'https://status.openai.com',
    apiEndpoint: 'https://status.openai.com/api/v2/summary.json',
    color: '#10a37f',
    priority: 'primary',
  },
  {
    id: 'anthropic',
    name: 'Anthropic', // Internal use only
    displayName: 'Research Quality Service',
    statusPageUrl: 'https://status.anthropic.com',
    apiEndpoint: 'https://status.anthropic.com/api/v2/summary.json',
    color: '#d4a574',
    priority: 'primary',
  },
  {
    id: 'exa',
    name: 'Exa', // Internal use only
    displayName: 'Web Research Service',
    statusPageUrl: 'https://status.exa.ai',
    apiEndpoint: 'https://status.exa.ai/api/v2/summary.json',
    color: '#3b82f6',
    priority: 'primary',
  },
  {
    id: 'aws',
    name: 'AWS', // Internal use only
    displayName: 'Platform Infrastructure',
    statusPageUrl: 'https://health.aws.amazon.com/health/status',
    apiEndpoint: 'https://status.aws.amazon.com/data.json',
    color: '#ff9900',
    priority: 'primary',
  },
  {
    id: 'google',
    name: 'Google', // Internal use only
    displayName: 'Distributed Research Processing',
    statusPageUrl: 'https://status.cloud.google.com',
    apiEndpoint: 'https://status.cloud.google.com/incidents.json',
    color: '#4285f4',
    priority: 'secondary',
  },
  {
    id: 'brave',
    name: 'Brave', // Internal use only
    displayName: 'Supplemental Web Research',
    statusPageUrl: 'https://status.brave.app',
    apiEndpoint: 'https://status.brave.app', // BetterStack - HTML parsing
    color: '#fb542b',
    priority: 'secondary',
  },
];
