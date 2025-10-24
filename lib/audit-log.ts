/**
 * Audit Log System
 * Tracks all admin panel status changes for compliance and debugging
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'status_update';
  organization: 'prodgain' | 'mordor';
  status: string;
  message: string;
  updatedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory storage (in production, this would be a database)
let auditLogs: AuditLogEntry[] = [];

/**
 * Add a new audit log entry
 */
export function logAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const logEntry: AuditLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  auditLogs.unshift(logEntry); // Add to beginning for reverse chronological order

  // Keep only last 1000 entries (prevents memory issues)
  if (auditLogs.length > 1000) {
    auditLogs = auditLogs.slice(0, 1000);
  }

  return logEntry;
}

/**
 * Get audit logs with optional filtering
 */
export function getAuditLogs(options?: {
  limit?: number;
  organization?: 'prodgain' | 'mordor';
  since?: string; // ISO timestamp
}): AuditLogEntry[] {
  let filtered = [...auditLogs];

  // Filter by organization
  if (options?.organization) {
    filtered = filtered.filter(log => log.organization === options.organization);
  }

  // Filter by date
  if (options?.since) {
    const sinceDate = new Date(options.since);
    filtered = filtered.filter(log => new Date(log.timestamp) >= sinceDate);
  }

  // Apply limit
  const limit = options?.limit || 50;
  return filtered.slice(0, limit);
}

/**
 * Get audit log statistics
 */
export function getAuditStats(): {
  totalEntries: number;
  recentUpdates: number;
  byOrganization: Record<string, number>;
} {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = auditLogs.filter(log => log.timestamp >= last24h);

  const byOrganization = auditLogs.reduce((acc, log) => {
    acc[log.organization] = (acc[log.organization] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalEntries: auditLogs.length,
    recentUpdates: recentLogs.length,
    byOrganization,
  };
}

/**
 * Clear old audit logs (admin utility)
 */
export function clearOldLogs(olderThan: string): number {
  const cutoffDate = new Date(olderThan);
  const before = auditLogs.length;
  auditLogs = auditLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
  return before - auditLogs.length;
}

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Export logs for backup/analysis
 */
export function exportAuditLogs(): AuditLogEntry[] {
  return [...auditLogs];
}
