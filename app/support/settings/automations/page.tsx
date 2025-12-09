'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Edit2,
  Trash2,
  Zap,
  Play,
  Pause,
  ChevronRight,
  Clock,
  Filter,
  Bell,
  Mail,
  MessageSquare,
  Pencil,
  Ticket,
  Calendar,
  UserPlus,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Copy,
  Building,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type {
  AutomationRule,
  AutomationEntityType,
  ConditionGroup,
  AutomationAction,
  ActionType,
} from '@/lib/automation/types';
import {
  ENTITY_TYPE_LABELS,
  TRIGGER_EVENT_LABELS,
  ACTION_TYPE_LABELS,
} from '@/lib/automation/types';

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  send_notification: <Bell className="w-4 h-4" />,
  send_email: <Mail className="w-4 h-4" />,
  send_teams_message: <MessageSquare className="w-4 h-4" />,
  update_field: <Pencil className="w-4 h-4" />,
  create_ticket: <Ticket className="w-4 h-4" />,
  add_timeline_event: <Calendar className="w-4 h-4" />,
  assign_user: <UserPlus className="w-4 h-4" />,
};

const ENTITY_TYPE_ICONS: Record<AutomationEntityType, React.ReactNode> = {
  trial_organizations: <Building className="w-4 h-4" />,
  trial_users: <Users className="w-4 h-4" />,
  tickets: <Ticket className="w-4 h-4" />,
};

const ENTITY_TYPE_COLORS: Record<AutomationEntityType, string> = {
  trial_organizations: 'from-blue-500 to-indigo-600',
  trial_users: 'from-green-500 to-emerald-600',
  tickets: 'from-orange-500 to-red-600',
};

type TabValue = 'all' | 'active' | 'inactive';

export default function AutomationsPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<AutomationEntityType | ''>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading && (role === 'Admin' || is_super_admin)) {
      fetchRules();
    }
  }, [user, authLoading, role, is_super_admin]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/automation/rules');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rules');
      }

      setRules(data.data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    let result = [...rules];

    // Tab filter (active/inactive)
    if (activeTab === 'active') {
      result = result.filter(r => r.is_active);
    } else if (activeTab === 'inactive') {
      result = result.filter(r => !r.is_active);
    }

    // Entity type filter
    if (entityFilter) {
      result = result.filter(r => r.entity_type === entityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [rules, activeTab, entityFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const activeCount = rules.filter(r => r.is_active).length;
    const totalExecutions = rules.reduce((sum, r) => sum + (r.execution_count || 0), 0);
    const scheduledCount = rules.filter(r => r.trigger_type === 'schedule').length;
    return {
      total: rules.length,
      active: activeCount,
      inactive: rules.length - activeCount,
      executions: totalExecutions,
      scheduled: scheduledCount,
    };
  }, [rules]);

  const handleToggle = async (rule: AutomationRule) => {
    try {
      const response = await fetch(`/api/automation/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle rule');
      }

      toast.success(rule.is_active ? 'Rule paused' : 'Rule activated');
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to toggle');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/automation/rules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete rule');
      }

      toast.success('Automation rule deleted');
      setDeleteConfirmId(null);
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleDuplicate = async (rule: AutomationRule) => {
    // Navigate to new page with rule data pre-filled (via query param or state)
    router.push(`/support/settings/automations/new?duplicate=${rule.id}`);
  };

  const getConditionSummary = (conditions: ConditionGroup): string => {
    if (!conditions.conditions || conditions.conditions.length === 0) {
      return 'No conditions';
    }
    return `${conditions.conditions.length} condition${conditions.conditions.length !== 1 ? 's' : ''}`;
  };

  const getActionSummary = (actions: AutomationAction[]): string => {
    if (!actions || actions.length === 0) {
      return 'No actions';
    }
    const actionTypes = actions.map(a => ACTION_TYPE_LABELS[a.type as ActionType] || a.type);
    if (actionTypes.length <= 2) {
      return actionTypes.join(', ');
    }
    return `${actionTypes.slice(0, 2).join(', ')} +${actionTypes.length - 2}`;
  };

  // FIXED: Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show unauthorized AFTER auth loading completes
  if (!user || (role !== 'Admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Workflow Automations
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Automate repetitive tasks with event-driven rules
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRules}
              className="h-11 px-5 border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => router.push('/support/settings/automations/new')}
              className="h-11 px-6 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Automation
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Rules</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Scheduled</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.scheduled}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Executions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.executions.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                All
                {stats.total > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                    {stats.total}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'active'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                Active
                {stats.active > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                    {stats.active}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('inactive')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'inactive'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                Inactive
                {stats.inactive > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-slate-500 text-gray-700 dark:text-slate-200 rounded-full">
                    {stats.inactive}
                  </span>
                )}
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search automations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 h-10 pl-10 pr-4 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value as AutomationEntityType | '')}
                className="h-10 pl-3 pr-8 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Entities</option>
                <option value="trial_organizations">Organizations</option>
                <option value="trial_users">Users</option>
                <option value="tickets">Tickets</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rules Grid */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading automations...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Zap className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || entityFilter ? 'No automations match your filters' : 'No automation rules yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {searchQuery || entityFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Create automated workflows to streamline your processes'}
            </p>
            {!searchQuery && !entityFilter && (
              <button
                onClick={() => router.push('/support/settings/automations/new')}
                className="h-11 px-6 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/30"
              >
                Create Your First Automation
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 transition-all hover:shadow-lg"
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ENTITY_TYPE_COLORS[rule.entity_type]} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <span className="text-white">{ENTITY_TYPE_ICONS[rule.entity_type]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {rule.name}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                            rule.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                          }`}>
                            {rule.is_active ? (
                              <>
                                <Play className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3" />
                                Paused
                              </>
                            )}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        rule.is_active
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-slate-600'
                      }`}
                      title={rule.is_active ? 'Pause rule' : 'Activate rule'}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          rule.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Workflow Flow */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 flex-wrap">
                    {/* Trigger */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full font-medium">
                      {rule.trigger_type === 'event' ? (
                        <>
                          <Zap className="w-3 h-3" />
                          {rule.trigger_event ? TRIGGER_EVENT_LABELS[rule.trigger_event] : 'Event'}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          Scheduled
                        </>
                      )}
                    </span>

                    <ChevronRight className="w-4 h-4 text-gray-400" />

                    {/* Conditions */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      <Filter className="w-3 h-3" />
                      {getConditionSummary(rule.conditions as ConditionGroup)}
                    </span>

                    <ChevronRight className="w-4 h-4 text-gray-400" />

                    {/* Actions */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                      {(rule.actions as AutomationAction[])?.slice(0, 2).map((action, i) => (
                        <span key={i} className="opacity-80">
                          {ACTION_ICONS[action.type as ActionType]}
                        </span>
                      ))}
                      {getActionSummary(rule.actions as AutomationAction[])}
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      {ENTITY_TYPE_ICONS[rule.entity_type]}
                      {ENTITY_TYPE_LABELS[rule.entity_type]}
                    </span>
                    {rule.execution_count > 0 && (
                      <span>
                        {rule.execution_count} execution{rule.execution_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {rule.last_executed_at && (
                      <span>
                        Last: {formatDistanceToNow(new Date(rule.last_executed_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(rule)}
                      className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/support/settings/automations/${rule.id}`)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(rule.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Automation Rule?
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                This will permanently delete this automation rule and all its execution history. This action cannot be undone.
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
                  Delete Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
