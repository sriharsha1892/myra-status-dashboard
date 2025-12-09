'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

interface AddResearchActionModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTION_TYPES = [
  { value: 'proposal_needed', label: 'Proposal Needed', icon: '📄', description: 'Formal proposal required' },
  { value: 'technical_guidance_needed', label: 'Technical Guidance Needed', icon: '🔧', description: 'Technical requirements assessment' },
  { value: 'pricing_decision', label: 'Pricing Decision', icon: '💰', description: 'Custom pricing negotiation' },
  { value: 'competitive_analysis', label: 'Competitive Analysis', icon: '📊', description: 'Market competitive assessment' },
  { value: 'market_fit_assessment', label: 'Market Fit Assessment', icon: '🎯', description: 'Evaluate product-market fit' },
  { value: 'customization_needs', label: 'Customization Needs', icon: '⚙️', description: 'Custom feature or integration' },
  { value: 'integration_assessment', label: 'Integration Assessment', icon: '🔗', description: 'Evaluate technical integrations' },
  { value: 'roi_modeling', label: 'ROI Modeling', icon: '📈', description: 'Build ROI business case' },
];

export default function AddResearchActionModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: AddResearchActionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [actionType, setActionType] = useState('proposal_needed');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('trial_research_actions').insert({
        org_id: orgId,
        action_type: actionType,
        title: title,
        description: description || null,
        priority: priority,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        created_by: user?.id || 'unknown',
        created_by_name: user?.email || 'Unknown',
        status: 'open',
      });

      if (error) throw error;

      toast.success('Research action created successfully');
      resetForm();
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating research action:', error);
      toast.error(error.message || 'Failed to create research action');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActionType('proposal_needed');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAssignedTo('');
    setDueDate('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const selectedActionType = ACTION_TYPES.find((a) => a.value === actionType);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Research Action</h2>
            <p className="text-sm text-gray-500 mt-1">Request research team involvement for this organization</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Action Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Enterprise pricing proposal, ROI analysis for ACME Corp"
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Action Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    actionType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="actionType"
                    value={type.value}
                    checked={actionType === type.value}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-4 h-4 text-blue-600 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{type.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context, specific requirements, or notes for the research team..."
              rows={3}
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Priority and Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Assigned To
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Team member name or email"
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2 items-start">
              <span className="text-lg mt-0.5">{selectedActionType?.icon}</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {selectedActionType?.label || 'Research Action'}
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  This action will be tracked and monitored until completion. The research team will be notified of this request.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Action</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
