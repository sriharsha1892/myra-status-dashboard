// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import AIAssistant from './roadmap/AIAssistant';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { useLoadingState } from '@/lib/hooks';
import {
  createRoadmapItemSchema,
  ROADMAP_STATUSES,
  ROADMAP_PRIORITIES,
} from '@/lib/validation/schemas/roadmapManagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

interface AddRoadmapItemModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string; // Optional pre-filled date in yyyy-MM-dd format
}

export default function AddRoadmapItemModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}: AddRoadmapItemModalProps) {
  const supabase = createClient();
  const [availableCategories, setAvailableCategories] = useState<Array<{id: string; name: string}>>([]);

  // Use form validation hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
    setFormData,
  } = useFormValidation(createRoadmapItemSchema, {
    title: '',
    description: '',
    status: 'planned' as typeof ROADMAP_STATUSES[number],
    priority: 'medium' as typeof ROADMAP_PRIORITIES[number],
    target_date: '',
    estimated_completion_date: '',
    created_by: '',
    strategic_categories: [] as string[],
    item_type: 'task' as 'task' | 'macro-goal',
    parent_item_id: null as string | null,
  });

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  // Fetch strategic categories from database
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        const { data, error } = await supabase
          .from('strategic_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('display_order');

        if (!error && data) {
          setAvailableCategories(data);
        }
      };
      fetchCategories();
    }
  }, [isOpen, supabase]);

  // Pre-fill target date when modal opens with initialDate
  useEffect(() => {
    if (isOpen && initialDate) {
      setFormData((prev) => ({ ...prev, target_date: initialDate }));
    }
  }, [isOpen, initialDate, setFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form with Zod
    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        const { error } = await supabase.from('org_product_roadmap').insert([
          {
            org_id: orgId,
            title: formData.title.trim(),
            description: formData.description || null,
            status: formData.status,
            priority: formData.priority,
            target_date: formData.target_date || null,
            estimated_completion_date: formData.estimated_completion_date || null,
            created_by: formData.created_by || null,
            strategic_categories: formData.strategic_categories.length > 0 ? formData.strategic_categories : null,
            item_type: formData.item_type || 'task',
            parent_item_id: formData.parent_item_id || null,
          },
        ]);

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Roadmap item added successfully',
        errorMessage: 'Failed to add roadmap item',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error adding roadmap item:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'roadmap_item_create');

          // Show error with report option
          showErrorWithReport(
            error,
            'roadmap_item_create',
            errorDetails.message,
            errorDetails.suggestion,
            user?.email,
            user?.id
          );
        },
      }
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Roadmap Item</h2>
              <p className="text-sm text-gray-500 mt-1">Add a new item to the product roadmap</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* AI Assistant */}
          {formData.title && (
            <div className="mt-2">
              <AIAssistant
                item={{
                  title: formData.title,
                  description: formData.description,
                  priority: formData.priority,
                  status: formData.status
                }}
                onApplySuggestion={(type, value) => {
                  if (type === 'priority') handleInputChange('priority', value);
                  else if (type === 'status') handleInputChange('status', value);
                  toast.success(`Applied AI suggestion: ${type}`);
                }}
                compact={false}
              />
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Mobile App Support, Advanced Analytics"
              className={`w-full h-10 px-4 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-200'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the feature..."
              rows={3}
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="planned">📋 Planned</option>
                <option value="in_progress">🚀 In Progress</option>
                <option value="completed">✅ Completed</option>
                <option value="cancelled">⛔ Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
                <option value="critical">🚨 Critical</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Target Date
              </label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => handleInputChange('target_date', e.target.value)}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Estimated Completion
              </label>
              <input
                type="date"
                value={formData.estimated_completion_date}
                onChange={(e) => handleInputChange('estimated_completion_date', e.target.value)}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Created By */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Created By
            </label>
            <input
              type="text"
              value={formData.created_by}
              onChange={(e) => handleInputChange('created_by', e.target.value)}
              placeholder="Account manager or product name"
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Strategic Categories */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Strategic Categories
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableCategories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.strategic_categories.includes(category.name)}
                    onChange={(e) => {
                      const newCategories = e.target.checked
                        ? [...formData.strategic_categories, category.name]
                        : formData.strategic_categories.filter((c) => c !== category.name);
                      handleInputChange('strategic_categories', newCategories);
                    }}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-xs font-medium text-gray-700">{category.name}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">Select one or more categories for strategic timeline view</p>
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Item Type
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors flex-1">
                <input
                  type="radio"
                  name="item_type"
                  value="task"
                  checked={formData.item_type === 'task'}
                  onChange={(e) => handleInputChange('item_type', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Task</div>
                  <div className="text-xs text-gray-500">Individual roadmap item</div>
                </div>
              </label>
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors flex-1">
                <input
                  type="radio"
                  name="item_type"
                  value="macro-goal"
                  checked={formData.item_type === 'macro-goal'}
                  onChange={(e) => handleInputChange('item_type', e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Macro Goal</div>
                  <div className="text-xs text-gray-500">High-level strategic goal</div>
                </div>
              </label>
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
              disabled={isLoading}
              className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
