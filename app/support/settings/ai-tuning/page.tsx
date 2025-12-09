'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  RefreshCw,
  BarChart3,
  Zap,
  FileText,
  Eye,
  Clock,
  Database,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Award,
  Gauge,
  FlaskConical,
  Lightbulb,
} from 'lucide-react';

interface AccuracyMetric {
  id: string;
  model_name: string;
  action_type: string | null;
  period_start: string;
  period_end: string;
  total_extractions: number;
  correct_extractions: number;
  accuracy_rate: number;
  field_accuracy: Record<string, number>;
  common_errors: Array<{ error_type: string; count: number; examples: any[] }>;
  avg_confidence: number | null;
  confidence_accuracy_correlation: number | null;
}

interface TrainingExample {
  id: string;
  action_type: string;
  category: string | null;
  input_text: string;
  expected_output: any;
  explanation: string | null;
  quality_score: number;
  validation_status: string;
  source: string;
  times_used: number;
  is_active: boolean;
  created_at: string;
}

interface AccuracySummary {
  overall_accuracy: number;
  total_extractions: number;
  correct_extractions: number;
  action_type_breakdown: Record<string, { total: number; correct: number; accuracy: number }>;
  field_accuracy: Record<string, number>;
  top_errors: Array<{ error_type: string; count: number; examples: any[] }>;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  LOG_ACTIVITY: 'Log Activity',
  UPDATE_STAGE: 'Update Stage',
  UPDATE_HEALTH: 'Update Health',
  CREATE_FOLLOW_UP: 'Create Follow-up',
  UPDATE_STAKEHOLDER: 'Update Stakeholder',
  UPDATE_MOMENTUM: 'Update Momentum',
  LOG_COMPETITOR: 'Log Competitor',
  LOG_FEATURE: 'Log Feature',
};

