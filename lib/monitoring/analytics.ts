/**
 * Analytics Tracking Utilities
 * Track user behavior and feature usage
 */

import { track } from '@vercel/analytics';

export interface EventMetadata {
  [key: string]: string | number | boolean;
}

// Track key user actions
export const trackEvent = {
  // Trial Management
  trialCreated: (orgId: string, method: 'manual' | 'import') => {
    track('trial_created', { org_id: orgId, method });
  },

  trialUpdated: (orgId: string, field: string) => {
    track('trial_updated', { org_id: orgId, field });
  },

  // Timeline Events
  timelineEventAdded: (orgId: string, eventType: string, method: 'manual' | 'bulk_import') => {
    track('timeline_event_added', { org_id: orgId, event_type: eventType, method });
  },

  timelineBulkImport: (orgId: string, eventCount: number, success: boolean) => {
    track('timeline_bulk_import', { org_id: orgId, event_count: eventCount, success });
  },

  // Activity Parsing
  activityParsed: (confidence: number, activityType: string) => {
    track('activity_parsed', { confidence, activity_type: activityType });
  },

  pasteExtractUsed: (orgId: string, itemsExtracted: number) => {
    track('paste_extract_used', { org_id: orgId, items_extracted: itemsExtracted });
  },

  // User Management
  userImported: (orgId: string, userCount: number, method: 'ai' | 'manual') => {
    track('user_imported', { org_id: orgId, user_count: userCount, method });
  },

  // Feature Requests & Pain Points
  featureRequestAdded: (orgId: string, source: string) => {
    track('feature_request_added', { org_id: orgId, source });
  },

  painPointAdded: (orgId: string, severity: string) => {
    track('pain_point_added', { org_id: orgId, severity });
  },

  // Navigation
  pageViewed: (pageName: string, orgId?: string) => {
    track('page_viewed', { page: pageName, org_id: orgId || 'n/a' });
  },

  // Errors
  errorEncountered: (errorType: string, context: string) => {
    track('error_encountered', { error_type: errorType, context });
  },
};

// Track performance metrics
export function trackPerformanceMetric(
  metricName: string,
  duration: number,
  metadata?: EventMetadata
) {
  track(`perf_${metricName}`, {
    duration_ms: duration,
    ...metadata,
  });
}
