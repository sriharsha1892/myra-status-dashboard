/**
 * Page Performance Monitoring Hook
 * Automatically tracks page load times and Core Web Vitals
 * Sends metrics to Vercel Analytics for production monitoring
 */

import { useEffect, useRef } from 'react';
import { trackPerformanceMetric } from '@/lib/monitoring/analytics';
import { trackAndStoreMetric } from '@/lib/monitoring/performanceStore';

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

export function usePagePerformance(pageName: string) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (hasTracked.current) return;

    // Only track in production or when explicitly enabled
    const shouldTrack = process.env.NODE_ENV === 'production' ||
                       process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_TRACKING === 'true';

    if (!shouldTrack) return;

    const trackMetrics = () => {
      try {
        // Check if Performance API is available
        if (typeof window === 'undefined' || !('performance' in window)) {
          console.warn('[Performance] Performance API not available');
          return;
        }

        const perfData = window.performance;
        const navigation = perfData.timing;

        // Calculate page load metrics
        const pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;

        // Get Paint Timing metrics
        const paintEntries = perfData.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');

        const metrics: PerformanceMetrics = {
          pageLoadTime,
          domContentLoaded,
          firstPaint: firstPaint?.startTime,
          firstContentfulPaint: firstContentfulPaint?.startTime,
        };

        // Track page load time
        if (pageLoadTime > 0) {
          trackPerformanceMetric('page_load', pageLoadTime, {
            page: pageName,
            dom_content_loaded: domContentLoaded,
          });

          // Also store locally for dashboard
          trackAndStoreMetric('page_load', pageLoadTime, pageName, {
            dom_content_loaded: domContentLoaded,
          });

          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Performance] ${pageName}:`, {
              pageLoad: `${pageLoadTime}ms`,
              domContentLoaded: `${domContentLoaded}ms`,
              firstPaint: firstPaint ? `${firstPaint.startTime.toFixed(0)}ms` : 'n/a',
              firstContentfulPaint: firstContentfulPaint ? `${firstContentfulPaint.startTime.toFixed(0)}ms` : 'n/a',
            });
          }
        }

        // Track First Contentful Paint (Core Web Vital)
        if (firstContentfulPaint) {
          trackPerformanceMetric('first_contentful_paint', firstContentfulPaint.startTime, {
            page: pageName,
          });
          trackAndStoreMetric('first_contentful_paint', firstContentfulPaint.startTime, pageName);
        }

        // Track Largest Contentful Paint (Core Web Vital) using PerformanceObserver
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              const lastEntry = entries[entries.length - 1];

              if (lastEntry && 'renderTime' in lastEntry) {
                const lcp = (lastEntry as any).renderTime || (lastEntry as any).loadTime;
                trackPerformanceMetric('largest_contentful_paint', lcp, {
                  page: pageName,
                });
                trackAndStoreMetric('largest_contentful_paint', lcp, pageName);

                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Performance] ${pageName} LCP:`, `${lcp.toFixed(0)}ms`);
                }
              }
            });

            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

            // Clean up after 10 seconds
            setTimeout(() => lcpObserver.disconnect(), 10000);
          } catch (error) {
            console.warn('[Performance] LCP observer error:', error);
          }
        }

        // Track Cumulative Layout Shift (Core Web Vital)
        if ('PerformanceObserver' in window) {
          try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
              for (const entry of entryList.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                  clsValue += (entry as any).value;
                }
              }
            });

            clsObserver.observe({ type: 'layout-shift', buffered: true });

            // Report CLS after 5 seconds
            setTimeout(() => {
              if (clsValue > 0) {
                trackPerformanceMetric('cumulative_layout_shift', clsValue * 1000, {
                  page: pageName,
                  cls_score: clsValue,
                });
                trackAndStoreMetric('cumulative_layout_shift', clsValue * 1000, pageName, {
                  cls_score: clsValue,
                });

                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Performance] ${pageName} CLS:`, clsValue.toFixed(3));
                }
              }
              clsObserver.disconnect();
            }, 5000);
          } catch (error) {
            console.warn('[Performance] CLS observer error:', error);
          }
        }

        hasTracked.current = true;
      } catch (error) {
        console.error('[Performance] Error tracking metrics:', error);
      }
    };

    // Wait for page load to complete
    if (document.readyState === 'complete') {
      // Page already loaded
      setTimeout(trackMetrics, 100);
    } else {
      // Wait for load event
      window.addEventListener('load', () => {
        setTimeout(trackMetrics, 100);
      });
    }

    // Cleanup (though hasTracked ref prevents re-execution)
    return () => {
      hasTracked.current = false;
    };
  }, [pageName]);
}

/**
 * Track API response time
 */
export function trackApiPerformance(endpoint: string, startTime: number) {
  const duration = Date.now() - startTime;

  const shouldTrack = process.env.NODE_ENV === 'production' ||
                     process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_TRACKING === 'true';

  if (shouldTrack) {
    trackPerformanceMetric('api_response', duration, {
      endpoint,
    });
  }

  // Always store locally for dashboard
  trackAndStoreMetric('api_response', duration, 'api', { endpoint });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] API ${endpoint}:`, `${duration}ms`);
  }

  return duration;
}
