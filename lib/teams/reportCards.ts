// Teams Adaptive Cards for Scheduled Reports
// Formats report data into MS Teams Adaptive Card format

import { ReportResult } from '../reports/generator';

export interface AdaptiveCard {
  type: 'AdaptiveCard';
  $schema: string;
  version: string;
  body: any[];
  actions?: any[];
}

// Create an adaptive card from report result
export function createReportCard(report: ReportResult, format: 'adaptive_card' | 'summary_text' | 'detailed' = 'adaptive_card'): AdaptiveCard | string {
  if (format === 'summary_text') {
    return createSummaryText(report);
  }

  if (format === 'detailed') {
    return createDetailedCard(report);
  }

  return createAdaptiveCard(report);
}

// Create standard adaptive card
function createAdaptiveCard(report: ReportResult): AdaptiveCard {
  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      // Header
      {
        type: 'TextBlock',
        size: 'Large',
        weight: 'Bolder',
        text: report.title,
        wrap: true,
      },
      {
        type: 'TextBlock',
        size: 'Small',
        color: 'Accent',
        text: `Generated: ${new Date(report.generated_at).toLocaleString()}`,
        spacing: 'None',
      },
      // Divider
      {
        type: 'Container',
        style: 'emphasis',
        items: [{ type: 'TextBlock', text: ' ', size: 'Small' }],
        spacing: 'Medium',
      },
    ],
    actions: [],
  };

  // Add key metrics
  if (report.summary?.key_metrics) {
    const metricsColumns: any[] = [];

    Object.entries(report.summary.key_metrics).forEach(([key, value]) => {
      metricsColumns.push({
        type: 'Column',
        width: 'auto',
        items: [
          {
            type: 'TextBlock',
            text: formatMetricLabel(key),
            size: 'Small',
            color: 'Accent',
            wrap: true,
          },
          {
            type: 'TextBlock',
            text: String(value),
            size: 'ExtraLarge',
            weight: 'Bolder',
          },
        ],
      });
    });

    if (metricsColumns.length > 0) {
      card.body.push({
        type: 'ColumnSet',
        columns: metricsColumns.slice(0, 4), // Max 4 columns
        spacing: 'Medium',
      });
    }
  }

  // Add data based on report type
  const dataItems = getTopDataItems(report);
  if (dataItems.length > 0) {
    card.body.push({
      type: 'TextBlock',
      text: 'Highlights',
      weight: 'Bolder',
      spacing: 'Large',
    });

    dataItems.forEach((item) => {
      card.body.push({
        type: 'Container',
        style: 'default',
        spacing: 'Small',
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: item.title,
                    weight: 'Bolder',
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    text: item.subtitle,
                    size: 'Small',
                    color: 'Accent',
                    spacing: 'None',
                    wrap: true,
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                verticalContentAlignment: 'Center',
                items: [
                  {
                    type: 'TextBlock',
                    text: item.badge || '',
                    color: item.badgeColor || 'Default',
                    weight: 'Bolder',
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  }

  return card;
}

// Create detailed card with more information
function createDetailedCard(report: ReportResult): AdaptiveCard {
  const card = createAdaptiveCard(report);

  // Add additional details based on report type
  if (report.data?.pipeline_stages) {
    card.body.push({
      type: 'TextBlock',
      text: 'Pipeline Breakdown',
      weight: 'Bolder',
      spacing: 'Large',
    });

    const stageItems = Object.entries(report.data.pipeline_stages).map(([stage, data]: [string, any]) => ({
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'stretch',
          items: [{ type: 'TextBlock', text: formatMetricLabel(stage) }],
        },
        {
          type: 'Column',
          width: 'auto',
          items: [{ type: 'TextBlock', text: `${data.count} deals` }],
        },
        {
          type: 'Column',
          width: 'auto',
          items: [{ type: 'TextBlock', text: `$${(data.value || 0).toLocaleString()}`, color: 'Good' }],
        },
      ],
    }));

    card.body.push(...stageItems);
  }

  if (report.data?.activity_breakdown) {
    card.body.push({
      type: 'TextBlock',
      text: 'Activity Types',
      weight: 'Bolder',
      spacing: 'Large',
    });

    const activityItems = Object.entries(report.data.activity_breakdown)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([type, count]) => ({
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [{ type: 'TextBlock', text: formatMetricLabel(type) }],
          },
          {
            type: 'Column',
            width: 'auto',
            items: [{ type: 'TextBlock', text: String(count), weight: 'Bolder' }],
          },
        ],
      }));

    card.body.push(...activityItems);
  }

  return card;
}

