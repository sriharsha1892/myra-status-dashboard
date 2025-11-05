/**
 * Microsoft Graph API Client
 *
 * This module provides a client for interacting with Microsoft Graph API
 * to manage Teams channels, send messages, and handle OAuth tokens.
 *
 * AZURE AD APP REGISTRATION REQUIREMENTS:
 * ========================================
 * 1. Go to Azure Portal > Azure Active Directory > App registrations
 * 2. Create a new app registration with these settings:
 *    - Name: "myRA Support System - Teams Integration"
 *    - Supported account types: "Accounts in this organizational directory only"
 *    - Redirect URI: Web - https://yourdomain.com/api/teams/auth/callback
 *
 * 3. Required API Permissions (Microsoft Graph - Delegated):
 *    - Team.ReadBasic.All - Read team names
 *    - Channel.ReadBasic.All - Read channel names
 *    - ChannelMessage.Send - Send messages to channels
 *    - offline_access - Get refresh tokens
 *
 * 4. Create a client secret in "Certificates & secrets"
 *
 * 5. Set these environment variables:
 *    - TEAMS_CLIENT_ID: Application (client) ID
 *    - TEAMS_CLIENT_SECRET: Client secret value
 *    - TEAMS_TENANT_ID: Directory (tenant) ID
 *    - TEAMS_REDIRECT_URI: Redirect URI from step 2
 */

import { createClient } from '@/lib/supabase/server';

// Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_API_BETA = 'https://graph.microsoft.com/beta';

// OAuth endpoints
const OAUTH_AUTHORIZE_URL = `https://login.microsoftonline.com/${process.env.TEAMS_TENANT_ID || 'common'}/oauth2/v2.0/authorize`;
const OAUTH_TOKEN_URL = `https://login.microsoftonline.com/${process.env.TEAMS_TENANT_ID || 'common'}/oauth2/v2.0/token`;

// Required OAuth scopes
export const TEAMS_SCOPES = [
  'Team.ReadBasic.All',
  'Channel.ReadBasic.All',
  'ChannelMessage.Send',
  'offline_access'
].join(' ');

export interface TeamsConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface Team {
  id: string;
  displayName: string;
  description?: string;
}

export interface Channel {
  id: string;
  displayName: string;
  description?: string;
  membershipType?: string;
}

export interface MessageResponse {
  id: string;
  createdDateTime: string;
  webUrl: string;
}

/**
 * Initialize Graph client with access token
 */
export class GraphClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make authenticated request to Graph API
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          `Graph API error: ${response.status} - ${JSON.stringify(error)}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Graph API request failed:', error);
      throw error;
    }
  }

  /**
   * Get list of user's teams
   */
  async getTeams(): Promise<Team[]> {
    try {
      const response = await this.request<{ value: Team[] }>(
        `${GRAPH_API_BASE}/me/joinedTeams`
      );
      return response.value || [];
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      throw new Error('Failed to fetch teams from Microsoft Graph');
    }
  }

  /**
   * Get channels in a team
   */
  async getChannels(teamId: string): Promise<Channel[]> {
    try {
      const response = await this.request<{ value: Channel[] }>(
        `${GRAPH_API_BASE}/teams/${teamId}/channels`
      );
      return response.value || [];
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      throw new Error('Failed to fetch channels from Microsoft Graph');
    }
  }

  /**
   * Send adaptive card message to a channel
   */
  async sendMessage(
    teamId: string,
    channelId: string,
    adaptiveCard: any
  ): Promise<MessageResponse> {
    try {
      const message = {
        body: {
          contentType: 'html',
          content: '<attachment id="adaptive-card"></attachment>',
        },
        attachments: [
          {
            id: 'adaptive-card',
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: adaptiveCard,
          },
        ],
      };

      return await this.request<MessageResponse>(
        `${GRAPH_API_BASE}/teams/${teamId}/channels/${channelId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(message),
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error('Failed to send message to Teams channel');
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    try {
      return await this.request<any>(`${GRAPH_API_BASE}/me`);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }
}

/**
 * Get OAuth authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.TEAMS_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: process.env.TEAMS_REDIRECT_URI || '',
    scope: TEAMS_SCOPES,
    response_mode: 'query',
    ...(state && { state }),
  });

  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.TEAMS_CLIENT_ID || '',
      client_secret: process.env.TEAMS_CLIENT_SECRET || '',
      code,
      redirect_uri: process.env.TEAMS_REDIRECT_URI || '',
      grant_type: 'authorization_code',
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to exchange code for token:', error);
    throw new Error('Failed to exchange authorization code for access token');
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.TEAMS_CLIENT_ID || '',
      client_secret: process.env.TEAMS_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to refresh token:', error);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Get active Teams integration with valid token
 * Automatically refreshes token if expired
 */
export async function getActiveTeamsIntegration(): Promise<{
  id: string;
  team_id: string;
  team_name: string;
  channel_id: string;
  channel_name: string;
  access_token: string;
  notification_rules: any;
} | null> {
  try {
    const supabase = await createClient();

    // Get active integration
    const { data: integration, error } = await supabase
      .from('teams_integration')
      .select('*')
      .eq('enabled', true)
      .single();

    if (error || !integration) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(integration.token_expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() < bufferMs) {
      // Token expired or about to expire, refresh it
      console.log('Refreshing expired Teams access token...');

      const tokenData = await refreshAccessToken(integration.refresh_token);

      // Update integration with new token
      const newExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

      const { data: updated, error: updateError } = await supabase
        .from('teams_integration')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', integration.id)
        .select()
        .single();

      if (updateError || !updated) {
        console.error('Failed to update refreshed token:', updateError);
        throw new Error('Failed to update refreshed token');
      }

      return updated;
    }

    return integration;
  } catch (error) {
    console.error('Failed to get active Teams integration:', error);
    return null;
  }
}

/**
 * Create a Graph client with auto-refreshing token
 */
export async function createGraphClient(): Promise<GraphClient | null> {
  const integration = await getActiveTeamsIntegration();

  if (!integration) {
    return null;
  }

  return new GraphClient(integration.access_token);
}
