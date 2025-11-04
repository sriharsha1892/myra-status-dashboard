'use client';

/**
 * Teams OAuth Button Component
 *
 * Handles Microsoft OAuth authentication flow for Teams integration.
 * Redirects to Microsoft login and initiates the OAuth process.
 */

import { useState } from 'react';
import { Button } from '@/components/support/ui/Button';

interface TeamsOAuthButtonProps {
  isConnected?: boolean;
  onDisconnect?: () => void;
}

export default function TeamsOAuthButton({
  isConnected = false,
  onDisconnect,
}: TeamsOAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);

      // Generate a random state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('teams_oauth_state', state);

      // Redirect to OAuth authorization endpoint
      // This will be handled by the backend API route
      window.location.href = `/api/teams/auth/authorize?state=${state}`;
    } catch (error) {
      console.error('Failed to initiate OAuth flow:', error);
      alert('Failed to connect to Microsoft Teams. Please try again.');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;

    const confirmed = confirm(
      'Are you sure you want to disconnect Teams integration? You will stop receiving notifications in Teams.'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await onDisconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect Teams integration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-medium text-green-800">Connected to Teams</span>
        </div>

        {onDisconnect && (
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.7 3H4.3A1.3 1.3 0 0 0 3 4.3v15.4A1.3 1.3 0 0 0 4.3 21h15.4a1.3 1.3 0 0 0 1.3-1.3V4.3A1.3 1.3 0 0 0 19.7 3zM11.5 6.5h6v4.5h-6zm0 6h6V17h-6zm-5-6h3.5v4.5h-3.5zm0 6h3.5V17h-3.5z" />
            </svg>
            Connect to Microsoft Teams
          </>
        )}
      </Button>

      <p className="text-sm text-gray-600">
        Click to authorize myRA Support System to send notifications to your Teams channels.
      </p>
    </div>
  );
}
