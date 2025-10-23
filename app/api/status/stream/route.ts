import { StatusCache } from '@/lib/status-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cache = StatusCache.getInstance();

  // Start auto-refresh if not already running
  cache.startAutoRefresh(60000); // Refresh every 60 seconds

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial data
      cache.getStatuses().then(providers => {
        const data = JSON.stringify({
          providers,
          lastUpdated: new Date().toISOString(),
          overallStatus: cache.getOverallStatus(),
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });

      // Subscribe to updates
      const unsubscribe = cache.subscribe((providers) => {
        const data = JSON.stringify({
          providers,
          lastUpdated: new Date().toISOString(),
          overallStatus: cache.getOverallStatus(),
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);

      // Cleanup on close
      return () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
