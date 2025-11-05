/**
 * MS Teams Adaptive Card Templates
 * 
 * Creates rich, interactive cards for Teams notifications
 * See: https://adaptivecards.io/designer/
 */

interface Ticket {
  id: string;
  organization: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  user_name: string;
  created_at: string;
}

export function createNewTicketCard(ticket: Ticket, ticketUrl: string) {
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: '🎫 New Support Ticket',
            weight: 'bolder',
            size: 'large',
            color: 'accent'
          },
          {
            type: 'FactSet',
            facts: [
              { title: 'Ticket ID', value: `#${ticket.id.slice(0, 8)}` },
              { title: 'Organization', value: ticket.organization },
              { title: 'Category', value: ticket.category },
              { title: 'Priority', value: ticket.priority },
              { title: 'Submitted by', value: ticket.user_name }
            ]
          },
          {
            type: 'TextBlock',
            text: ticket.description.slice(0, 200) + (ticket.description.length > 200 ? '...' : ''),
            wrap: true,
            spacing: 'medium'
          }
        ],
        actions: [
          {
            type: 'Action.OpenUrl',
            title: 'View Ticket',
            url: ticketUrl
          }
        ]
      }
    }]
  };
}

export function createStatusChangeCard(ticket: Ticket, oldStatus: string, newStatus: string, ticketUrl: string) {
  const color = newStatus === 'Resolved' ? 'good' : newStatus === 'Closed' ? 'default' : 'warning';
  
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: `🔄 Ticket Status Updated`,
            weight: 'bolder',
            size: 'medium'
          },
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [{
                  type: 'TextBlock',
                  text: oldStatus,
                  color: 'default'
                }]
              },
              {
                type: 'Column',
                width: 'auto',
                items: [{
                  type: 'TextBlock',
                  text: '→',
                  spacing: 'small'
                }]
              },
              {
                type: 'Column',
                width: 'auto',
                items: [{
                  type: 'TextBlock',
                  text: newStatus,
                  color: color,
                  weight: 'bolder'
                }]
              }
            ]
          },
          {
            type: 'FactSet',
            facts: [
              { title: 'Ticket', value: `#${ticket.id.slice(0, 8)}` },
              { title: 'Organization', value: ticket.organization }
            ]
          }
        ],
        actions: [{
          type: 'Action.OpenUrl',
          title: 'View Ticket',
          url: ticketUrl
        }]
      }
    }]
  };
}

export function createCommentCard(ticket: Ticket, comment: string, commenter: string, ticketUrl: string) {
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: '💬 New Comment',
            weight: 'bolder',
            size: 'medium'
          },
          {
            type: 'TextBlock',
            text: `**${commenter}** commented on #${ticket.id.slice(0, 8)}`,
            wrap: true,
            spacing: 'small'
          },
          {
            type: 'TextBlock',
            text: comment.slice(0, 300) + (comment.length > 300 ? '...' : ''),
            wrap: true,
            spacing: 'medium',
            isSubtle: true
          }
        ],
        actions: [{
          type: 'Action.OpenUrl',
          title: 'View Conversation',
          url: ticketUrl
        }]
      }
    }]
  };
}

export function createAssignmentCard(ticket: Ticket, assignee: string, ticketUrl: string) {
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: '👤 Ticket Assigned',
            weight: 'bolder',
            size: 'medium'
          },
          {
            type: 'FactSet',
            facts: [
              { title: 'Ticket', value: `#${ticket.id.slice(0, 8)}` },
              { title: 'Assigned to', value: assignee },
              { title: 'Priority', value: ticket.priority }
            ]
          }
        ],
        actions: [{
          type: 'Action.OpenUrl',
          title: 'View Ticket',
          url: ticketUrl
        }]
      }
    }]
  };
}
