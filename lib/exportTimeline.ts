import { Database } from '@/lib/supabase/types';
import { format } from 'date-fns';

type TicketActivity = Database['public']['Tables']['ticket_activities']['Row'];

/**
 * Export timeline to CSV format
 */
export function exportTimelineToCSV(activities: TicketActivity[], ticketNumber: string) {
  // CSV Headers
  const headers = [
    'Timestamp',
    'Activity Type',
    'User',
    'Old Value',
    'New Value',
    'Details',
  ];

  // Convert activities to CSV rows
  const rows = activities.map((activity) => {
    const timestamp = format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss');
    const activityType = formatActivityType(activity.activity_type);
    const user = activity.metadata?.user_name || 'System';
    const oldValue = activity.old_value || '';
    const newValue = activity.new_value || '';
    const details = activity.metadata ? JSON.stringify(activity.metadata) : '';

    return [
      timestamp,
      activityType,
      user,
      oldValue,
      newValue,
      details,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${ticketNumber}_activity_log_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export timeline to PDF format
 * Uses browser's print functionality for PDF generation
 */
export async function exportTimelineToPDF(activities: TicketActivity[], ticketNumber: string) {
  // Create a formatted HTML document for printing
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Unable to open print window. Please check your popup blocker.');
  }

  const htmlContent = generatePrintableHTML(activities, ticketNumber);

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close the window after printing (user can cancel)
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 250);
  };
}

/**
 * Generate printable HTML for PDF export
 */
function generatePrintableHTML(activities: TicketActivity[], ticketNumber: string): string {
  const timestamp = format(new Date(), 'MMMM d, yyyy h:mm a');

  const activitiesHTML = activities
    .map((activity) => {
      const time = format(new Date(activity.created_at), 'MMM d, yyyy h:mm a');
      const user = activity.metadata?.user_name || 'System';
      const description = getActivityDescription(activity);

      return `
        <div class="activity-item">
          <div class="activity-header">
            <span class="activity-type ${activity.activity_type}">${formatActivityType(activity.activity_type)}</span>
            <span class="activity-time">${time}</span>
          </div>
          <div class="activity-content">
            <div class="activity-user">${user}</div>
            <div class="activity-description">${description}</div>
            ${activity.old_value || activity.new_value ? `
              <div class="activity-values">
                ${activity.old_value ? `<span class="old-value">From: ${activity.old_value}</span>` : ''}
                ${activity.old_value && activity.new_value ? '<span class="arrow">→</span>' : ''}
                ${activity.new_value ? `<span class="new-value">To: ${activity.new_value}</span>` : ''}
              </div>
            ` : ''}
            ${activity.metadata && Object.keys(activity.metadata).length > 0 ? `
              <div class="activity-metadata">
                <strong>Details:</strong>
                <pre>${JSON.stringify(activity.metadata, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Activity Log - ${ticketNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            padding: 40px;
            max-width: 1000px;
            margin: 0 auto;
          }

          .header {
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }

          .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
          }

          .header .subtitle {
            font-size: 14px;
            color: #6b7280;
          }

          .activity-item {
            border-left: 3px solid #e5e7eb;
            padding-left: 20px;
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid #f3f4f6;
            page-break-inside: avoid;
          }

          .activity-item:last-child {
            border-bottom: none;
          }

          .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .activity-type {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .activity-type.created {
            background-color: #dbeafe;
            color: #1e40af;
          }

          .activity-type.status_changed {
            background-color: #f3e8ff;
            color: #7c3aed;
          }

          .activity-type.assigned {
            background-color: #d1fae5;
            color: #065f46;
          }

          .activity-type.commented {
            background-color: #f3f4f6;
            color: #374151;
          }

          .activity-type.linked {
            background-color: #fed7aa;
            color: #9a3412;
          }

          .activity-type.watched {
            background-color: #ccfbf1;
            color: #115e59;
          }

          .activity-time {
            font-size: 12px;
            color: #6b7280;
          }

          .activity-content {
            padding-left: 4px;
          }

          .activity-user {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
          }

          .activity-description {
            color: #4b5563;
            margin-bottom: 8px;
          }

          .activity-values {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
            font-size: 14px;
          }

          .old-value {
            padding: 4px 8px;
            background-color: #f3f4f6;
            border-radius: 4px;
            color: #6b7280;
          }

          .new-value {
            padding: 4px 8px;
            background-color: #dbeafe;
            border-radius: 4px;
            color: #1e40af;
            font-weight: 500;
          }

          .arrow {
            color: #9ca3af;
          }

          .activity-metadata {
            margin-top: 12px;
            padding: 12px;
            background-color: #f9fafb;
            border-radius: 6px;
            font-size: 12px;
          }

          .activity-metadata strong {
            display: block;
            margin-bottom: 8px;
            color: #374151;
          }

          .activity-metadata pre {
            color: #6b7280;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
          }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }

          @media print {
            body {
              padding: 20px;
            }

            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Activity Log</h1>
          <div class="subtitle">
            Ticket: ${ticketNumber} | Generated: ${timestamp} | Total Events: ${activities.length}
          </div>
        </div>

        <div class="activities">
          ${activitiesHTML}
        </div>

        <div class="footer">
          myRA AI Support System - Confidential
        </div>
      </body>
    </html>
  `;
}

/**
 * Get human-readable activity description
 */
function getActivityDescription(activity: TicketActivity): string {
  const { activity_type, old_value, new_value } = activity;

  switch (activity_type) {
    case 'created':
      return 'created this ticket';
    case 'status_changed':
      return `changed status from ${old_value || 'N/A'} to ${new_value || 'N/A'}`;
    case 'assigned':
      return `assigned ticket to ${new_value || 'someone'}`;
    case 'commented':
      return 'added a comment';
    case 'linked':
      return `linked ticket ${new_value || ''}`;
    case 'watched':
      return 'started watching this ticket';
    default:
      return 'performed an action';
  }
}

/**
 * Format activity type for display
 */
function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    created: 'Created',
    status_changed: 'Status Changed',
    assigned: 'Assigned',
    commented: 'Commented',
    linked: 'Linked',
    watched: 'Watched',
  };

  return typeMap[type] || type;
}
