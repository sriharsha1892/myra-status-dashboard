import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'alert';
  title: string;
  description: string;
  metric?: string;
  change?: string;
  action?: {
    label: string;
    type: 'view' | 'send_reminder' | 'follow_up';
    data?: Record<string, unknown>;
  };
  priority: number; // Higher = more important
}

export async function GET() {
  try {
    const insights: Insight[] = [];
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Fetch quotes for analysis
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, company_name, contact_email, total_value, created_at, valid_until, prepared_by, status, download_count')
      .order('created_at', { ascending: false });

    // Fetch organizations for pipeline analysis
    const { data: organizations } = await supabase
      .from('trial_organizations')
      .select('id, org_name, status, sales_poc, updated_at, deal_value')
      .order('updated_at', { ascending: false });

    // Fetch MSAs
    const { data: msas } = await supabase
      .from('msas')
      .select('id, company_name, total_value, created_at, prepared_by, status')
      .order('created_at', { ascending: false });

    const typedQuotes = quotes || [];
    const typedOrgs = organizations || [];
    const typedMsas = msas || [];

    // ===== INSIGHT 1: Conversion Rate Week-over-Week =====
    const thisWeekDeals = typedOrgs.filter(
      (o) => o.status === 'onboarded' && new Date(o.updated_at) >= weekAgo
    );
    const lastWeekDeals = typedOrgs.filter(
      (o) =>
        o.status === 'onboarded' &&
        new Date(o.updated_at) >= twoWeeksAgo &&
        new Date(o.updated_at) < weekAgo
    );

    const thisWeekCount = thisWeekDeals.length;
    const lastWeekCount = lastWeekDeals.length;

    if (lastWeekCount > 0 && thisWeekCount !== lastWeekCount) {
      const changePercent = Math.round(
        ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
      );
      const isPositive = changePercent > 0;

      insights.push({
        id: 'conversion-rate-wow',
        type: isPositive ? 'success' : 'warning',
        title: isPositive
          ? `Conversion rate up ${Math.abs(changePercent)}%`
          : `Conversion rate dropped ${Math.abs(changePercent)}%`,
        description: `${thisWeekCount} deals closed this week vs ${lastWeekCount} last week`,
        metric: `${thisWeekCount} deals`,
        change: `${isPositive ? '+' : ''}${changePercent}%`,
        priority: isPositive ? 70 : 90,
      });
    }

    // ===== INSIGHT 2: Stalled Deals (No Activity > 7 Days) =====
    const stalledOrgs = typedOrgs.filter((o) => {
      const isActiveStatus = ['demo', 'trial', 'proposal'].includes(o.status);
      const lastUpdate = new Date(o.updated_at);
      const daysSinceUpdate = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return isActiveStatus && daysSinceUpdate > 7;
    });

    if (stalledOrgs.length > 0) {
      const stalledValue = stalledOrgs.reduce(
        (sum, o) => sum + (o.deal_value || 0),
        0
      );
      const topStalled = stalledOrgs.slice(0, 3);

      insights.push({
        id: 'stalled-deals',
        type: 'alert',
        title: `${stalledOrgs.length} deal${stalledOrgs.length > 1 ? 's' : ''} stalled`,
        description: `No activity for 7+ days: ${topStalled.map((o) => o.org_name).join(', ')}${stalledOrgs.length > 3 ? '...' : ''}`,
        metric: formatCurrency(stalledValue),
        action: {
          label: 'View Stalled',
          type: 'view',
          data: { filter: 'stalled', ids: stalledOrgs.map((o) => o.id) },
        },
        priority: 95,
      });
    }

    // ===== INSIGHT 3: Top Performers =====
    const dealsByAM = new Map<
      string,
      { count: number; value: number; deals: typeof thisWeekDeals }
    >();
    thisWeekDeals.forEach((o) => {
      const am = o.sales_poc || 'Unknown';
      const existing = dealsByAM.get(am) || { count: 0, value: 0, deals: [] };
      existing.count += 1;
      existing.value += o.deal_value || 0;
      existing.deals.push(o);
      dealsByAM.set(am, existing);
    });

    const topPerformers = Array.from(dealsByAM.entries())
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].value - a[1].value);

    if (topPerformers.length > 0) {
      const [topAM, topData] = topPerformers[0];
      insights.push({
        id: 'top-performer',
        type: 'success',
        title: `${topAM} closed ${topData.count} deals this week`,
        description: `Total value: ${formatCurrency(topData.value)} - Highest performer this week`,
        metric: formatCurrency(topData.value),
        priority: 60,
      });
    }

    // ===== INSIGHT 4: Expiring Quotes =====
    const expiringQuotes = typedQuotes.filter((q) => {
      if (!q.valid_until) return false;
      const validUntil = new Date(q.valid_until);
      return validUntil >= now && validUntil <= threeDaysFromNow;
    });

    if (expiringQuotes.length > 0) {
      const expiringValue = expiringQuotes.reduce(
        (sum, q) => sum + (q.total_value || 0),
        0
      );
      const topExpiring = expiringQuotes.slice(0, 2);

      insights.push({
        id: 'expiring-quotes',
        type: 'warning',
        title: `${expiringQuotes.length} quote${expiringQuotes.length > 1 ? 's' : ''} expiring soon`,
        description: `${topExpiring.map((q) => `${q.company_name} (${formatCurrency(q.total_value)})`).join(', ')}`,
        metric: formatCurrency(expiringValue),
        action: {
          label: 'Send Reminders',
          type: 'send_reminder',
          data: { quoteIds: expiringQuotes.map((q) => q.id) },
        },
        priority: 85,
      });
    }

    // ===== INSIGHT 5: Quote Generation Spike/Drop =====
    const quotesThisWeek = typedQuotes.filter(
      (q) => new Date(q.created_at) >= weekAgo
    );
    const quotesLastWeek = typedQuotes.filter(
      (q) =>
        new Date(q.created_at) >= twoWeeksAgo &&
        new Date(q.created_at) < weekAgo
    );

    if (quotesLastWeek.length > 0) {
      const quoteChange =
        ((quotesThisWeek.length - quotesLastWeek.length) /
          quotesLastWeek.length) *
        100;
      if (Math.abs(quoteChange) >= 30) {
        const isSpike = quoteChange > 0;
        insights.push({
          id: 'quote-activity',
          type: isSpike ? 'info' : 'warning',
          title: isSpike
            ? `Quote activity up ${Math.round(quoteChange)}%`
            : `Quote activity down ${Math.round(Math.abs(quoteChange))}%`,
          description: `${quotesThisWeek.length} quotes generated this week vs ${quotesLastWeek.length} last week`,
          metric: `${quotesThisWeek.length} quotes`,
          change: `${isSpike ? '+' : ''}${Math.round(quoteChange)}%`,
          priority: 50,
        });
      }
    }

    // ===== INSIGHT 6: Pipeline Value at Risk =====
    const trialOrgs = typedOrgs.filter((o) => o.status === 'trial');
    const demoOrgs = typedOrgs.filter((o) => o.status === 'demo');
    const atRiskValue =
      trialOrgs.reduce((sum, o) => sum + (o.deal_value || 0), 0) +
      demoOrgs.reduce((sum, o) => sum + (o.deal_value || 0), 0);

    if (trialOrgs.length + demoOrgs.length > 5 && atRiskValue > 100000) {
      insights.push({
        id: 'pipeline-at-risk',
        type: 'info',
        title: `${formatCurrency(atRiskValue)} in active pipeline`,
        description: `${trialOrgs.length} trials + ${demoOrgs.length} demos need attention`,
        metric: formatCurrency(atRiskValue),
        action: {
          label: 'View Pipeline',
          type: 'view',
          data: { filter: 'active' },
        },
        priority: 40,
      });
    }

    // ===== INSIGHT 7: Follow-up Needed =====
    const needsFollowUp = typedOrgs.filter((o) => {
      const lastUpdate = new Date(o.updated_at);
      const daysSinceUpdate = Math.floor(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return (
        o.status === 'proposal' && daysSinceUpdate >= 3 && daysSinceUpdate < 7
      );
    });

    if (needsFollowUp.length > 0) {
      insights.push({
        id: 'follow-up-needed',
        type: 'info',
        title: `${needsFollowUp.length} proposal${needsFollowUp.length > 1 ? 's' : ''} need follow-up`,
        description: `Sent 3-7 days ago: ${needsFollowUp.slice(0, 2).map((o) => o.org_name).join(', ')}`,
        action: {
          label: 'Send Follow-up',
          type: 'follow_up',
          data: { orgIds: needsFollowUp.map((o) => o.id) },
        },
        priority: 75,
      });
    }

    // ===== INSIGHT 8: MSA Milestones =====
    const msasThisWeek = typedMsas.filter(
      (m) => new Date(m.created_at) >= weekAgo
    );
    if (msasThisWeek.length > 0) {
      const msaValue = msasThisWeek.reduce(
        (sum, m) => sum + (m.total_value || 0),
        0
      );
      insights.push({
        id: 'msa-milestone',
        type: 'success',
        title: `${msasThisWeek.length} MSA${msasThisWeek.length > 1 ? 's' : ''} created this week`,
        description: `Total contract value: ${formatCurrency(msaValue)}`,
        metric: formatCurrency(msaValue),
        priority: 55,
      });
    }

    // Sort insights by priority (higher = show first)
    insights.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({
      insights: insights.slice(0, 6), // Return top 6 insights
      generatedAt: now.toISOString(),
      totalInsights: insights.length,
    });
  } catch (error) {
    console.error('Insights generation error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate insights', details: errorMessage },
      { status: 500 }
    );
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}
