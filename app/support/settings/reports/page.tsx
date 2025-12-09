'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Calendar,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Users,
  TrendingDown,
  Activity,
  CalendarCheck,
  LineChart,
  Loader2,
  X,
  ChevronDown,
  FileText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ScheduledReport {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  schedule_type: string;
  schedule_config: Record<string, any>;
  delivery_method: string;
  recipients: any[];
  teams_webhook_url: string | null;
  format: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  next_run_at: string | null;
  total_runs: number;
  successful_runs: number;
  created_at: string;
}

interface ReportExecution {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  recipients_notified: number;
  error_message: string | null;
  execution_time_ms: number | null;
}

const REPORT_TYPES = [
  { value: 'trial_summary', label: 'Trial Summary', icon: FileText, color: 'blue' },
  { value: 'engagement', label: 'Engagement', icon: Activity, color: 'green' },
  { value: 'pipeline', label: 'Pipeline', icon: BarChart3, color: 'purple' },
  { value: 'at_risk', label: 'At-Risk Trials', icon: TrendingDown, color: 'red' },
  { value: 'activity', label: 'Activity', icon: Activity, color: 'orange' },
  { value: 'follow_ups', label: 'Follow-ups', icon: CalendarCheck, color: 'cyan' },
  { value: 'team_performance', label: 'Team Performance', icon: Users, color: 'indigo' },
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export default function ReportSchedulingPage() {
  const { user, loading: authLoading, signOut, role, is_super_admin } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [viewingHistory, setViewingHistory] = useState<ScheduledReport | null>(null);
  const [historyData, setHistoryData] = useState<ReportExecution[]>([]);
  const [runningReportId, setRunningReportId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role === 'Admin' || is_super_admin)) {
      fetchReports();
    }
  }, [user, role, is_super_admin]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/scheduled');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      setReports(data.reports || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (report: ScheduledReport) => {
    try {
      const response = await fetch(`/api/reports/scheduled/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !report.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle report');
      }

      toast.success(report.is_active ? 'Report paused' : 'Report activated');
      fetchReports();
    } catch (error) {
      console.error('Error toggling report:', error);
      toast.error('Failed to toggle report');
    }
  };

  const handleRunNow = async (report: ScheduledReport) => {
    setRunningReportId(report.id);
    try {
      const response = await fetch(`/api/reports/scheduled/${report.id}/run`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run report');
      }

      if (data.success) {
        toast.success('Report generated and sent successfully');
      } else {
        toast.error(data.error || 'Report generation failed');
      }

      fetchReports();
    } catch (error) {
      console.error('Error running report:', error);
      toast.error('Failed to run report');
    } finally {
      setRunningReportId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/reports/scheduled/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      toast.success('Report schedule deleted');
      setDeleteConfirmId(null);
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const fetchHistory = async (report: ScheduledReport) => {
    setViewingHistory(report);
    try {
      const response = await fetch(`/api/reports/scheduled/${report.id}`);
      const data = await response.json();
      setHistoryData(data.executions || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load execution history');
    }
  };

  const getReportTypeConfig = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type) || REPORT_TYPES[0];
  };

  const getScheduleDescription = (report: ScheduledReport) => {
    const time = report.schedule_config?.time || '09:00';
    switch (report.schedule_type) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        return `Every ${report.schedule_config?.day || 'Monday'} at ${time}`;
      case 'monthly':
        return `Monthly on day ${report.schedule_config?.day_of_month || 1} at ${time}`;
      default:
        return 'Custom schedule';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user || (role !== 'Admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-sm text-gray-500">Unauthorized - Admin access required</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Scheduled Reports
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Automate report generation and delivery to Teams
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Active Schedules</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.activeReports || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Last 24h Runs</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.last24hExecutions?.total || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Successful</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {stats.last24hExecutions?.success || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Failed</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {stats.last24hExecutions?.failed || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Report Schedules
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  {reports.length} schedule{reports.length !== 1 ? 's' : ''} configured
                </p>
              </div>
              <button
                onClick={fetchReports}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Loading schedules...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No scheduled reports yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Create your first scheduled report to automate delivery
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Create Schedule
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {reports.map((report) => {
                const typeConfig = getReportTypeConfig(report.report_type);
                const Icon = typeConfig.icon;
                const isRunning = runningReportId === report.id;

                return (
                  <div
                    key={report.id}
                    className="p-5 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Toggle & Icon */}
                        <button
                          onClick={() => handleToggle(report)}
                          className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            report.is_active
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                          }`}
                        >
                          {report.is_active ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )}
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                              {report.name}
                            </h4>
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full bg-${typeConfig.color}-100 text-${typeConfig.color}-700 dark:bg-${typeConfig.color}-900/30 dark:text-${typeConfig.color}-400`}>
                              {typeConfig.label}
                            </span>
                          </div>

                          {report.description && (
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                              {report.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {getScheduleDescription(report)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Send className="w-3.5 h-3.5" />
                              {report.delivery_method === 'teams' ? 'Teams' : report.delivery_method}
                            </span>
                            {report.next_run_at && (
                              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                Next: {formatDistanceToNow(new Date(report.next_run_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-3 mt-3">
                            {report.last_run_at ? (
                              <div className="flex items-center gap-2">
                                {report.last_run_status === 'success' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : report.last_run_status === 'failed' ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                  Last run {formatDistanceToNow(new Date(report.last_run_at), { addSuffix: true })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-slate-500">
                                Never run
                              </span>
                            )}
                            {report.total_runs > 0 && (
                              <span className="text-xs text-gray-400 dark:text-slate-500">
                                {report.successful_runs}/{report.total_runs} successful
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRunNow(report)}
                          disabled={isRunning}
                          className="h-9 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isRunning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          Run Now
                        </button>
                        <button
                          onClick={() => fetchHistory(report)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="View History"
                        >
                          <LineChart className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingReport(report)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(report.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingReport) && (
        <ReportModal
          report={editingReport}
          onClose={() => {
            setShowCreateModal(false);
            setEditingReport(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingReport(null);
            fetchReports();
          }}
        />
      )}

      {/* History Modal */}
      {viewingHistory && (
        <HistoryModal
          report={viewingHistory}
          executions={historyData}
          onClose={() => {
            setViewingHistory(null);
            setHistoryData([]);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                Delete Report Schedule?
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
                This will permanently delete this scheduled report and its execution history.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 h-10 px-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Report Create/Edit Modal
interface ReportModalProps {
  report: ScheduledReport | null;
  onClose: () => void;
  onSave: () => void;
}

function ReportModal({ report, onClose, onSave }: ReportModalProps) {
  const isEdit = !!report;
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: report?.name || '',
    description: report?.description || '',
    report_type: report?.report_type || 'trial_summary',
    schedule_type: report?.schedule_type || 'weekly',
    schedule_config: report?.schedule_config || { day: 'monday', time: '09:00' },
    delivery_method: report?.delivery_method || 'teams',
    teams_webhook_url: report?.teams_webhook_url || '',
    format: report?.format || 'adaptive_card',
    max_items: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (formData.delivery_method === 'teams' && !formData.teams_webhook_url) {
      toast.error('Teams webhook URL is required');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/reports/scheduled/${report.id}` : '/api/reports/scheduled';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save report');
      }

      toast.success(isEdit ? 'Report updated' : 'Report schedule created');
      onSave();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Report Schedule' : 'New Report Schedule'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Schedule Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weekly At-Risk Report"
              className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this report"
              className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REPORT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.report_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, report_type: type.value })}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'}`}>
                      {type.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Frequency
              </label>
              <select
                value={formData.schedule_type}
                onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {SCHEDULE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {formData.schedule_type === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Day of Week
                </label>
                <select
                  value={formData.schedule_config.day || 'monday'}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule_config: { ...formData.schedule_config, day: e.target.value }
                  })}
                  className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.schedule_type === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Day of Month
                </label>
                <select
                  value={formData.schedule_config.day_of_month || 1}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule_config: { ...formData.schedule_config, day_of_month: parseInt(e.target.value) }
                  })}
                  className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Time
            </label>
            <input
              type="time"
              value={formData.schedule_config.time || '09:00'}
              onChange={(e) => setFormData({
                ...formData,
                schedule_config: { ...formData.schedule_config, time: e.target.value }
              })}
              className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Teams Webhook */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Teams Webhook URL *
            </label>
            <input
              type="url"
              value={formData.teams_webhook_url}
              onChange={(e) => setFormData({ ...formData, teams_webhook_url: e.target.value })}
              placeholder="https://..."
              className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
              Create an Incoming Webhook connector in your Teams channel
            </p>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// History Modal
interface HistoryModalProps {
  report: ScheduledReport;
  executions: ReportExecution[];
  onClose: () => void;
}

function HistoryModal({ report, executions, onClose }: HistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Execution History
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{report.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {executions.length === 0 ? (
            <div className="text-center py-8">
              <LineChart className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">No executions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((exec) => (
                <div
                  key={exec.id}
                  className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {exec.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : exec.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white capitalize">
                          {exec.status}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {format(new Date(exec.started_at), 'PPp')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {exec.execution_time_ms && (
                        <div className="text-gray-500 dark:text-slate-400">
                          {(exec.execution_time_ms / 1000).toFixed(2)}s
                        </div>
                      )}
                      {exec.recipients_notified > 0 && (
                        <div className="text-green-600 dark:text-green-400 text-xs">
                          {exec.recipients_notified} notified
                        </div>
                      )}
                    </div>
                  </div>
                  {exec.error_message && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                      {exec.error_message}
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
