'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Check, AlertCircle } from 'lucide-react';

export default function TeamsConfigPanel() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [teamName, setTeamName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams/webhook');
      if (response.ok) {
        const { data } = await response.json();
        if (data) {
          setWebhookUrl(data.webhook_url || '');
          setTeamName(data.team_name || '');
          setChannelName(data.channel_name || '');
        }
      }
    } catch (error) {
      console.error('Failed to load Teams config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      setMessage({ type: 'error', text: 'Webhook URL is required' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/teams/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          teamName,
          channelName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setMessage({ type: 'success', text: 'Teams integration configured successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Microsoft Teams Integration</h3>
          <p className="text-sm text-gray-600">Send ticket notifications to Teams channels</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Incoming Webhook URL
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://outlook.office.com/webhook/..."
            className="w-full h-11 px-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Create an incoming webhook in your Teams channel settings
          </p>
        </div>

        {/* Team Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Team Name (Optional)
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Support Team"
            className="w-full h-11 px-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Channel Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Channel Name (Optional)
          </label>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Ticket Notifications"
            className="w-full h-11 px-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>

        {/* Setup Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Setup Instructions:</h4>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Open Microsoft Teams and navigate to your desired channel</li>
            <li>Click the three dots next to the channel name → Connectors</li>
            <li>Find "Incoming Webhook" and click Configure</li>
            <li>Provide a name and upload an image (optional)</li>
            <li>Copy the webhook URL and paste it above</li>
            <li>Click Save to complete the setup</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
