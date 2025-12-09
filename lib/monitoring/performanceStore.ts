/**
 * Performance Store
 * In-memory store for collecting and analyzing performance metrics
 * Used for the admin performance dashboard
 */

export interface PerformanceEntry {
  timestamp: number;
  page: string;
  metric: string;
  value: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p99: number;
}

interface PageMetrics {
  pageLoad: PerformanceStats | null;
  fcp: PerformanceStats | null;
  lcp: PerformanceStats | null;
  cls: PerformanceStats | null;
}

const MAX_ENTRIES = 1000;
const SESSION_KEY = 'performance_metrics';

class PerformanceStore {
  private entries: PerformanceEntry[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load from session storage on init
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
          this.entries = JSON.parse(stored);
        }
      } catch {
        // Ignore errors
      }
    }
  }

  addEntry(entry: Omit<PerformanceEntry, 'timestamp'>) {
    const fullEntry: PerformanceEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    this.entries.push(fullEntry);

    // Keep only recent entries
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }

    // Persist to session storage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.entries));
      } catch {
        // Ignore quota errors
      }
    }

    // Notify listeners
    this.listeners.forEach(fn => fn());
  }

  getEntries(filter?: { page?: string; metric?: string; since?: number }): PerformanceEntry[] {
    let result = [...this.entries];

    if (filter?.page) {
      result = result.filter(e => e.page === filter.page);
    }

    if (filter?.metric) {
      result = result.filter(e => e.metric === filter.metric);
    }

    if (filter?.since) {
      result = result.filter(e => e.timestamp >= filter.since);
    }

    return result;
  }

  getStats(entries: PerformanceEntry[]): PerformanceStats | null {
    if (entries.length === 0) return null;

    const values = entries.map(e => e.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: Math.round(sum / values.length),
      p50: values[Math.floor(values.length * 0.5)],
      p90: values[Math.floor(values.length * 0.9)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  getPageMetrics(page: string, since?: number): PageMetrics {
    const filter = { page, since };

    return {
      pageLoad: this.getStats(this.getEntries({ ...filter, metric: 'page_load' })),
      fcp: this.getStats(this.getEntries({ ...filter, metric: 'first_contentful_paint' })),
      lcp: this.getStats(this.getEntries({ ...filter, metric: 'largest_contentful_paint' })),
      cls: this.getStats(this.getEntries({ ...filter, metric: 'cumulative_layout_shift' })),
    };
  }

  getApiMetrics(since?: number): Map<string, PerformanceStats | null> {
    const apiEntries = this.getEntries({ metric: 'api_response', since });
    const byEndpoint = new Map<string, PerformanceEntry[]>();

    apiEntries.forEach(entry => {
      const endpoint = (entry.metadata?.endpoint as string) || 'unknown';
      const existing = byEndpoint.get(endpoint) || [];
      existing.push(entry);
      byEndpoint.set(endpoint, existing);
    });

    const result = new Map<string, PerformanceStats | null>();
    byEndpoint.forEach((entries, endpoint) => {
      result.set(endpoint, this.getStats(entries));
    });

    return result;
  }

  getAllPages(): string[] {
    const pages = new Set(this.entries.map(e => e.page));
    return Array.from(pages).sort();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear() {
    this.entries = [];
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
    this.listeners.forEach(fn => fn());
  }
}

// Singleton instance
export const performanceStore = new PerformanceStore();

// Enhanced tracking function that also stores locally
export function trackAndStoreMetric(
  metric: string,
  value: number,
  page: string,
  metadata?: Record<string, unknown>
) {
  performanceStore.addEntry({ metric, value, page, metadata });
}
