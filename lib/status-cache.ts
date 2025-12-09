import { ProviderStatus, ServiceStatus } from './types';
import { PROVIDERS } from './providers';
import { StatusFetcher } from './status-fetcher';
import { NotificationService } from './notifications';
import { sendStatusPush } from './push/sendPush';

interface HistoricalStatusCheck {
  timestamp: string;
  status: ServiceStatus;
}

export class StatusCache {
  private static instance: StatusCache;
  private cache: ProviderStatus[] = [];
  private lastUpdate: Date = new Date(0);
  private readonly CACHE_TTL = 60000; // 1 minute
  private updateInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(data: ProviderStatus[]) => void> = new Set();
  private history: Map<string, HistoricalStatusCheck[]> = new Map(); // providerId -> checks (last 24h)
  private previousOverallStatus: ServiceStatus | null = null; // Track status changes for push notifications

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): StatusCache {
    if (!StatusCache.instance) {
      StatusCache.instance = new StatusCache();
    }
    return StatusCache.instance;
  }

  public async getStatuses(): Promise<ProviderStatus[]> {
    const now = new Date();
    const age = now.getTime() - this.lastUpdate.getTime();

    // Non-blocking: never wait for initial fetch on cold start
    if (this.cache.length === 0) {
      // Cold start: trigger background refresh, return optimistic defaults immediately
      this.refresh().catch(err => console.error('Background refresh failed:', err));
      return this.getOptimisticDefaults();
    } else if (age > this.CACHE_TTL) {
      // Cache is stale - trigger background refresh but return stale data immediately
      this.refresh().catch(err => console.error('Background refresh failed:', err));
    }

    return this.cache;
  }

  // Return placeholder data for instant page load on cold start
  private getOptimisticDefaults(): ProviderStatus[] {
    return PROVIDERS.map(provider => ({
      provider,
      status: 'unknown' as ServiceStatus,
      indicator: 'checking',
      lastUpdated: new Date().toISOString(),
      components: [],
      incidents: [],
    }));
  }

  public async refresh(): Promise<void> {
    try {
      console.log('Refreshing status cache...');
      const statuses = await StatusFetcher.fetchAllStatuses(PROVIDERS);
      this.cache = statuses;
      this.lastUpdate = new Date();

      // Store historical data for 24-hour uptime
      const now = new Date().toISOString();
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

      statuses.forEach(providerStatus => {
        const providerId = providerStatus.provider.id;

        if (!this.history.has(providerId)) {
          this.history.set(providerId, []);
        }

        const checks = this.history.get(providerId)!;

        // Add current check
        checks.push({
          timestamp: now,
          status: providerStatus.status
        });

        // Clean up old data (older than 24 hours)
        const filtered = checks.filter(check =>
          new Date(check.timestamp).getTime() > twentyFourHoursAgo
        );

        this.history.set(providerId, filtered);
      });

      // Check for status changes and send notifications
      const notificationService = NotificationService.getInstance();
      await notificationService.checkAndNotify(statuses);

      // Check for overall status change and send push notifications
      const newOverallStatus = this.calculateOverallStatus(statuses);
      if (this.previousOverallStatus !== null && this.previousOverallStatus !== newOverallStatus) {
        console.log(`Status changed: ${this.previousOverallStatus} -> ${newOverallStatus}`);

        // Get list of affected services
        const affectedServices = statuses
          .filter(p => p.status !== 'operational' && p.status !== 'unknown')
          .map(p => p.provider.displayName);

        // Send push notifications in the background
        sendStatusPush(newOverallStatus, this.previousOverallStatus, affectedServices)
          .then(result => {
            console.log(`Push notifications sent: ${result.sent} sent, ${result.failed} failed`);
          })
          .catch(err => {
            console.error('Failed to send push notifications:', err);
          });
      }
      this.previousOverallStatus = newOverallStatus;

      // Notify all listeners
      this.notifyListeners(statuses);
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  }

  public startAutoRefresh(intervalMs: number = 60000): void {
    if (this.updateInterval) {
      return; // Already running
    }

    // Initial fetch
    this.refresh();

    // Set up interval
    this.updateInterval = setInterval(() => {
      this.refresh();
    }, intervalMs);

    console.log(`Auto-refresh started with interval: ${intervalMs}ms`);
  }

  public stopAutoRefresh(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Auto-refresh stopped');
    }
  }

  public subscribe(listener: (data: ProviderStatus[]) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(data: ProviderStatus[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  public getHistory(providerId: string): HistoricalStatusCheck[] {
    return this.history.get(providerId) || [];
  }

  public getUptimePercentage(providerId: string): number {
    const provider = this.cache.find(p => p.provider.id === providerId);
    if (!provider) return 100;

    // ALWAYS check for incidents first (most accurate)
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentIncidents = (provider.incidents || []).filter(incident => {
      const incidentTime = new Date(incident.updated_at || incident.created_at).getTime();
      return incidentTime > twentyFourHoursAgo;
    });

    // Calculate uptime based on incidents if any exist
    if (recentIncidents.length > 0) {
      // Check for active incidents
      const hasActiveIncident = recentIncidents.some(i =>
        i.status !== 'resolved' && i.status !== 'postmortem'
      );

      if (hasActiveIncident) {
        return 92; // Currently experiencing issues
      }

      // Calculate based on number and severity of resolved incidents
      const criticalIncidents = recentIncidents.filter(i => i.impact === 'critical' || i.impact === 'major').length;
      const minorIncidents = recentIncidents.filter(i => i.impact === 'minor' || i.impact === 'none').length;

      // Estimate downtime impact
      // Critical/major: ~30 min avg, minor: ~10 min avg
      const estimatedDowntimeMinutes = (criticalIncidents * 30) + (minorIncidents * 10);
      const minutesIn24Hours = 24 * 60; // 1440 minutes
      const uptimePercentage = ((minutesIn24Hours - estimatedDowntimeMinutes) / minutesIn24Hours) * 100;

      return Math.max(90, Math.round(uptimePercentage * 10) / 10); // Never go below 90%
    }

    // If no incidents, use historical checks if available
    const checks = this.history.get(providerId) || [];
    if (checks.length > 0) {
      const operationalChecks = checks.filter(c => c.status === 'operational').length;
      return Math.round((operationalChecks / checks.length) * 100);
    }

    // Fallback: Check component statuses
    const components = provider.components || [];
    if (components.length > 0) {
      const operationalComponents = components.filter(c => c.status === 'operational').length;
      return Math.round((operationalComponents / components.length) * 100);
    }

    // Default to current status
    return provider.status === 'operational' ? 100 : 95;
  }

  public getOverallStatus(): ServiceStatus {
    return this.calculateOverallStatus(this.cache);
  }

  // Helper to calculate overall status from a list of provider statuses
  private calculateOverallStatus(providers: ProviderStatus[]): ServiceStatus {
    if (providers.length === 0) {
      return 'unknown';
    }

    // Filter out unknown statuses when calculating overall status
    const statuses = providers
      .map(p => p.status)
      .filter(s => s !== 'unknown');

    // If all providers are unknown, return unknown
    if (statuses.length === 0) {
      return 'unknown';
    }

    if (statuses.some(s => s === 'major_outage')) {
      return 'major_outage';
    }
    if (statuses.some(s => s === 'partial_outage')) {
      return 'partial_outage';
    }
    if (statuses.some(s => s === 'degraded_performance')) {
      return 'degraded_performance';
    }
    if (statuses.some(s => s === 'under_maintenance')) {
      return 'under_maintenance';
    }
    if (statuses.every(s => s === 'operational')) {
      return 'operational';
    }

    return 'unknown';
  }
}
