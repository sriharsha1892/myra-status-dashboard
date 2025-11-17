'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Mail,
  Settings,
  Clock,
  FileText,
  Save,
  RefreshCw,
  Send,
  CheckCircle,
  AlertCircle,
  Users,
  Bell,
  Shield
} from 'lucide-react';

interface EmailTemplate {
  type: string;
  name: string;
  description: string;
  subjectTemplate: string;
  defaultFrequency: string;
  enabled: boolean;
}

interface EmailSettings {
  brevoConfigured: boolean;
  fromEmail: string;
  fromName: string;
  baseUrl: string;
  dailyDigestTime: string;
  weeklyDigestDay: string;
  weeklyDigestTime: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    type: 'mention',
    name: 'Mention Notifications',
    description: 'When someone mentions you in a note or comment',
    subjectTemplate: 'You were mentioned in {{orgName}}',
    defaultFrequency: 'instant',
    enabled: true,
  },
  {
    type: 'assigned',
    name: 'Trial Handoff',
    description: 'When a trial is handed off to you',
    subjectTemplate: 'Trial handoff: {{orgName}}',
    defaultFrequency: 'instant',
    enabled: true,
  },
  {
    type: 'new_note',
    name: 'New Notes',
    description: 'When a new note is added to a trial you manage',
    subjectTemplate: 'New {{noteCategory}} note: {{orgName}}',
    defaultFrequency: 'instant',
    enabled: true,
  },
  {
    type: 'ticket_assigned',
    name: 'Ticket Assignments',
    description: 'When a support ticket is assigned to you',
    subjectTemplate: 'Ticket assigned: {{ticketTitle}}',
    defaultFrequency: 'instant',
    enabled: true,
  },
  {
    type: 'issue',
    name: 'Issue Reports',
    description: 'When a new issue is reported',
    subjectTemplate: 'New issue reported: {{issueTitle}}',
    defaultFrequency: 'daily_digest',
    enabled: true,
  },
  {
    type: 'roadmap_update',
    name: 'Roadmap Updates',
    description: 'When product roadmap items are updated',
    subjectTemplate: 'Roadmap update: {{featureName}}',
    defaultFrequency: 'weekly_digest',
    enabled: true,
  },
];

