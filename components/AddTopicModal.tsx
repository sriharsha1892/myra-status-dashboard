// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface AddTopicModalProps {
  isOpen: boolean;
  userId: string;
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TOPIC_STATUSES = [
  { value: 'exploring', label: 'Exploring', color: 'bg-blue-100 text-blue-700' },
  { value: 'implementing', label: 'Implementing', color: 'bg-accent-100 text-accent-700' },
  { value: 'implemented', label: 'Implemented', color: 'bg-green-100 text-green-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
  { value: 'abandoned', label: 'Abandoned', color: 'bg-gray-100 text-gray-700' },
];

const PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function AddTopicModal({
  isOpen,
  userId,
  orgId,
  onClose,
  onSuccess,
}: AddTopicModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic_name: '',
    description: '',
    status: 'exploring',
    priority: 'medium',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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
      if (!formData.topic_name.trim()) {
        toast.error('Topic name is required');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('user_topics').insert({
        user_id: userId,
        org_id: orgId,
        topic_name: formData.topic_name,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
      });

      if (error) throw error;

      toast.success('Topic added successfully!');
      setFormData({
        topic_name: '',
        description: '',
        status: 'exploring',
        priority: 'medium',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding topic:', error);
      toast.error('Failed to add topic');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Add Topic/Use Case</h2>
            <p className="text-green-100 text-sm mt-1">Track areas where the user is exploring our platform</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-100 transition text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Topic Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="topic_name"
              value={formData.topic_name}
              onChange={handleChange}
              placeholder="e.g., Invoice Processing Automation"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Name of the use case or feature the user is interested in
            </p>
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
              placeholder="Provide details about this topic, requirements, or goals..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {TOPIC_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Current progress on this topic
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Status Definitions:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Exploring:</strong> User is evaluating if this solves their need</li>
              <li>• <strong>Implementing:</strong> User is actively building/testing this</li>
              <li>• <strong>Implemented:</strong> User has successfully deployed this</li>
              <li>• <strong>Blocked:</strong> User hit a blocker and can't proceed</li>
              <li>• <strong>Abandoned:</strong> User decided not to pursue this</li>
            </ul>
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
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
