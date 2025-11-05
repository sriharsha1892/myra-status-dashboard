import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

export function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export interface AdaptiveCard {
  type: 'AdaptiveCard';
  version: string;
  body: any[];
  actions?: any[];
}

export function createTicketNotificationCard(ticket: {
  ticket_number: string;
  organization: string;
  priority: string;
  category: string;
  description: string;
  status: string;
  ticketUrl: string;
}): AdaptiveCard {
  const priorityColor = {
    Critical: 'attention',
    High: 'warning',
    Medium: 'good',
    Low: 'default',
  }[ticket.priority] || 'default';

  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `New Support Ticket: ${ticket.ticket_number}`,
        weight: 'bolder',
        size: 'large',
        wrap: true,
      },
      {
        type: 'FactSet',
        facts: [
          {
            title: 'Organization:',
            value: ticket.organization,
          },
          {
            title: 'Priority:',
            value: ticket.priority,
          },
          {
            title: 'Category:',
            value: ticket.category,
          },
          {
            title: 'Status:',
            value: ticket.status,
          },
        ],
      },
      {
        type: 'TextBlock',
        text: 'Description:',
        weight: 'bolder',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: ticket.description.substring(0, 200) + (ticket.description.length > 200 ? '...' : ''),
        wrap: true,
        isSubtle: true,
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Ticket',
        url: ticket.ticketUrl,
      },
    ],
  };
}

export function createStatusChangeCard(ticket: {
  ticket_number: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  ticketUrl: string;
}): AdaptiveCard {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `Ticket Status Updated: ${ticket.ticket_number}`,
        weight: 'bolder',
        size: 'medium',
        wrap: true,
      },
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'TextBlock',
                text: ticket.oldStatus,
                color: 'default',
                weight: 'bolder',
              },
            ],
          },
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'TextBlock',
                text: '→',
                color: 'accent',
                weight: 'bolder',
                spacing: 'small',
              },
            ],
          },
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'TextBlock',
                text: ticket.newStatus,
                color: 'good',
                weight: 'bolder',
              },
            ],
          },
        ],
      },
      {
        type: 'TextBlock',
        text: `Changed by: ${ticket.changedBy}`,
        isSubtle: true,
        size: 'small',
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Ticket',
        url: ticket.ticketUrl,
      },
    ],
  };
}

export async function sendChannelMessage(
  accessToken: string,
  teamId: string,
  channelId: string,
  message: string,
  adaptiveCard?: AdaptiveCard
) {
  const client = getGraphClient(accessToken);

  const chatMessage: any = {
    body: {
      contentType: 'html',
      content: message,
    },
  };

  if (adaptiveCard) {
    chatMessage.attachments = [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: JSON.stringify(adaptiveCard),
      },
    ];
  }

  const response = await client
    .api(`/teams/${teamId}/channels/${channelId}/messages`)
    .post(chatMessage);

  return response;
}

export async function sendWebhookMessage(
  webhookUrl: string,
  message: string,
  adaptiveCard?: AdaptiveCard
) {
  const body: any = {
    text: message,
  };

  if (adaptiveCard) {
    body.type = 'message';
    body.attachments = [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: adaptiveCard,
      },
    ];
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Teams webhook failed: ${response.statusText}`);
  }

  return response;
}

export async function listTeams(accessToken: string) {
  const client = getGraphClient(accessToken);

  const response = await client
    .api('/me/joinedTeams')
    .get();

  return response.value || [];
}

export async function listChannels(accessToken: string, teamId: string) {
  const client = getGraphClient(accessToken);

  const response = await client
    .api(`/teams/${teamId}/channels`)
    .get();

  return response.value || [];
}