const CATEGORY_CONFIG = {
  positive: { label: 'Positive', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  edge_case: { label: 'Edge Case', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  common_error: { label: 'Common Error', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const VALIDATION_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  validated: { label: 'Validated', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AITuningPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'metrics' | 'training'>('metrics');
  const [loading, setLoading] = useState(true);

  // Metrics state
  const [summary, setSummary] = useState<AccuracySummary | null>(null);
  const [metrics, setMetrics] = useState<AccuracyMetric[]>([]);
  const [computing, setComputing] = useState(false);

  // Training state
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [exampleStats, setExampleStats] = useState<any>(null);
  const [showCreateExample, setShowCreateExample] = useState(false);
  const [editingExample, setEditingExample] = useState<TrainingExample | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedExample, setExpandedExample] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role === 'Admin' || is_super_admin)) {
      if (activeTab === 'metrics') {
        fetchMetrics();
      } else {
        fetchExamples();
      }
    }
  }, [user, role, is_super_admin, activeTab]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/accuracy?period=last_30_days');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch metrics');
      }

      setMetrics(data.metrics || []);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to load accuracy metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamples = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/training');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch examples');
      }

      setExamples(data.examples || []);
      setExampleStats(data.stats);
    } catch (error) {
      console.error('Error fetching examples:', error);
      toast.error('Failed to load training examples');
    } finally {
      setLoading(false);
    }
  };

  const handleComputeMetrics = async () => {
    setComputing(true);
    try {
      const response = await fetch('/api/ai/accuracy/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generate_training_examples: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to compute metrics');
      }

      toast.success(`Computed ${data.results?.length || 0} metrics, generated ${data.training_examples_generated || 0} examples`);
      fetchMetrics();
    } catch (error) {
      console.error('Error computing metrics:', error);
      toast.error('Failed to compute metrics');
    } finally {
      setComputing(false);
    }
  };

  const handleDeleteExample = async (id: string) => {
    try {
      const response = await fetch(`/api/ai/training/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete example');
      }

      toast.success('Training example deleted');
      setDeleteConfirmId(null);
      fetchExamples();
    } catch (error) {
      console.error('Error deleting example:', error);
      toast.error('Failed to delete example');
    }
  };

  const handleValidateExample = async (id: string, status: 'validated' | 'rejected') => {
    try {
      const response = await fetch(`/api/ai/training/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validation_status: status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update example');
      }

      toast.success(`Example ${status}`);
      fetchExamples();
    } catch (error) {
      console.error('Error updating example:', error);
      toast.error('Failed to update example');
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAccuracyBgColor = (accuracy: number) => {
    if (accuracy >= 0.9) return 'bg-green-500';
    if (accuracy >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Model Tuning
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Monitor accuracy and manage training examples
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'metrics' && (
              <button
                onClick={handleComputeMetrics}
                disabled={computing}
                className="h-10 px-4 border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {computing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Recompute
              </button>
            )}
            {activeTab === 'training' && (
              <button
                onClick={() => setShowCreateExample(true)}
                className="h-10 px-5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Example
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-1.5 inline-flex">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'metrics'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Accuracy Metrics
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'training'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Training Examples
          </button>
        </div>

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <>
            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Overall Accuracy</p>
                      <p className={`text-3xl font-bold mt-1 ${getAccuracyColor(summary.overall_accuracy)}`}>
                        {(summary.overall_accuracy * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      summary.overall_accuracy >= 0.9 ? 'bg-green-100 dark:bg-green-900/30' :
                      summary.overall_accuracy >= 0.7 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <Target className={`w-6 h-6 ${getAccuracyColor(summary.overall_accuracy)}`} />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Total Extractions</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {summary.total_extractions.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Correct</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {summary.correct_extractions.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Errors</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                        {(summary.total_extractions - summary.correct_extractions).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Type Breakdown */}
            {summary?.action_type_breakdown && Object.keys(summary.action_type_breakdown).length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Accuracy by Action Type
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  {Object.entries(summary.action_type_breakdown).map(([type, data]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                          {ACTION_TYPE_LABELS[type] || type}
                        </span>
                        <span className={`text-sm font-bold ${getAccuracyColor(data.accuracy)}`}>
                          {(data.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getAccuracyBgColor(data.accuracy)}`}
                          style={{ width: `${data.accuracy * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {data.correct} / {data.total} correct
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Field Accuracy */}
            {summary?.field_accuracy && Object.keys(summary.field_accuracy).length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Field-Level Accuracy
                  </h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(summary.field_accuracy)
                      .sort((a, b) => b[1] - a[1])
                      .map(([field, accuracy]) => (
                        <div
                          key={field}
                          className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Gauge className={`w-4 h-4 ${getAccuracyColor(accuracy)}`} />
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">
                              {field.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className={`text-2xl font-bold ${getAccuracyColor(accuracy)}`}>
                            {(accuracy * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common Errors */}
            {summary?.top_errors && summary.top_errors.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Common Errors
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {summary.top_errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {error.error_type.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                          {error.count} occurrences
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-slate-400">Loading metrics...</p>
              </div>
            )}
          </>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <>
            {/* Example Stats */}
            {exampleStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Total Examples</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {exampleStats.total || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Active</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {exampleStats.active || 0}
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
                      <p className="text-sm text-gray-500 dark:text-slate-400">Pending Review</p>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                        {exampleStats.by_validation_status?.pending || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Validated</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {exampleStats.by_validation_status?.validated || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Examples List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Training Examples
                  </h3>
                  <button
                    onClick={fetchExamples}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">Loading examples...</p>
                </div>
              ) : examples.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    No training examples yet
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                    Add examples to improve AI accuracy
                  </p>
                  <button
                    onClick={() => setShowCreateExample(true)}
                    className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Add Example
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {examples.map((example) => {
                    const categoryConfig = CATEGORY_CONFIG[example.category as keyof typeof CATEGORY_CONFIG];
                    const validationConfig = VALIDATION_CONFIG[example.validation_status as keyof typeof VALIDATION_CONFIG];
                    const isExpanded = expandedExample === example.id;

                    return (
                      <div key={example.id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                {ACTION_TYPE_LABELS[example.action_type] || example.action_type}
                              </span>
                              {categoryConfig && (
                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${categoryConfig.color}`}>
                                  {categoryConfig.label}
                                </span>
                              )}
                              {validationConfig && (
                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${validationConfig.color}`}>
                                  {validationConfig.label}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 dark:text-slate-500">
                                Quality: {(example.quality_score * 100).toFixed(0)}%
                              </span>
                            </div>

                            <div
                              className="mt-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer"
                              onClick={() => setExpandedExample(isExpanded ? null : example.id)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="truncate">
                                  {example.input_text.substring(0, 100)}...
                                </span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl space-y-3">
                                <div>
                                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Input:</div>
                                  <div className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                                    {example.input_text}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Expected Output:</div>
                                  <pre className="text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg overflow-x-auto">
                                    {JSON.stringify(example.expected_output, null, 2)}
                                  </pre>
                                </div>
                                {example.explanation && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Explanation:</div>
                                    <div className="text-sm text-gray-700 dark:text-slate-300">
                                      {example.explanation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-slate-400">
                              <span>Source: {example.source}</span>
                              <span>Used {example.times_used}x</span>
                              <span>{format(new Date(example.created_at), 'PP')}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {example.validation_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleValidateExample(example.id, 'validated')}
                                  className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                  title="Validate"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleValidateExample(example.id, 'rejected')}
                                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setEditingExample(example)}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(example.id)}
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
          </>
        )}
      </div>

      {/* Create/Edit Example Modal */}
      {(showCreateExample || editingExample) && (
        <TrainingExampleModal
          example={editingExample}
          onClose={() => {
            setShowCreateExample(false);
            setEditingExample(null);
          }}
          onSave={() => {
            setShowCreateExample(false);
            setEditingExample(null);
            fetchExamples();
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
                Delete Training Example?
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
                This will permanently delete this training example.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 h-10 px-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteExample(deleteConfirmId)}
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

// Training Example Modal
interface TrainingExampleModalProps {
  example: TrainingExample | null;
  onClose: () => void;
  onSave: () => void;
}

function TrainingExampleModal({ example, onClose, onSave }: TrainingExampleModalProps) {
  const isEdit = !!example;
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    action_type: example?.action_type || 'LOG_ACTIVITY',
    category: example?.category || 'positive',
    input_text: example?.input_text || '',
    expected_output: example?.expected_output ? JSON.stringify(example.expected_output, null, 2) : '{}',
    explanation: example?.explanation || '',
    quality_score: example?.quality_score || 1.0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.input_text.trim()) {
      toast.error('Input text is required');
      return;
    }

    let expectedOutput;
    try {
      expectedOutput = JSON.parse(formData.expected_output);
    } catch {
      toast.error('Expected output must be valid JSON');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/ai/training/${example.id}` : '/api/ai/training';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expected_output: expectedOutput,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save example');
      }

      toast.success(isEdit ? 'Example updated' : 'Example created');
      onSave();
    } catch (error) {
      console.error('Error saving example:', error);
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
            {isEdit ? 'Edit Training Example' : 'New Training Example'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Action Type
              </label>
              <select
                value={formData.action_type}
                onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-11 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="positive">Positive Example</option>
                <option value="edge_case">Edge Case</option>
                <option value="common_error">Common Error</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Input Text *
            </label>
            <textarea
              value={formData.input_text}
              onChange={(e) => setFormData({ ...formData, input_text: e.target.value })}
              placeholder="The text that would be processed by the AI..."
              rows={4}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Expected Output (JSON) *
            </label>
            <textarea
              value={formData.expected_output}
              onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
              placeholder='{"action": "LOG_ACTIVITY", ...}'
              rows={6}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Explanation
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Why this is the correct output..."
              rows={2}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Quality Score: {(formData.quality_score * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              value={formData.quality_score}
              onChange={(e) => setFormData({ ...formData, quality_score: parseFloat(e.target.value) })}
              min="0"
              max="1"
              step="0.05"
              className="w-full"
            />
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
            className="h-10 px-5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Example'}
          </button>
        </div>
      </div>
    </div>
  );
}
