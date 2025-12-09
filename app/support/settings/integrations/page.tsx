'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Plug,
  MessageSquare,
  Mail,
  Calendar,
  Hash,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Settings,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Zap,
  Bell,
  ArrowRight,
  Webhook,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'available' | 'coming_soon';
  category: 'communication' | 'productivity' | 'automation';
  features: string[];
  color: string;
  gradient: string;
  configUrl?: string;
  lastSync?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Send notifications, reports, and alerts to Teams channels',
    icon: <MessageSquare className="w-6 h-6" />,
    status: 'connected',
    category: 'communication',
    features: ['Notifications', 'Report Cards', 'Alert Channels', 'Interactive Actions'],
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-600',
    configUrl: '/support/settings/teams',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect Slack workspaces for team notifications',
    icon: <Hash className="w-6 h-6" />,
    status: 'coming_soon',
    category: 'communication',
    features: ['Channel Notifications', 'Slash Commands', 'Bot Mentions'],
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'email',
    name: 'Email / SMTP',
    description: 'Send automated emails and report deliveries',
    icon: <Mail className="w-6 h-6" />,
    status: 'coming_soon',
    category: 'communication',
    features: ['Report Delivery', 'Alert Emails', 'Custom Templates'],
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    id: 'calendar',
    name: 'Calendar Sync',
    description: 'Sync follow-ups and meetings with your calendar',
    icon: <Calendar className="w-6 h-6" />,
    status: 'coming_soon',
    category: 'productivity',
    features: ['Follow-up Reminders', 'Meeting Detection', 'Auto-scheduling'],
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Trigger external services with custom webhooks',
    icon: <Webhook className="w-6 h-6" />,
    status: 'available',
    category: 'automation',
    features: ['Custom Endpoints', 'Event Triggers', 'JSON Payloads'],
    color: 'text-gray-600',
    gradient: 'from-gray-500 to-slate-600',
    configUrl: '/support/settings/webhooks',
  },
];

type TabValue = 'all' | 'connected' | 'available';

export default function IntegrationsPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [teamsStatus, setTeamsStatus] = useState<{ connected: boolean; lastSync?: string } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading && (role === 'Admin' || is_super_admin)) {
      fetchTeamsStatus();
    }
  }, [user, authLoading, role, is_super_admin]);

  const fetchTeamsStatus = async () => {
    setLoadingStatus(true);
    try {
      // Check if Teams webhook is configured
      const response = await fetch('/api/teams/webhook');
      if (response.ok) {
        const data = await response.json();
        setTeamsStatus({
          connected: !!data.webhookUrl,
          lastSync: data.lastSent,
        });
      } else {
        setTeamsStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error fetching Teams status:', error);
      setTeamsStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  // Process integrations with actual status
  const processedIntegrations = useMemo(() => {
    return INTEGRATIONS.map(integration => {
      if (integration.id === 'teams' && teamsStatus) {
        return {
          ...integration,
          status: teamsStatus.connected ? 'connected' as const : 'available' as const,
          lastSync: teamsStatus.lastSync,
        };
      }
      return integration;
    });
  }, [teamsStatus]);

  // Filtered integrations
  const filteredIntegrations = useMemo(() => {
    if (activeTab === 'all') return processedIntegrations;
    if (activeTab === 'connected') return processedIntegrations.filter(i => i.status === 'connected');
    if (activeTab === 'available') return processedIntegrations.filter(i => i.status === 'available' || i.status === 'coming_soon');
    return processedIntegrations;
  }, [processedIntegrations, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const connected = processedIntegrations.filter(i => i.status === 'connected').length;
    const available = processedIntegrations.filter(i => i.status === 'available').length;
    const comingSoon = processedIntegrations.filter(i => i.status === 'coming_soon').length;
    return { total: processedIntegrations.length, connected, available, comingSoon };
  }, [processedIntegrations]);

  // FIXED: Show loading state while auth is loading OR role not yet loaded
  if (authLoading || (user && role === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-green-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show unauthorized AFTER auth loading completes and role is known
  if (!user || (role?.toLowerCase() !== 'admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-green-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Access Denied</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Admin access required to view this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-green-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/30">
              <Plug className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Integrations
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Connect external services to enhance your workflow
              </p>
            </div>
          </div>
          <button
            onClick={fetchTeamsStatus}
            className="h-11 px-5 border-2 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Plug className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Connected</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.connected}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Available</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.available}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Coming Soon</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.comingSoon}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              All Integrations
            </button>
            <button
              onClick={() => setActiveTab('connected')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'connected'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              Connected
              {stats.connected > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  {stats.connected}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'available'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              Available
            </button>
          </div>
        </div>

        {/* Integrations Grid */}
        {loadingStatus ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading integrations...</p>
          </div>
        ) : filteredIntegrations.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Plug className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No integrations in this category
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Check the other tabs to see all available integrations
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredIntegrations.map((integration) => (
              <div
                key={integration.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  integration.status === 'connected'
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-gray-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <span className="text-white">{integration.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {integration.name}
                          </h3>
                          {integration.status === 'connected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Connected
                            </span>
                          )}
                          {integration.status === 'coming_soon' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                              <Clock className="w-3 h-3" />
                              Coming Soon
                            </span>
                          )}
                          {integration.status === 'available' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              <Zap className="w-3 h-3" />
                              Available
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    {integration.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {integration.status === 'connected' && integration.lastSync && (
                      <span>Last sync: {new Date(integration.lastSync).toLocaleDateString()}</span>
                    )}
                    {integration.status === 'connected' && !integration.lastSync && (
                      <span className="text-green-600 dark:text-green-400">Active</span>
                    )}
                    {integration.status === 'available' && (
                      <span>Ready to connect</span>
                    )}
                    {integration.status === 'coming_soon' && (
                      <span className="text-purple-600 dark:text-purple-400">In development</span>
                    )}
                  </div>

                  {integration.status !== 'coming_soon' && integration.configUrl && (
                    <button
                      onClick={() => router.push(integration.configUrl!)}
                      className={`h-9 px-4 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                        integration.status === 'connected'
                          ? 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30'
                      }`}
                    >
                      {integration.status === 'connected' ? (
                        <>
                          <Settings className="w-4 h-4" />
                          Configure
                        </>
                      ) : (
                        <>
                          Connect
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}

                  {integration.status === 'coming_soon' && (
                    <button
                      disabled
                      className="h-9 px-4 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Notify Me
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Plug className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Need a different integration?
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                We&apos;re always looking to add new integrations. Contact us at{' '}
                <a href="mailto:support@myra.ai" className="text-green-600 dark:text-green-400 hover:underline">
                  support@myra.ai
                </a>{' '}
                to request a specific integration for your workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
