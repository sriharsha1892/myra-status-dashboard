export type ServiceStatus = 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance' | 'unknown';

export interface Provider {
  id: string;
  name: string;
  displayName: string;
  statusPageUrl: string;
  apiEndpoint: string;
  icon?: string;
  color: string;
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