// Create simple text summary
function createSummaryText(report: ReportResult): string {
  const lines: string[] = [
    `📊 **${report.title}**`,
    `_Generated: ${new Date(report.generated_at).toLocaleString()}_`,
    '',
  ];

  // Key metrics
  if (report.summary?.key_metrics) {
    lines.push('**Key Metrics:**');
    Object.entries(report.summary.key_metrics).forEach(([key, value]) => {
      lines.push(`• ${formatMetricLabel(key)}: **${value}**`);
    });
    lines.push('');
  }

  // Top items
  const dataItems = getTopDataItems(report);
  if (dataItems.length > 0) {
    lines.push('**Highlights:**');
    dataItems.slice(0, 5).forEach((item) => {
      lines.push(`• ${item.title} - ${item.subtitle}`);
    });
  }

  return lines.join('\n');
}

// Extract top data items for display
function getTopDataItems(report: ReportResult): Array<{
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
}> {
  const items: Array<{ title: string; subtitle: string; badge?: string; badgeColor?: string }> = [];

  // Handle different data structures
  if (report.data?.organizations) {
    report.data.organizations.slice(0, 5).forEach((org: any) => {
      items.push({
        title: org.org_name,
        subtitle: `${org.account_manager?.full_name || 'Unassigned'} | Stage: ${formatMetricLabel(org.org_lifecycle_stage || 'unknown')}`,
        badge: org.health_status ? formatMetricLabel(org.health_status) : undefined,
        badgeColor: getHealthColor(org.health_status),
      });
    });
  }

  if (report.data?.at_risk_organizations) {
    report.data.at_risk_organizations.slice(0, 5).forEach((org: any) => {
      items.push({
        title: org.org_name,
        subtitle: `Engagement: ${org.engagement_score || 0}% | ${org.days_until_expiry !== null ? `Expires in ${org.days_until_expiry} days` : 'No expiry set'}`,
        badge: org.health_status ? formatMetricLabel(org.health_status) : undefined,
        badgeColor: 'Attention',
      });
    });
  }

  if (report.data?.overdue) {
    report.data.overdue.slice(0, 5).forEach((followUp: any) => {
      items.push({
        title: followUp.title,
        subtitle: `${followUp.trial_organizations?.org_name || 'Unknown'} | Due: ${new Date(followUp.due_date).toLocaleDateString()}`,
        badge: 'OVERDUE',
        badgeColor: 'Attention',
      });
    });
  }

  if (report.data?.manager_stats) {
    report.data.manager_stats.slice(0, 5).forEach((manager: any) => {
      items.push({
        title: manager.name,
        subtitle: `${manager.total_accounts} accounts | ${manager.converted} converted | ${manager.at_risk} at risk`,
        badge: `${manager.converted}`,
        badgeColor: 'Good',
      });
    });
  }

  if (report.data?.recent_activities) {
    report.data.recent_activities.slice(0, 5).forEach((activity: any) => {
      items.push({
        title: activity.trial_organizations?.org_name || 'Unknown',
        subtitle: `${formatMetricLabel(activity.activity_type)} - ${new Date(activity.created_at).toLocaleString()}`,
      });
    });
  }

  return items;
}

// Format metric labels for display
function formatMetricLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

// Get health status color
function getHealthColor(status: string): string {
  switch (status) {
    case 'healthy':
    case 'good':
      return 'Good';
    case 'at_risk':
    case 'warning':
      return 'Warning';
    case 'critical':
    case 'bad':
      return 'Attention';
    default:
      return 'Default';
  }
}

// Send report to Teams webhook
export async function sendReportToTeams(
  webhookUrl: string,
  card: AdaptiveCard | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = typeof card === 'string'
      ? { text: card }
      : {
          type: 'message',
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: card,
            },
          ],
        };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Teams webhook returned ${response.status}: ${await response.text()}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending to Teams',
    };
  }
}
