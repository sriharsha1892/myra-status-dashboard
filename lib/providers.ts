import { Provider } from './types';

export const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    statusPageUrl: 'https://status.openai.com',
    apiEndpoint: 'https://status.openai.com/api/v2/summary.json',
    color: '#10a37f',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    displayName: 'Anthropic',
    statusPageUrl: 'https://status.anthropic.com',
    apiEndpoint: 'https://status.anthropic.com/api/v2/summary.json',
    color: '#d4a574',
  },
  {
    id: 'exa',
    name: 'Exa',
    displayName: 'Exa',
    statusPageUrl: 'https://status.exa.ai',
    apiEndpoint: 'https://status.exa.ai/api/v2/summary.json',
    color: '#3b82f6',
  },
  {
    id: 'google',
    name: 'Google',
    displayName: 'Google Gemini',
    statusPageUrl: 'https://status.cloud.google.com',
    apiEndpoint: 'https://status.cloud.google.com/incidents.json',
    color: '#4285f4',
  },
  {
    id: 'brave',
    name: 'Brave',
    displayName: 'Brave Search',
    statusPageUrl: 'https://status.brave.app',
    apiEndpoint: 'https://status.brave.app', // BetterStack - HTML parsing
    color: '#fb542b',
  },
  {
    id: 'aws',
    name: 'AWS',
    displayName: 'Amazon Web Services',
    statusPageUrl: 'https://health.aws.amazon.com/health/status',
    apiEndpoint: 'https://status.aws.amazon.com/data.json',
    color: '#ff9900',
  },
];
