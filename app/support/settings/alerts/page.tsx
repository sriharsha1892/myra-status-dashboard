'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Zap,
  TrendingDown,
  Calendar,
  Activity,
  Heart,
  Settings,
  RefreshCw,
  Eye,
  Search,
  Copy,
  Send,
  Filter,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

interface AlertConfig {
  id: string;
  name: string;
  description: string | null;
  alert_type: string;
  trigger_config: Record<string, any>;
  notification_channels: string[];
  recipients: any[];
  teams_webhook_url: string | null;
  message_template: string | null;
  severity: string;
  cooldown_minutes: number;
  max_alerts_per_day: number;
  is_active: boolean;
  last_triggered_at: string | null;
  total_alerts_sent: number;
  created_at: string;
}

interface AlertHistoryItem {
  id: string;
  entity_type: string;
  entity_id: string;
  trigger_reason: string;
  notification_sent: boolean;
  notification_error: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const ALERT_TYPES = [
  { value: 'trial_expiring', label: 'Trial Expiring', icon: Calendar, description: 'Alert when trials are about to expire', color: 'from-orange-500 to-amber-500' },
  { value: 'no_activity', label: 'No Activity', icon: Activity, description: 'Alert when there\'s no activity for X days', color: 'from-yellow-500 to-orange-500' },
  { value: 'engagement_drop', label: 'Engagement Drop', icon: TrendingDown, description: 'Alert when engagement score drops significantly', color: 'from-red-500 to-pink-500' },
  { value: 'at_risk', label: 'At Risk', icon: AlertTriangle, description: 'Alert when deal momentum becomes at-risk', color: 'from-red-600 to-rose-600' },
  { value: 'follow_up_overdue', label: 'Follow-up Overdue', icon: Clock, description: 'Alert when follow-ups are overdue', color: 'from-purple-500 to-violet-500' },
  { value: 'stage_change', label: 'Stage Change', icon: Zap, description: 'Alert on specific stage transitions', color: 'from-blue-500 to-indigo-500' },
  { value: 'health_critical', label: 'Health Critical', icon: Heart, description: 'Alert when health status becomes critical', color: 'from-rose-500 to-red-600' },
];

const SEVERITY_CONFIG = {
  low: { label: 'Low', bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  medium: { label: 'Medium', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  high: { label: 'High', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  critical: { label: 'Critical', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

type TabValue = 'all' | 'active' | 'inactive';

export default function AlertsSettingsPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();

  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Filter states
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertConfig | null>(null);
  const [viewingHistory, setViewingHistory] = useState<AlertConfig | null>(null);
  const [historyData, setHistoryData] = useState<AlertHistoryItem[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // FIXED: Proper auth loading check - wait for auth to complete before checking role
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading && (role === 'Admin' || is_super_admin)) {
      fetchAlerts();
    }
  }, [user, authLoading, role, is_super_admin]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch alerts');
      }

      setAlerts(data.alerts || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load alert configurations');
    } finally {
      setLoading(false);
    }
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // Tab filter
    if (activeTab === 'active') {
      result = result.filter(a => a.is_active);
    } else if (activeTab === 'inactive') {
      result = result.filter(a => !a.is_active);
    }

    // Type filter
    if (typeFilter) {
      result = result.filter(a => a.alert_type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.alert_type.toLowerCase().includes(query)
      );
    }

    return result;
  }, [alerts, activeTab, typeFilter, searchQuery]);

  const handleToggle = async (alert: AlertConfig) => {
    try {
      const response = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !alert.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle alert');
      }

      toast.success(alert.is_active ? 'Alert paused' : 'Alert activated');
      fetchAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Failed to toggle alert');
    }
  };

