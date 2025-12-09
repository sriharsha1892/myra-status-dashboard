'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { MessageSquare, AlertCircle } from 'lucide-react';

interface TeamsConfig {
  id?: string;
  team_name: string;
  channel_name: string;
  enabled: boolean;
  notification_rules: {
    new_tickets: boolean;
    status_changes: boolean;
    priority_changes: boolean;
    new_comments: boolean;
    assignments: boolean;
  };
}

export default function TeamsIntegrationPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const supabase = createClient();
  const [config, setConfig] = useState<TeamsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && role !== undefined && (role?.toLowerCase() === 'admin' || is_super_admin)) {
      fetchConfig();
    } else if (!authLoading && role !== undefined) {
      // Role is loaded but user doesn't have access - stop loading spinner
      setLoading(false);
    }
  }, [user, role, is_super_admin, authLoading]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams_integration')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        const typedData = data as any;
        setConfig({
          id: typedData.id,
          team_name: typedData.team_name || '',
          channel_name: typedData.channel_name || '',
          enabled: typedData.enabled || false,
          notification_rules: typedData.notification_rules || {
            new_tickets: true,
            status_changes: true,
            priority_changes: false,
            new_comments: true,
            assignments: true,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Teams config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          // -ignore - Supabase typing issue with dynamic columns

          .from('teams_integration')
          // @ts-ignore - Supabase typing issue with dynamic columns
          // -ignore - Supabase typing issue with dynamic columns

          .update({
            team_name: config.team_name,
            channel_name: config.channel_name,
            enabled: config.enabled,
            notification_rules: config.notification_rules,
          })
          .eq('id', config.id);
        if (error) throw error;
      }
      toast.success('Teams configuration saved');
    } catch (error: any) {
      toast.error('Failed to save configuration');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Show loading while auth loads or while user details (role/is_super_admin) are still being fetched
  // We need to wait for fetchUserDetails to complete, which sets role from null to a value
  if (authLoading || (user && role === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // Access denied check (after auth is fully loaded)
  if (!user || (role?.toLowerCase() !== 'admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Access Denied</h2>
          <p className="text-sm text-gray-500">Admin access required to view this page</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching config
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading Teams configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Azure AD Configuration Required</p>
                <p className="text-blue-700">To enable MS Teams integration, you need to register an app in Azure AD and configure OAuth. See the setup guide in <code className="bg-blue-100 px-1 rounded">DEPLOYMENT_GUIDE.md</code></p>
              </div>
            </div>
          </div>

          {!config && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Integration Configured</h3>
              <p className="text-sm text-gray-600 mb-4">Set up MS Teams to receive notifications about ticket activity</p>
              <button onClick={() => setConfig({ team_name: '', channel_name: '', enabled: false, notification_rules: { new_tickets: true, status_changes: true, priority_changes: false, new_comments: true, assignments: true } })} className="px-4 h-9 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Configure Teams Integration
              </button>
            </div>
          )}

          {config && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Connection Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Team Name</label>
                    <input type="text" value={config.team_name} onChange={(e) => setConfig({ ...config, team_name: e.target.value })} placeholder="e.g., Support Team" className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">Channel Name</label>
                    <input type="text" value={config.channel_name} onChange={(e) => setConfig({ ...config, channel_name: e.target.value })} placeholder="e.g., Ticket Notifications" className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="enabled" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                    <label htmlFor="enabled" className="text-sm font-medium text-gray-900">Enable notifications</label>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Notification Rules</h3>
                <div className="space-y-3">
                  {Object.entries(config.notification_rules).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input type="checkbox" id={key} checked={value} onChange={(e) => setConfig({ ...config, notification_rules: { ...config.notification_rules, [key]: e.target.checked } })} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                      <label htmlFor={key} className="text-sm text-gray-900 capitalize">{key.replace(/_/g, ' ')}</label>
                    </div>
                  ))}
                </div>
              </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="px-4 h-9 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button onClick={() => setConfig(null)} className="px-4 h-9 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    )}
    </div>
  );
}
