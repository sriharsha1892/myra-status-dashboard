'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { X, Search, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface LogPlatformQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  users: any[];
  onQueryLogged: () => void;
}

const QUERY_STATUS_OPTIONS = [
  { value: 'success', label: 'Success', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'partial', label: 'Partial', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'failed', label: 'Failed', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'timeout', label: 'Timeout', icon: Clock, color: 'text-orange-600 bg-orange-50 border-orange-200' },
];

const QUERY_CATEGORY_OPTIONS = [
  { value: 'Market Size & Forecast', label: 'Market Size & Forecast' },
  { value: 'Competitive Analysis', label: 'Competitive Analysis' },
  { value: 'Trend Analysis', label: 'Trend Analysis' },
  { value: 'Industry Overview', label: 'Industry Overview' },
  { value: 'Regulatory & Compliance', label: 'Regulatory & Compliance' },
  { value: 'Technology Assessment', label: 'Technology Assessment' },
  { value: 'Consumer Insights', label: 'Consumer Insights' },
  { value: 'Supply Chain Analysis', label: 'Supply Chain Analysis' },
  { value: 'Regional Analysis', label: 'Regional Analysis' },
  { value: 'Product Analysis', label: 'Product Analysis' },
  { value: 'Other', label: 'Other' },
];

const OBSERVATION_OPTIONS = [
  { value: 'Excellent - Highly accurate and comprehensive', label: 'Excellent - Highly accurate and comprehensive' },
  { value: 'Good - Meets expectations with solid insights', label: 'Good - Meets expectations with solid insights' },
  { value: 'Satisfactory - Adequate but could be improved', label: 'Satisfactory - Adequate but could be improved' },
  { value: 'Needs Refinement - Missing key information', label: 'Needs Refinement - Missing key information' },
  { value: 'Poor - Lacks context or accuracy', label: 'Poor - Lacks context or accuracy' },
  { value: 'Data Quality Issues', label: 'Data Quality Issues' },
  { value: 'Requires Expert Review', label: 'Requires Expert Review' },
  { value: 'Novel Insight - Unexpected findings', label: 'Novel Insight - Unexpected findings' },
];

export default function LogPlatformQueryModal({ isOpen, onClose, orgId, users, onQueryLogged }: LogPlatformQueryModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    user_id: '',
    query_topic: '',
    query_text: '',
    status: 'success',
    query_category: '',
    observations: '',
    confidence_score: '',
    response_time_ms: '',
    session_id: '',
    executed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Validate required fields
      if (!form.user_id || !form.query_topic || !form.query_text || !form.status || !form.executed_at) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Insert into platform_queries
      const { error } = await supabase
        .from('platform_queries')
        .insert({
          org_id: orgId,
          user_id: form.user_id,
          query_topic: form.query_topic,
          query_text: form.query_text,
          status: form.status,
          query_category: form.query_category || null,
          observations: form.observations || null,
          confidence_score: form.confidence_score ? parseFloat(form.confidence_score) : null,
          response_time_ms: form.response_time_ms ? parseInt(form.response_time_ms) : null,
          session_id: form.session_id || null,
          executed_at: new Date(form.executed_at).toISOString(),
          metadata: {},
        });

      if (error) throw error;

      toast.success('Platform query logged successfully');
      onQueryLogged();
      onClose();
      setForm({
        user_id: '',
        query_topic: '',
        query_text: '',
        status: 'success',
        query_category: '',
        observations: '',
        confidence_score: '',
        response_time_ms: '',
        session_id: '',
        executed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      });
    } catch (error: any) {
      console.error('Error logging platform query:', error);
      toast.error(error.message || 'Failed to log platform query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Log Platform Query</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">User *</label>
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Query Topic */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Query Topic *</label>
            <input
              type="text"
              value={form.query_topic}
              onChange={(e) => setForm({ ...form, query_topic: e.target.value })}
              required
              placeholder="e.g., Market size for semiconductors"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Query Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Query Text *</label>
            <textarea
              value={form.query_text}
              onChange={(e) => setForm({ ...form, query_text: e.target.value })}
              required
              rows={3}
              placeholder="Full query text entered by the user..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Query Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Query Category</label>
            <select
              value={form.query_category}
              onChange={(e) => setForm({ ...form, query_category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select category (optional)</option>
              {QUERY_CATEGORY_OPTIONS.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Observations</label>
            <select
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select observation (optional)</option>
              {OBSERVATION_OPTIONS.map((observation) => (
                <option key={observation.value} value={observation.value}>
                  {observation.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              Quality assessment for B2B AI market research output
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Query Status *</label>
            <div className="grid grid-cols-2 gap-3">
              {QUERY_STATUS_OPTIONS.map((statusOption) => {
                const Icon = statusOption.icon;
                const isSelected = form.status === statusOption.value;
                return (
                  <button
                    key={statusOption.value}
                    type="button"
                    onClick={() => setForm({ ...form, status: statusOption.value })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {statusOption.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Executed At */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Executed At *</label>
            <input
              type="datetime-local"
              value={form.executed_at}
              onChange={(e) => setForm({ ...form, executed_at: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Confidence Score */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confidence Score (0-100)</label>
              <input
                type="number"
                value={form.confidence_score}
                onChange={(e) => setForm({ ...form, confidence_score: e.target.value })}
                min="0"
                max="100"
                step="0.01"
                placeholder="85.5"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Response Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Response Time (ms)</label>
              <input
                type="number"
                value={form.response_time_ms}
                onChange={(e) => setForm({ ...form, response_time_ms: e.target.value })}
                min="0"
                placeholder="1500"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Session ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Session ID (Optional)</label>
            <input
              type="text"
              value={form.session_id}
              onChange={(e) => setForm({ ...form, session_id: e.target.value })}
              placeholder="session-abc123"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.user_id || !form.query_topic || !form.query_text || !form.status || !form.executed_at}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging...' : 'Log Query'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
