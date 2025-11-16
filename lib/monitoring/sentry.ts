/**
 * Sentry Configuration
 * Add SENTRY_DSN to .env.local to enable error tracking
 */

import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Release tracking
      release: process.env.VERCEL_GIT_COMMIT_SHA,

      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive headers/params
        if (event.request) {
          delete event.request.headers?.['authorization'];
          delete event.request.headers?.['cookie'];
        }
        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
    });
  }
}

// Helper to capture exceptions with context
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('[Sentry not configured]', error, context);
  }
}

// Helper to track performance
export function trackPerformance(name: string, duration: number, metadata?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: name,
      data: {
        duration,
        ...metadata,
      },
      level: 'info',
    });
  }
}
