import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import 'isomorphic-fetch';

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  },
};

const SCOPES = ['Calendars.ReadWrite', 'offline_access'];

export function getAuthUrl(state?: string): string {
  const cca = new ConfidentialClientApplication(msalConfig);

  return cca.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
    state: state || '',
  });
}

export async function getTokensFromCode(code: string) {
  const cca = new ConfidentialClientApplication(msalConfig);

  const response = await cca.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresOn: response.expiresOn,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const cca = new ConfidentialClientApplication(msalConfig);

  const response = await cca.acquireTokenByRefreshToken({
    refreshToken,
    scopes: SCOPES,
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken || refreshToken,
    expiresOn: response.expiresOn,
  };
}

export function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export interface CalendarEvent {
  subject: string;
  body: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional';
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness';
}

export async function createCalendarEvent(accessToken: string, event: CalendarEvent) {
  const client = getGraphClient(accessToken);

  const createdEvent = await client
    .api('/me/calendar/events')
    .post(event);

  return createdEvent;
}

export async function listCalendarEvents(
  accessToken: string,
  startDateTime?: Date,
  endDateTime?: Date
) {
  const client = getGraphClient(accessToken);

  let request = client
    .api('/me/calendar/calendarView')
    .query({
      startDateTime: (startDateTime || new Date()).toISOString(),
      endDateTime: (endDateTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString(),
    })
    .select('subject,body,start,end,attendees,onlineMeeting,organizer')
    .orderby('start/dateTime');

  const response = await request.get();
  return response.value || [];
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>
) {
  const client = getGraphClient(accessToken);

  const updatedEvent = await client
    .api(`/me/calendar/events/${eventId}`)
    .patch(event);

  return updatedEvent;
}

export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const client = getGraphClient(accessToken);

  await client
    .api(`/me/calendar/events/${eventId}`)
    .delete();
}
