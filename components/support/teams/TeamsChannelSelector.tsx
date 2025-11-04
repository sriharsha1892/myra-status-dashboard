'use client';

/**
 * Teams Channel Selector Component
 *
 * Allows selecting a Team and Channel for notifications.
 * Fetches teams and channels from Microsoft Graph API.
 */

import { useState, useEffect } from 'react';
import { Select } from '@/components/support/ui/Select';

interface Team {
  id: string;
  displayName: string;
  description?: string;
}

interface Channel {
  id: string;
  displayName: string;
  description?: string;
}

interface TeamsChannelSelectorProps {
  initialTeamId?: string;
  initialChannelId?: string;
  onSelectionChange: (teamId: string, channelId: string, teamName: string, channelName: string) => void;
  disabled?: boolean;
}

export default function TeamsChannelSelector({
  initialTeamId,
  initialChannelId,
  onSelectionChange,
  disabled = false,
}: TeamsChannelSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || '');
  const [selectedChannelId, setSelectedChannelId] = useState(initialChannelId || '');
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teams on mount
  useEffect(() => {
    loadTeams();
  }, []);

  // Load channels when team is selected
  useEffect(() => {
    if (selectedTeamId) {
      loadChannels(selectedTeamId);
    } else {
      setChannels([]);
      setSelectedChannelId('');
    }
  }, [selectedTeamId]);

  // Notify parent of selection changes
  useEffect(() => {
    if (selectedTeamId && selectedChannelId) {
      const team = teams.find(t => t.id === selectedTeamId);
      const channel = channels.find(c => c.id === selectedChannelId);

      if (team && channel) {
        onSelectionChange(
          selectedTeamId,
          selectedChannelId,
          team.displayName,
          channel.displayName
        );
      }
    }
  }, [selectedTeamId, selectedChannelId, teams, channels, onSelectionChange]);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      setError(null);

      const response = await fetch('/api/teams/list');

      if (!response.ok) {
        throw new Error('Failed to load teams');
      }

      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadChannels = async (teamId: string) => {
    try {
      setLoadingChannels(true);
      setError(null);

      const response = await fetch(`/api/teams/channels?teamId=${teamId}`);

      if (!response.ok) {
        throw new Error('Failed to load channels');
      }

      const data = await response.json();
      setChannels(data.channels || []);
    } catch (err) {
      console.error('Failed to load channels:', err);
      setError('Failed to load channels. Please try again.');
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Team
          </label>

          {loadingTeams ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <svg
                className="animate-spin h-4 w-4 text-gray-600"
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
              <span className="text-sm text-gray-600">Loading teams...</span>
            </div>
          ) : (
            <Select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              disabled={disabled || teams.length === 0}
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.displayName}
                </option>
              ))}
            </Select>
          )}

          {!loadingTeams && teams.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              No teams found. Make sure you're a member of at least one team.
            </p>
          )}
        </div>

        {/* Channel Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Channel
          </label>

          {loadingChannels ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <svg
                className="animate-spin h-4 w-4 text-gray-600"
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
              <span className="text-sm text-gray-600">Loading channels...</span>
            </div>
          ) : (
            <Select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              disabled={disabled || !selectedTeamId || channels.length === 0}
            >
              <option value="">Select a channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.displayName}
                </option>
              ))}
            </Select>
          )}

          {!loadingChannels && selectedTeamId && channels.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              No channels found in this team.
            </p>
          )}

          {!selectedTeamId && (
            <p className="text-xs text-gray-500 mt-1">
              Select a team first
            </p>
          )}
        </div>
      </div>

      {selectedTeamId && selectedChannelId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Notifications will be sent to:{' '}
            <span className="font-medium">
              {teams.find(t => t.id === selectedTeamId)?.displayName} /{' '}
              {channels.find(c => c.id === selectedChannelId)?.displayName}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
