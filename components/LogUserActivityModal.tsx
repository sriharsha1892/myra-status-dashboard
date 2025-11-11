// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface LogUserActivityModalProps {
  isOpen: boolean;
  userId: string;
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'topic', label: 'Topic' },
  { value: 'issue', label: 'Issue' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'interaction', label: 'Interaction' },
  { value: 'progress_update', label: 'Progress Update' },
  { value: 'feedback', label: 'Feedback' },
];

const CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug', label: 'Bug' },
  { value: 'usage', label: 'Usage' },
  { value: 'training', label: 'Training' },
  { value: 'integration', label: 'Integration' },
  { value: 'business', label: 'Business' },
];

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
];

export default function LogUserActivityModal({
  isOpen,
  userId,
  orgId,
  onClose,
  onSuccess,
}: LogUserActivityModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: 'topic',
    category: 'technical',
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.title.trim()) {
        toast.error('Title is required');
        setLoading(false);
        return;
      }

      // Insert into database
      const { error } = await supabase.from('user_activities').insert({
        user_id: userId,
        org_id: orgId,
        activity_type: formData.activity_type,
        category: formData.category,
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        status: formData.status,
        created_by: 'System',
      });

      if (error) throw error;

      toast.success('Activity logged successfully!');
      setFormData({
        activity_type: 'topic',
        category: 'technical',
        title: '',
        description: '',
        priority: 'medium',
        status: 'open',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Log Activity</h2>
            <p className="text-blue-100 text-sm mt-1">Track topics, issues, and progress</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Activity Type and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type <span className="text-red-500">*</span>
              </label>
              <select
                name="activity_type"
                value={formData.activity_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Discussing API integration challenges"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add detailed notes about this activity..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Logging...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
