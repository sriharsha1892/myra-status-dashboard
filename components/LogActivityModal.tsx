'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { X, LogIn, BarChart, MessageCircle, BookOpen, FileText, CheckCircle, ClipboardList, Clock } from 'lucide-react';

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  users: any[];
  onActivityLogged: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'user_logged_in', label: 'User Logged In', icon: LogIn, description: 'User accessed the platform' },
  { value: 'usage_observed', label: 'Usage Observed', icon: BarChart, description: 'User actively used features' },
  { value: 'feedback_received', label: 'Feedback Received', icon: MessageCircle, description: 'User provided feedback' },
  { value: 'learning_captured', label: 'Learning Captured', icon: BookOpen, description: 'Training or onboarding completed' },
  { value: 'follow_up_note', label: 'Follow-up Note', icon: FileText, description: 'General follow-up or note' },
  { value: 'trial_access_provided', label: 'Trial Access Provided', icon: CheckCircle, description: 'Trial credentials shared' },
  { value: 'trial_access_requested', label: 'Trial Access Requested', icon: ClipboardList, description: 'User requested trial access' },
  { value: 'trial_extended', label: 'Trial Extended', icon: Clock, description: 'Trial period was extended' },
];

export default function LogActivityModal({ isOpen, onClose, orgId, users, onActivityLogged }: LogActivityModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    activity_type: '',
    user_id: '',
    description: '',
    observations: '',
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

      // Insert into trial_engagement_log
      const { error } = await supabase
        .from('trial_engagement_log')
        .insert({
          org_id: orgId,
          user_id: form.user_id || null,
          activity_type: form.activity_type,
          description: form.description,
          observations: form.observations || null,
          logged_by: user.id,
          logged_by_role: user.user_metadata?.role || 'Unknown',
        });

      if (error) throw error;

      toast.success('Activity logged successfully');
      onActivityLogged();
      onClose();
      setForm({ activity_type: '', user_id: '', description: '', observations: '' });
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast.error(error.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  const selectedActivityType = ACTIVITY_TYPES.find(t => t.value === form.activity_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-accent-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Log Activity</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Activity Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = form.activity_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, activity_type: type.value })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">User (Optional)</label>
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a user (optional)</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={3}
              placeholder="What happened? Provide a brief summary..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Observations (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Observations (Optional)</label>
            <textarea
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
              rows={4}
              placeholder="Any additional notes, learnings, or follow-ups..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
              disabled={loading || !form.activity_type || !form.description}
              className="px-6 py-2.5 bg-accent-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
