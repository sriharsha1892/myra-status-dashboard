import { NextResponse } from 'next/server';
import { StatusCache } from '@/lib/status-cache';
import { sanitizeIncidentName } from '@/lib/model-filter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cache = StatusCache.getInstance();
    const providers = await cache.getStatuses();

    // Get recent incidents from all providers
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentIncidents = providers
      .flatMap((p: any) =>
        (p.incidents || [])
          .filter((i: any) => new Date(i.created_at).getTime() > sevenDaysAgo)
          .map((i: any) => ({
            ...i,
            provider: p.provider,
          }))
      )
      .sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 20); // Last 20 incidents

    // Build RSS feed
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const rssItems = recentIncidents.map((incident: any) => {
      const createdDate = new Date(incident.created_at);
      const sanitizedName = sanitizeIncidentName(incident.name);
      const title = `${incident.provider.displayName}: ${sanitizedName}`;
      const description = incident.incident_updates?.[0]?.body || 'No details available';
      const status = incident.status === 'resolved' ? 'Resolved' : 'Ongoing';

      return `
    <item>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(`${status}: ${description}`)}</description>
      <link>${baseUrl}/status</link>
      <guid isPermaLink="false">incident-${incident.id}</guid>
      <pubDate>${createdDate.toUTCString()}</pubDate>
      <category>${incident.impact || 'unknown'}</category>
    </item>`;
    }).join('');

    // Determine overall status from providers
    const hasIssues = providers.some(p => p.status !== 'operational');
    const overallStatus = hasIssues ? 'Some services experiencing issues' : 'All systems operational';
    const lastUpdated = new Date().toISOString();

    const statusItem = `
    <item>
      <title>myRA AI Status: ${overallStatus}</title>
      <description>${escapeXml(`Current status: ${overallStatus}. Last updated: ${new Date(lastUpdated).toUTCString()}`)}</description>
      <link>${baseUrl}/status</link>
      <guid isPermaLink="false">status-${Date.now()}</guid>
      <pubDate>${new Date(lastUpdated).toUTCString()}</pubDate>
    </item>`;

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>myRA AI Status</title>
    <description>Real-time status updates for myRA AI services</description>
    <link>${baseUrl}/status</link>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>5</ttl>
    ${statusItem}
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rssFeed, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
