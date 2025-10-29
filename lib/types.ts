export type ServiceStatus = 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance' | 'unknown';

export interface Provider {
  id: string;
  name: string;
  displayName: string; // Admin-facing name (real provider)
  userFacingName: string; // User-facing name (abstracted)
  enables: string; // What user features this service enables
  statusPageUrl: string;
  apiEndpoint: string;
  icon?: string;
  color: string;
  priority?: 'primary' | 'secondary'; // Primary = core dependencies, Secondary = fallback options
  dependsOn?: string[]; // IDs of other providers this service depends on
  impacts?: string; // What happens when this service is down
  regions?: string[]; // AWS regions being monitored
  services?: string[]; // Specific AWS services being used
  models?: string[]; // AI models available from this provider (admin only)
  role?: 'primary' | 'fallback'; // Role in the AI service stack
}

export interface Component {
  id: string;
  name: string;
  status: ServiceStatus;
  description?: string;
  category?: 'api' | 'model' | 'service' | 'infrastructure';
}

export interface Incident {
  id: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  shortlink?: string;
  incident_updates: Array<{
    body: string;
    status: string;
    created_at: string;
  }>;
}

export interface ProviderStatus {
  provider: Provider;
  status: ServiceStatus;
  indicator: string;
  lastUpdated: string;
  components: Component[];
  incidents: Incident[];
  scheduledMaintenances?: any[];
}

export interface StatusResponse {
  providers: ProviderStatus[];
  lastUpdated: string;
  overallStatus: ServiceStatus;
}