  const handleDuplicate = async (alert: AlertConfig) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${alert.name} (Copy)`,
          description: alert.description,
          alert_type: alert.alert_type,
          trigger_config: alert.trigger_config,
          notification_channels: alert.notification_channels,
          teams_webhook_url: alert.teams_webhook_url,
          severity: alert.severity,
          cooldown_minutes: alert.cooldown_minutes,
          max_alerts_per_day: alert.max_alerts_per_day,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate alert');
      }

      toast.success('Alert duplicated');
      fetchAlerts();
    } catch (error) {
      console.error('Error duplicating alert:', error);
      toast.error('Failed to duplicate alert');
    }
  };

  const handleEvaluateAll = async () => {
    setEvaluating(true);
    try {
      const response = await fetch('/api/alerts/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate alerts');
      }

      toast.success(`Evaluated ${data.evaluated} alerts, ${data.triggered} triggered`);
      fetchAlerts();
    } catch (error) {
      console.error('Error evaluating alerts:', error);
      toast.error('Failed to evaluate alerts');
    } finally {
      setEvaluating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete alert');
      }

      toast.success('Alert deleted');
      setDeleteConfirmId(null);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  const fetchHistory = async (alert: AlertConfig) => {
    setViewingHistory(alert);
    try {
      const response = await fetch(`/api/alerts/${alert.id}`);
      const data = await response.json();
      setHistoryData(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load alert history');
    }
  };

  const getAlertTypeConfig = (type: string) => {
    return ALERT_TYPES.find(t => t.value === type) || ALERT_TYPES[0];
  };

  const getTriggerDescription = (alert: AlertConfig) => {
    const config = alert.trigger_config;
    switch (alert.alert_type) {
      case 'trial_expiring':
        return `${config.days_before || 7} days before expiry`;
      case 'no_activity':
        return `No activity for ${config.days || 7} days`;
      case 'engagement_drop':
        return `Score drops below ${config.threshold || 30}%`;
      case 'stage_change':
        return `Stage changes to "${config.to || 'any'}"`;
      case 'follow_up_overdue':
        return `Overdue by ${config.days || 1}+ days`;
      case 'health_critical':
        return 'Health status is critical';
      case 'at_risk':
        return 'Deal momentum at risk';
      default:
        return 'Custom trigger';
    }
  };

  // FIXED: Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-orange-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show unauthorized AFTER auth loading completes
  if (!user || (role !== 'Admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-orange-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
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

  const activeAlertsCount = alerts.filter(a => a.is_active).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.is_active).length;
  const totalSent = alerts.reduce((sum, a) => sum + a.total_alerts_sent, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-orange-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/30">
              <Bell className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Automated Alerts
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Stay ahead with proactive notifications for critical events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEvaluateAll}
              disabled={evaluating}
              className="h-11 px-5 border-2 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {evaluating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Run Evaluation
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-11 px-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Alert
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Alerts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {activeAlertsCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Bell className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Triggered (24h)</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.last24hTriggers || 0}
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
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Critical Active</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {criticalCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Sent</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalSent}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Send className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl">
              {(['all', 'active', 'inactive'] as TabValue[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'active' ? 'Active' : 'Inactive'}
                  {tab === 'active' && activeAlertsCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      {activeAlertsCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 h-10 pl-10 pr-4 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="relative">
                <select
                  value={typeFilter || ''}
                  onChange={(e) => setTypeFilter(e.target.value || null)}
                  className="h-10 pl-3 pr-8 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Types</option>
                  {ALERT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={fetchAlerts}
                className="h-10 w-10 flex items-center justify-center border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Alerts Grid */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Bell className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || typeFilter ? 'No alerts match your filters' : 'No alerts configured'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {searchQuery || typeFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Set up alerts to get proactively notified about important events like expiring trials or at-risk deals'}
            </p>
            {!searchQuery && !typeFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-11 px-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/30"
              >
                Create Your First Alert
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAlerts.map((alert) => {
              const typeConfig = getAlertTypeConfig(alert.alert_type);
              const Icon = typeConfig.icon;
              const severityConfig = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;

              return (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    alert.is_active
                      ? 'border-gray-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800'
                      : 'border-gray-100 dark:border-slate-700 opacity-60'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                              {alert.name}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${severityConfig.bg} ${severityConfig.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${severityConfig.dot}`}></span>
                              {severityConfig.label}
                            </span>
                          </div>
                          {alert.description && (
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {alert.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggle(alert)}
                        className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${
                          alert.is_active
                            ? 'bg-gradient-to-r from-orange-500 to-red-500'
                            : 'bg-gray-200 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                            alert.is_active ? 'translate-x-7' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Trigger Info */}
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        <span className="font-medium text-gray-700 dark:text-slate-300">Trigger:</span>
                        {getTriggerDescription(alert)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {alert.cooldown_minutes}min cooldown
                      </span>
                      <span className="flex items-center gap-1.5">
                        Max {alert.max_alerts_per_day}/day
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      {alert.last_triggered_at ? (
                        <span className="text-gray-500 dark:text-slate-400">
                          Last: {formatDistanceToNow(new Date(alert.last_triggered_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500">Never triggered</span>
                      )}
                      {alert.total_alerts_sent > 0 && (
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {alert.total_alerts_sent} sent
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => fetchHistory(alert)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(alert)}
                        className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingAlert(alert)}
                        className="p-2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(alert.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAlert) && (
        <AlertModal
          alert={editingAlert}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAlert(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingAlert(null);
            fetchAlerts();
          }}
        />
      )}

      {/* History Modal */}
      {viewingHistory && (
        <AlertHistoryModal
          alert={viewingHistory}
          history={historyData}
          onClose={() => {
            setViewingHistory(null);
            setHistoryData([]);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Alert?
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                This will permanently delete this alert configuration and all its history. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 h-11 px-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 h-11 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Delete Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Alert Create/Edit Modal - Redesigned with sections
interface AlertModalProps {
  alert: AlertConfig | null;
  onClose: () => void;
  onSave: () => void;
}

function AlertModal({ alert, onClose, onSave }: AlertModalProps) {
  const isEdit = !!alert;
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState(alert?.alert_type || '');

  const [formData, setFormData] = useState({
    name: alert?.name || '',
    description: alert?.description || '',
    alert_type: alert?.alert_type || '',
    trigger_config: alert?.trigger_config || {},
    teams_webhook_url: alert?.teams_webhook_url || '',
    severity: alert?.severity || 'medium',
    cooldown_minutes: alert?.cooldown_minutes || 60,
    max_alerts_per_day: alert?.max_alerts_per_day || 10,
  });

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    let defaultConfig: Record<string, any> = {};

    switch (type) {
      case 'trial_expiring':
        defaultConfig = { days_before: 7 };
        break;
      case 'no_activity':
        defaultConfig = { days: 7 };
        break;
      case 'engagement_drop':
        defaultConfig = { threshold: 30 };
        break;
      case 'stage_change':
        defaultConfig = { to: 'at_risk' };
        break;
      case 'follow_up_overdue':
        defaultConfig = { days: 1 };
        break;
      case 'at_risk':
      case 'health_critical':
        defaultConfig = {};
        break;
    }

    setFormData({ ...formData, alert_type: type, trigger_config: defaultConfig });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Alert name is required');
      return;
    }

    if (!formData.alert_type) {
      toast.error('Please select an alert type');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/alerts/${alert.id}` : '/api/alerts';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save alert');
      }

      toast.success(isEdit ? 'Alert updated successfully' : 'Alert created successfully');
      onSave();
    } catch (error) {
      console.error('Error saving alert:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Alert' : 'Create New Alert'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Configure when and how you want to be notified
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Section 1: Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Alert Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Trial Expiring Soon, At-Risk Deal Alert"
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Briefly describe what this alert monitors and why it's important"
                    rows={2}
                    className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Alert Type */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                Alert Type <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALERT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeSelect(type.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg shadow-orange-500/10'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isSelected ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-slate-300'}`}>
                            {type.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                            {type.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Trigger Configuration */}
            {selectedType && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Trigger Conditions
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600">
                  {selectedType === 'trial_expiring' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-700 dark:text-slate-300">Trigger alert when trial expires in</span>
                      <input
                        type="number"
                        value={formData.trigger_config.days_before || 7}
                        onChange={(e) => setFormData({
                          ...formData,
                          trigger_config: { ...formData.trigger_config, days_before: parseInt(e.target.value) }
                        })}
                        min="1"
                        max="90"
                        className="w-20 h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-center font-semibold"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">days or less</span>
                    </div>
                  )}
                  {selectedType === 'no_activity' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-700 dark:text-slate-300">Trigger alert when there&apos;s no activity for</span>
                      <input
                        type="number"
                        value={formData.trigger_config.days || 7}
                        onChange={(e) => setFormData({
                          ...formData,
                          trigger_config: { ...formData.trigger_config, days: parseInt(e.target.value) }
                        })}
                        min="1"
                        max="90"
                        className="w-20 h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-center font-semibold"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">days or more</span>
                    </div>
                  )}
                  {selectedType === 'engagement_drop' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-700 dark:text-slate-300">Trigger alert when engagement score drops below</span>
                      <input
                        type="number"
                        value={formData.trigger_config.threshold || 30}
                        onChange={(e) => setFormData({
                          ...formData,
                          trigger_config: { ...formData.trigger_config, threshold: parseInt(e.target.value) }
                        })}
                        min="0"
                        max="100"
                        className="w-20 h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-center font-semibold"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">%</span>
                    </div>
                  )}
                  {selectedType === 'follow_up_overdue' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-700 dark:text-slate-300">Trigger alert when follow-up is overdue by</span>
                      <input
                        type="number"
                        value={formData.trigger_config.days || 1}
                        onChange={(e) => setFormData({
                          ...formData,
                          trigger_config: { ...formData.trigger_config, days: parseInt(e.target.value) }
                        })}
                        min="1"
                        max="30"
                        className="w-20 h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-center font-semibold"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">days or more</span>
                    </div>
                  )}
                  {selectedType === 'stage_change' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-700 dark:text-slate-300">Trigger alert when stage changes to</span>
                      <select
                        value={formData.trigger_config.to || 'at_risk'}
                        onChange={(e) => setFormData({
                          ...formData,
                          trigger_config: { ...formData.trigger_config, to: e.target.value }
                        })}
                        className="h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold"
                      >
                        <option value="at_risk">At Risk</option>
                        <option value="churned">Churned</option>
                        <option value="trial_expired">Trial Expired</option>
                        <option value="converted_paying">Converted (Paying)</option>
                      </select>
                    </div>
                  )}
                  {(selectedType === 'at_risk' || selectedType === 'health_critical') && (
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      This alert triggers automatically when the condition is detected. No additional configuration needed.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Section 4: Notification Settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                Notification Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Severity Level
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high', 'critical'] as const).map((sev) => {
                      const config = SEVERITY_CONFIG[sev];
                      const isSelected = formData.severity === sev;
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setFormData({ ...formData, severity: sev })}
                          className={`flex-1 h-11 px-3 text-sm font-medium rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                              : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Teams Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.teams_webhook_url}
                    onChange={(e) => setFormData({ ...formData, teams_webhook_url: e.target.value })}
                    placeholder="https://outlook.office.com/webhook/..."
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                    Leave empty to use the default Teams channel
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5: Rate Limits */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                Rate Limits
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Cooldown Period
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.cooldown_minutes}
                      onChange={(e) => setFormData({ ...formData, cooldown_minutes: parseInt(e.target.value) })}
                      min="5"
                      max="1440"
                      className="flex-1 h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">minutes</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                    Wait time between repeated alerts for the same entity
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Daily Limit
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.max_alerts_per_day}
                      onChange={(e) => setFormData({ ...formData, max_alerts_per_day: parseInt(e.target.value) })}
                      min="1"
                      max="100"
                      className="flex-1 h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">per day</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                    Maximum alerts this rule can send per day
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0 bg-gray-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.name || !formData.alert_type}
            className="h-11 px-8 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Alert History Modal
interface AlertHistoryModalProps {
  alert: AlertConfig;
  history: AlertHistoryItem[];
  onClose: () => void;
}

function AlertHistoryModal({ alert, history, onClose }: AlertHistoryModalProps) {
  const typeConfig = ALERT_TYPES.find(t => t.value === alert.alert_type) || ALERT_TYPES[0];
  const Icon = typeConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Alert History
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">{alert.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No history yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                This alert hasn&apos;t been triggered yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {item.notification_sent ? (
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.trigger_reason}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                          <span>Entity: {item.entity_id.slice(0, 8)}...</span>
                          <span>{format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                    {item.acknowledged_at && (
                      <span className="px-2.5 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">
                        Acknowledged
                      </span>
                    )}
                  </div>
                  {item.notification_error && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                      <span className="font-medium">Error:</span> {item.notification_error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