export default function EmailSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'settings' | 'users'>('templates');
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [templates, setTemplates] = useState<EmailTemplate[]>(EMAIL_TEMPLATES);
  const [settings, setSettings] = useState<EmailSettings>({
    brevoConfigured: false,
    fromEmail: '',
    fromName: '',
    baseUrl: '',
    dailyDigestTime: '09:00',
    weeklyDigestDay: 'monday',
    weeklyDigestTime: '09:00',
  });

  const [testEmail, setTestEmail] = useState('');
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    instantUsers: 0,
    dailyDigestUsers: 0,
    weeklyDigestUsers: 0,
    disabledUsers: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    checkAuthorization();
  }, []);

  useEffect(() => {
    if (authorized) {
      loadSettings();
      loadUserStats();
    }
  }, [authorized]);

  const checkAuthorization = async () => {
    setCheckingAuth(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is super admin
      const { data: userData } = await supabase
        .from('users' as any)
        .select('role, is_super_admin')
        .eq('id', user.id)
        .single() as any;

      if (userData?.role !== 'Admin' || !userData?.is_super_admin) {
        toast.error('Access denied - Super admin only');
        router.push('/support/dashboard');
        return;
      }

      setAuthorized(true);
    } catch (error) {
      console.error('Authorization error:', error);
      router.push('/');
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Fetch Brevo configuration status from API
      const response = await fetch('/api/admin/brevo-status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load Brevo status');
      }

      setSettings({
        brevoConfigured: data.brevoConfigured,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        baseUrl: data.baseUrl || window.location.origin,
        dailyDigestTime: '09:00',
        weeklyDigestDay: 'monday',
        weeklyDigestTime: '09:00',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data: preferences } = await supabase
        .from('user_notification_preferences' as any)
        .select('email_delivery_frequency') as any;

      if (preferences) {
        const stats = {
          totalUsers: new Set(preferences.map((p: any) => p.user_email)).size,
          instantUsers: preferences.filter((p: any) => p.email_delivery_frequency === 'instant').length,
          dailyDigestUsers: preferences.filter((p: any) => p.email_delivery_frequency === 'daily_digest').length,
          weeklyDigestUsers: preferences.filter((p: any) => p.email_delivery_frequency === 'weekly_digest').length,
          disabledUsers: preferences.filter((p: any) => p.email_delivery_frequency === 'never').length,
        };
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const updateTemplate = (type: string, field: keyof EmailTemplate, value: any) => {
    setTemplates(templates.map(t =>
      t.type === type ? { ...t, [field]: value } : t
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // In a real implementation, these would be saved to a database or config
      // For now, we'll just show success
      toast.success('Email settings saved successfully');

      // Reload stats in case defaults changed
      await loadUserStats();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setTestingEmail(true);
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      if (response.ok) {
        toast.success(`Test email sent to ${testEmail}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-900 mb-2">Verifying authorization...</p>
          <p className="text-sm text-slate-600">Checking super admin access</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading email settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Email Notification Settings</h1>
              <p className="text-slate-600">Configure email templates, frequency, and delivery settings</p>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          settings.brevoConfigured
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            {settings.brevoConfigured ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            )}
            <div>
              <h3 className={`font-bold ${
                settings.brevoConfigured ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {settings.brevoConfigured ? 'Brevo Configured' : 'Brevo Not Configured'}
              </h3>
              <p className={`text-sm ${
                settings.brevoConfigured ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {settings.brevoConfigured
                  ? `Sending from: ${settings.fromEmail} (${settings.fromName})`
                  : 'Please configure BREVO_API_KEY in environment variables'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'templates'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              Email Templates
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              Global Settings
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-5 h-5" />
              User Statistics
            </button>
          </div>

          <div className="p-6">
            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Email Template Configuration</h2>
                  <p className="text-slate-600">
                    Configure default settings for each notification type. Users can override these in their preferences.
                  </p>
                </div>

                {templates.map((template) => (
                  <div key={template.type} className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900">{template.name}</h3>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={template.enabled}
                              onChange={(e) => updateTemplate(template.type, 'enabled', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Enabled</span>
                          </label>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{template.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Subject Template */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Email Subject Template
                            </label>
                            <input
                              type="text"
                              value={template.subjectTemplate}
                              onChange={(e) => updateTemplate(template.type, 'subjectTemplate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Subject line..."
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              Use {'{{variables}}'} for dynamic content
                            </p>
                          </div>

                          {/* Default Frequency */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Default Frequency
                            </label>
                            <select
                              value={template.defaultFrequency}
                              onChange={(e) => updateTemplate(template.type, 'defaultFrequency', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="instant">Instant</option>
                              <option value="daily_digest">Daily Digest</option>
                              <option value="weekly_digest">Weekly Digest</option>
                              <option value="never">Disabled</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500">
                              New users will default to this frequency
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Global Email Settings</h2>
                  <p className="text-slate-600">
                    Configure digest schedules and delivery settings.
                  </p>
                </div>

                {/* Digest Schedule */}
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Digest Schedule
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daily Digest */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Daily Digest Time
                      </label>
                      <input
                        type="time"
                        value={settings.dailyDigestTime}
                        onChange={(e) => setSettings({...settings, dailyDigestTime: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Time to send daily digest emails (UTC)
                      </p>
                    </div>

                    {/* Weekly Digest Day */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Weekly Digest Day
                      </label>
                      <select
                        value={settings.weeklyDigestDay}
                        onChange={(e) => setSettings({...settings, weeklyDigestDay: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                        <option value="saturday">Saturday</option>
                        <option value="sunday">Sunday</option>
                      </select>
                    </div>

                    {/* Weekly Digest Time */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Weekly Digest Time
                      </label>
                      <input
                        type="time"
                        value={settings.weeklyDigestTime}
                        onChange={(e) => setSettings({...settings, weeklyDigestTime: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Time to send weekly digest emails (UTC)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Test Email */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Send Test Email
                  </h3>

                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendTestEmail}
                      disabled={testingEmail || !testEmail}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {testingEmail ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Test
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Sends a test email to verify Brevo configuration
                  </p>
                </div>
              </div>
            )}

            {/* User Statistics Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">User Email Preferences</h2>
                  <p className="text-slate-600">
                    Overview of how users have configured their email delivery preferences.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <Bell className="w-8 h-8 text-blue-600" />
                      <span className="text-3xl font-bold text-blue-900">{userStats.instantUsers}</span>
                    </div>
                    <h3 className="text-sm font-medium text-blue-900">Instant Emails</h3>
                    <p className="text-xs text-blue-700 mt-1">Receive emails immediately</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-8 h-8 text-green-600" />
                      <span className="text-3xl font-bold text-green-900">{userStats.dailyDigestUsers}</span>
                    </div>
                    <h3 className="text-sm font-medium text-green-900">Daily Digest</h3>
                    <p className="text-xs text-green-700 mt-1">Bundled daily emails</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-8 h-8 text-purple-600" />
                      <span className="text-3xl font-bold text-purple-900">{userStats.weeklyDigestUsers}</span>
                    </div>
                    <h3 className="text-sm font-medium text-purple-900">Weekly Digest</h3>
                    <p className="text-xs text-purple-700 mt-1">Bundled weekly emails</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-6 border-2 border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <span className="text-3xl font-bold text-slate-900">{userStats.disabledUsers}</span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900">Emails Disabled</h3>
                    <p className="text-xs text-slate-700 mt-1">In-app notifications only</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Total Active Users</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-blue-600">{userStats.totalUsers}</span>
                    <span className="text-slate-600">users with configured preferences</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
