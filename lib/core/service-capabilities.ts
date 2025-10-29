/**
 * Service Capability Definitions
 *
 * This file defines the service capabilities we monitor WITHOUT exposing vendor names.
 * Services are categorized by what they do, not who provides them.
 */

export type ServiceCapability =
  | 'text-generation'
  | 'reasoning'
  | 'vision'
  | 'web-search'
  | 'embeddings'
  | 'function-calling'
  | 'code-execution'
  | 'multimodal';

export type ServiceCategory =
  | 'llm'           // Large Language Models
  | 'search'        // Web search and research
  | 'infrastructure' // Cloud infrastructure
  | 'embedding';    // Vector embeddings

export type ServicePriority = 'primary' | 'secondary' | 'optional';

export interface ServiceDefinition {
  /** Internal service ID (obfuscated) */
  serviceId: string;

  /** User-facing display name (capability-based) */
  displayName: string;

  /** Brief description of what this service does */
  description: string;

  /** Category this service belongs to */
  category: ServiceCategory;

  /** Capabilities this service provides */
  capabilities: ServiceCapability[];

  /** Priority level for this service */
  priority: ServicePriority;

  /** UI color for status indicators */
  color: string;

  /** Specific components/APIs we monitor for this service */
  components: ServiceComponent[];
}

export interface ServiceComponent {
  /** Component ID (obfuscated) */
  componentId: string;

  /** User-facing component name */
  displayName: string;

  /** What this specific component does */
  description: string;

  /** Whether this component is critical to the service */
  critical: boolean;
}

/**
 * Service Mapping
 *
 * This mapping defines ALL the services we currently monitor.
 * Each service is defined by its capabilities, NOT its vendor.
 */
export const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    serviceId: 'llm-advanced-reasoning',
    displayName: 'Advanced Reasoning AI',
    description: 'High-capability AI model for complex reasoning, coding, and analysis',
    category: 'llm',
    capabilities: ['text-generation', 'reasoning', 'function-calling', 'multimodal'],
    priority: 'primary',
    color: '#10b981',
    components: [
      {
        componentId: 'llm-adv-api',
        displayName: 'Core API',
        description: 'Primary API endpoint for advanced reasoning',
        critical: true,
      },
      {
        componentId: 'llm-adv-streaming',
        displayName: 'Streaming API',
        description: 'Real-time streaming responses',
        critical: false,
      },
    ],
  },
  {
    serviceId: 'llm-general-purpose',
    displayName: 'General Purpose AI',
    description: 'Fast, versatile AI model for general text generation and conversation',
    category: 'llm',
    capabilities: ['text-generation', 'function-calling', 'vision'],
    priority: 'primary',
    color: '#3b82f6',
    components: [
      {
        componentId: 'llm-gen-api',
        displayName: 'Core API',
        description: 'Primary API endpoint for text generation',
        critical: true,
      },
      {
        componentId: 'llm-gen-chat',
        displayName: 'Chat API',
        description: 'Interactive chat interface',
        critical: true,
      },
    ],
  },
  {
    serviceId: 'web-research-service',
    displayName: 'Web Research & Search',
    description: 'AI-powered web search and content discovery',
    category: 'search',
    capabilities: ['web-search'],
    priority: 'primary',
    color: '#f59e0b',
    components: [
      {
        componentId: 'web-search-api',
        displayName: 'Search API',
        description: 'Neural search and content retrieval',
        critical: true,
      },
    ],
  },
  {
    serviceId: 'cloud-infrastructure',
    displayName: 'Cloud Infrastructure',
    description: 'Backend compute and model hosting infrastructure',
    category: 'infrastructure',
    capabilities: ['code-execution'],
    priority: 'secondary',
    color: '#8b5cf6',
    components: [
      {
        componentId: 'cloud-compute',
        displayName: 'Compute Instances',
        description: 'Virtual machine instances for model serving',
        critical: true,
      },
      {
        componentId: 'cloud-api-gateway',
        displayName: 'API Gateway',
        description: 'API request routing and load balancing',
        critical: true,
      },
    ],
  },
  {
    serviceId: 'llm-multimodal',
    displayName: 'Multimodal AI',
    description: 'AI model with vision, text, and reasoning capabilities',
    category: 'llm',
    capabilities: ['text-generation', 'vision', 'reasoning', 'multimodal'],
    priority: 'primary',
    color: '#ec4899',
    components: [
      {
        componentId: 'llm-multi-api',
        displayName: 'Core API',
        description: 'Unified multimodal API',
        critical: true,
      },
      {
        componentId: 'llm-multi-vision',
        displayName: 'Vision Processing',
        description: 'Image analysis and understanding',
        critical: false,
      },
    ],
  },
];

/**
 * Get service by ID
 */
export function getServiceById(serviceId: string): ServiceDefinition | undefined {
  return SERVICE_CATALOG.find(s => s.serviceId === serviceId);
}

/**
 * Get services by category
 */
export function getServicesByCategory(category: ServiceCategory): ServiceDefinition[] {
  return SERVICE_CATALOG.filter(s => s.category === category);
}

/**
 * Get services by capability
 */
export function getServicesByCapability(capability: ServiceCapability): ServiceDefinition[] {
  return SERVICE_CATALOG.filter(s => s.capabilities.includes(capability));
}

/**
 * Get primary services only
 */
export function getPrimaryServices(): ServiceDefinition[] {
  return SERVICE_CATALOG.filter(s => s.priority === 'primary');
}
