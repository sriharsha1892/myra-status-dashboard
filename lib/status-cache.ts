import { ProviderStatus, ServiceStatus } from './types';
import { PROVIDERS } from './providers';
import { StatusFetcher } from './status-fetcher';
import { NotificationService } from './notifications';

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

    if (this.cache.length === 0 || age > this.CACHE_TTL) {
      await this.refresh();
    }

    return this.cache;
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
    const checks = this.history.get(providerId) || [];
    if (checks.length === 0) return 100;

    const operationalChecks = checks.filter(c => c.status === 'operational').length;
    return Math.round((operationalChecks / checks.length) * 100);
  }

  public getOverallStatus(): ServiceStatus {
    if (this.cache.length === 0) {
      return 'unknown';
    }

    // Filter out unknown statuses when calculating overall status
    const statuses = this.cache
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
