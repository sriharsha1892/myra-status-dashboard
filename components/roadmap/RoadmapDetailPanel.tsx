'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag, User, Clock, Edit2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface RoadmapItem {
  id: string;
  org_id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date?: string;
  estimated_completion_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface RoadmapDetailPanelProps {
  itemId: string;
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-700', icon: '📋' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: '🚀' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700', icon: '✅' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: '⛔' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export default function RoadmapDetailPanel({
  itemId,
  orgId,
  isOpen,
  onClose,
  onUpdate,
}: RoadmapDetailPanelProps) {
  const [item, setItem] = useState<RoadmapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && itemId) {
      fetchItem();
    }
  }, [itemId, isOpen]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .eq('id', itemId)
        .eq('org_id', orgId)
        .single();

      if (error) throw error;
      setItem(data);
      setTempTitle(data.title);
      setTempDescription(data.description || '');
    } catch (error: any) {
      console.error('Error fetching roadmap item:', error);
      toast.error('Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (field: string, value: any) => {
    if (!item) return;

    setSaving(true);
    try {
      const updates = { [field]: value, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from('org_product_roadmap')
        .update(updates)
        .eq('id', itemId)
        .eq('org_id', orgId);

      if (error) throw error;

      // Optimistic update
      setItem({ ...item, ...updates });
      toast.success('Saved', { duration: 2000 });

      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim() && tempTitle !== item?.title) {
      updateField('title', tempTitle.trim());
    }
    setEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (tempDescription !== item?.description) {
      updateField('description', tempDescription);
    }
    setEditingDescription(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, saveFunc: () => void) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveFunc();
    } else if (e.key === 'Escape') {
      if (editingTitle) {
        setTempTitle(item?.title || '');
        setEditingTitle(false);
      }
      if (editingDescription) {
        setTempDescription(item?.description || '');
        setEditingDescription(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={handleBackdropClick}
          />

          {/* Slide-out Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Roadmap Item</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : item ? (
                <>
                  {/* Title */}
                  <div>
                    {editingTitle ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, handleSaveTitle)}
                          onBlur={handleSaveTitle}
                          autoFocus
                          className="w-full text-2xl font-bold text-gray-900 bg-white border-2 border-blue-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">
                          Press Enter or click away to save • Esc to cancel
                        </p>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingTitle(true)}
                        className="group cursor-pointer"
                      >
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to edit
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status & Priority */}
                  <div className="flex flex-wrap gap-3">
                    {/* Status Dropdown */}
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Status
                      </label>
                      <select
                        value={item.status}
                        onChange={(e) => updateField('status', e.target.value)}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority Dropdown */}
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Priority
                      </label>
                      <select
                        value={item.priority}
                        onChange={(e) => updateField('priority', e.target.value)}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Description
                    </label>
                    {editingDescription ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempDescription}
                          onChange={(e) => setTempDescription(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setTempDescription(item.description || '');
                              setEditingDescription(false);
                            }
                          }}
                          onBlur={handleSaveDescription}
                          autoFocus
                          rows={6}
                          className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          placeholder="Add a description..."
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            Cmd+Enter to save • Esc to cancel
                          </p>
                          <button
                            onClick={handleSaveDescription}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingDescription(true)}
                        className="group cursor-pointer min-h-[100px] p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                      >
                        {item.description ? (
                          <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
                        ) : (
                          <p className="text-gray-400 italic">Click to add a description...</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={item.target_date ? format(new Date(item.target_date), 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateField('target_date', e.target.value)}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Estimated Completion
                      </label>
                      <input
                        type="date"
                        value={item.estimated_completion_date ? format(new Date(item.estimated_completion_date), 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateField('estimated_completion_date', e.target.value)}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="text-gray-900 font-medium">
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Updated</p>
                        <p className="text-gray-900 font-medium">
                          {format(new Date(item.updated_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Saving Indicator */}
                  {saving && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Saving...
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Item not found</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
