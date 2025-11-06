/**
 * Microsoft Calendar Client
 * Handles Microsoft Graph API interactions for calendar events
 */

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Refresh an expired Microsoft OAuth access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString()
  };
}

/**
 * Delete a calendar event from Microsoft Calendar
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const endpoint = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete calendar event: ${error}`);
  }
}

/**
 * Create a calendar event in Microsoft Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  event: {
    subject: string;
    start: string;
    end: string;
    body?: string;
    location?: string;
    attendees?: string[];
  }
): Promise<{ id: string }> {
  const endpoint = 'https://graph.microsoft.com/v1.0/me/events';

  const eventBody = {
    subject: event.subject,
    start: {
      dateTime: event.start,
      timeZone: 'UTC'
    },
    end: {
      dateTime: event.end,
      timeZone: 'UTC'
    },
    body: event.body
      ? {
          contentType: 'HTML',
          content: event.body
        }
      : undefined,
    location: event.location
      ? {
          displayName: event.location
        }
      : undefined,
    attendees: event.attendees?.map((email) => ({
      emailAddress: {
        address: email
      },
      type: 'required'
    }))
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  const data = await response.json();
  return { id: data.id };
}

/**
 * Update a calendar event in Microsoft Calendar
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  updates: {
    subject?: string;
    start?: string;
    end?: string;
    body?: string;
    location?: string;
  }
): Promise<void> {
  const endpoint = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;

  const eventBody: any = {};

  if (updates.subject) eventBody.subject = updates.subject;
  if (updates.start) {
    eventBody.start = {
      dateTime: updates.start,
      timeZone: 'UTC'
    };
  }
  if (updates.end) {
    eventBody.end = {
      dateTime: updates.end,
      timeZone: 'UTC'
    };
  }
  if (updates.body) {
    eventBody.body = {
      contentType: 'HTML',
      content: updates.body
    };
  }
  if (updates.location) {
    eventBody.location = {
      displayName: updates.location
    };
  }

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update calendar event: ${error}`);
  }
}

/**
 * Get calendar events from Microsoft Calendar
 */
export async function getCalendarEvents(
  accessToken: string,
  options?: {
    startDate?: string;
    endDate?: string;
    top?: number;
  }
): Promise<any[]> {
  let endpoint = 'https://graph.microsoft.com/v1.0/me/events';

  const params = new URLSearchParams();
  if (options?.startDate && options?.endDate) {
    params.append('$filter', `start/dateTime ge '${options.startDate}' and end/dateTime le '${options.endDate}'`);
  }
  if (options?.top) {
    params.append('$top', options.top.toString());
  }
  params.append('$orderby', 'start/dateTime');

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get calendar events: ${error}`);
  }

  const data = await response.json();
  return data.value || [];
}
