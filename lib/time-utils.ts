/**
 * Time utilities for consistent GMT timestamp formatting
 */

/**
 * Formats a date string to GMT format: "31 Oct 2024 14:30 GMT"
 */
export function formatGMT(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'GMT',
    hourCycle: 'h23'
  }) + ' GMT';
}

/**
 * Formats a date string to short GMT format: "31 Oct 14:30 GMT"
 */
export function formatShortGMT(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'GMT',
    hourCycle: 'h23'
  }) + ' GMT';
}

/**
 * Gets time since a date in human-readable format
 */
export function getTimeSinceGMT(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Gets duration between two dates in human-readable format
 */
export function getDurationGMT(startString: string, endString: string): string {
  const startTime = new Date(startString).getTime();
  const endTime = new Date(endString).getTime();
  const diffMs = endTime - startTime;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

/**
 * Detects if an incident has been acknowledged based on status updates
 */
export interface IncidentLifecycle {
  identified: string; // created_at
  acknowledged?: string; // First status update that's not "investigating"
  resolved?: string; // resolved_at or status change to "resolved"
}

export function getIncidentLifecycle(incident: any): IncidentLifecycle {
  const lifecycle: IncidentLifecycle = {
    identified: incident.created_at,
  };

  // Check if there are incident updates
  if (incident.incident_updates && incident.incident_updates.length > 0) {
    // Find first "identified" or "monitoring" status - that's acknowledgment
    const acknowledged = incident.incident_updates.find((update: any) =>
      update.status === 'identified' ||
      update.status === 'monitoring' ||
      update.status === 'update' ||
      (update.body && (
        update.body.toLowerCase().includes('identified') ||
        update.body.toLowerCase().includes('acknowledged') ||
        update.body.toLowerCase().includes('aware') ||
        update.body.toLowerCase().includes('investigating')
      ))
    );

    if (acknowledged && acknowledged.created_at !== incident.created_at) {
      lifecycle.acknowledged = acknowledged.created_at;
    }
  }

  // Check resolution
  if (incident.resolved_at) {
    lifecycle.resolved = incident.resolved_at;
  } else if (incident.status === 'resolved' || incident.status === 'postmortem') {
    // Use updated_at as proxy for resolution if no resolved_at
    lifecycle.resolved = incident.updated_at || incident.created_at;
  }

  return lifecycle;
}

/**
 * Gets the current state of an incident
 */
export function getIncidentState(incident: any): 'identified' | 'acknowledged' | 'resolved' {
  if (incident.status === 'resolved' || incident.status === 'postmortem' || incident.resolved_at) {
    return 'resolved';
  }

  const lifecycle = getIncidentLifecycle(incident);
  if (lifecycle.acknowledged) {
    return 'acknowledged';
  }

  return 'identified';
}
