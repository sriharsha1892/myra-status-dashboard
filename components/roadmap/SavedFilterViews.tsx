'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Bookmark,
  BookmarkPlus,
  Star,
  Share2,
  Clock,
  TrendingUp,
  Settings,
  Search,
  X,
  ChevronRight,
  Save,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Zap,
  Filter,
  MoreVertical,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedView {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  filters: any;
  view_mode: string;
  is_shared: boolean;
  quick_access: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface SavedFilterViewsProps {
  orgId: string;
  currentFilters: any;
  currentViewMode: string;
  onApplyView: (filters: any, viewMode: string) => void;
  onSaveCurrentView?: () => void;
}

const DEFAULT_ICONS = ['🔍', '⭐', '🔥', '📅', '👤', '🎯', '🚀', '💡', '📊', '🔔'];

export default function SavedFilterViews({
  orgId,
  currentFilters,
  currentViewMode,
  onApplyView,
  onSaveCurrentView
}: SavedFilterViewsProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [quickAccessViews, setQuickAccessViews] = useState<SavedView[]>([]);
  const [recentFilters, setRecentFilters] = useState<any[]>([]);
  const [popularViews, setPopularViews] = useState<SavedView[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Save modal state
  const [viewName, setViewName] = useState('');
  const [viewDescription, setViewDescription] = useState('');
  const [viewIcon, setViewIcon] = useState('🔍');
  const [isShared, setIsShared] = useState(false);
  const [isQuickAccess, setIsQuickAccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchSavedViews();
    fetchSuggestions();
  }, [orgId]);

  const fetchSavedViews = async () => {
    try {
      const { data: views, error } = await supabase
        .from('roadmap_saved_views')
        .select('*')
        .eq('org_id', orgId)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setSavedViews(views || []);
      setQuickAccessViews((views || []).filter(v => v.quick_access));
    } catch (error: any) {
      console.error('Error fetching saved views:', error?.message || error);
      // Fail silently - saved views are optional enhancement
    }
  };

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_suggested_filters', {
        p_org_id: orgId
      });

      if (error) throw error;

      if (data) {
        setRecentFilters(data.recent || []);
        setPopularViews(data.popular || []);
      }
    } catch (error: any) {
      console.error('Error fetching suggestions:', error?.message || error);
      // Fail silently - suggestions are optional enhancement
    }
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) {
      toast.error('Please enter a name for the view');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('save_filter_view', {
        p_org_id: orgId,
        p_name: viewName,
        p_description: viewDescription || null,
        p_icon: viewIcon,
        p_filters: currentFilters,
        p_view_mode: currentViewMode,
        p_is_shared: isShared,
        p_quick_access: isQuickAccess
      });

      if (error) throw error;

      toast.success('Filter view saved successfully!');
      setShowSaveModal(false);
      resetSaveModal();
      fetchSavedViews();
    } catch (error: any) {
      console.error('Error saving view:', error);
      toast.error(error.message || 'Failed to save view');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyView = async (view: SavedView) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('apply_saved_view', {
        p_view_id: view.id
      });

      if (error) throw error;

      if (data) {
        onApplyView(data.filters, data.view_mode);
        setActiveViewId(view.id);
        toast.success(`Applied "${view.name}" view`);
      }
    } catch (error: any) {
      console.error('Error applying view:', error);
      toast.error(error.message || 'Failed to apply view');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (!confirm('Are you sure you want to delete this saved view?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('roadmap_saved_views')
        .delete()
        .eq('id', viewId);

      if (error) throw error;

      toast.success('View deleted successfully');
      fetchSavedViews();
      if (activeViewId === viewId) {
        setActiveViewId(null);
      }
    } catch (error) {
      console.error('Error deleting view:', error);
      toast.error('Failed to delete view');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQuickAccess = async (view: SavedView) => {
    try {
      const { error } = await supabase
        .from('roadmap_saved_views')
        .update({ quick_access: !view.quick_access })
        .eq('id', view.id);

      if (error) throw error;

      toast.success(view.quick_access ? 'Removed from quick access' : 'Added to quick access');
      fetchSavedViews();
    } catch (error) {
      console.error('Error updating quick access:', error);
      toast.error('Failed to update quick access');
    }
  };

  const resetSaveModal = () => {
    setViewName('');
    setViewDescription('');
    setViewIcon('🔍');
    setIsShared(false);
    setIsQuickAccess(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick Access Bar */}
      {quickAccessViews.length > 0 && (
        <div className="flex items-center gap-1 border-r pr-2">
          {quickAccessViews.map((view) => (
            <button
              key={view.id}
              onClick={() => handleApplyView(view)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeViewId === view.id
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
              title={view.description || view.name}
            >
              <span>{view.icon}</span>
              <span className="max-w-[100px] truncate">{view.name}</span>
              {view.is_shared && (
                <Share2 className="w-3 h-3 text-gray-400" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Save Current Button */}
      <button
        onClick={() => setShowSaveModal(true)}
        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
      >
        <BookmarkPlus className="w-4 h-4" />
        Save View
      </button>

      {/* Manage Views Button */}
      <button
        onClick={() => setShowManageModal(true)}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5 text-sm font-medium"
      >
        <Settings className="w-4 h-4" />
        Manage
      </button>

      {/* Save View Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Filter View</h3>

              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  View Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="e.g., High Priority Items"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Description Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={viewDescription}
                  onChange={(e) => setViewDescription(e.target.value)}
                  placeholder="Optional description for this view"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={2}
                />
              </div>

              {/* Icon Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setViewIcon(icon)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-colors ${
                        viewIcon === icon
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isQuickAccess}
                    onChange={(e) => setIsQuickAccess(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Quick Access</div>
                    <div className="text-xs text-gray-500">Show in quick access toolbar</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Share with Team</div>
                    <div className="text-xs text-gray-500">Make this view available to your team</div>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveView}
                  disabled={loading || !viewName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save View
                </button>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    resetSaveModal();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Views Modal */}
      <AnimatePresence>
        {showManageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowManageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Manage Saved Views</h3>
                  <button
                    onClick={() => setShowManageModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* My Saved Views */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Bookmark className="w-4 h-4" />
                    My Saved Views ({savedViews.length})
                  </h4>
                  {savedViews.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved views yet</p>
                  ) : (
                    <div className="space-y-2">
                      {savedViews.map((view) => (
                        <div
                          key={view.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-lg">{view.icon}</span>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {view.name}
                                {view.is_shared && (
                                  <Share2 className="w-3 h-3 inline ml-1 text-gray-400" />
                                )}
                              </div>
                              {view.description && (
                                <div className="text-xs text-gray-500">{view.description}</div>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span>{view.usage_count} uses</span>
                                {view.last_used_at && (
                                  <span>Last used {new Date(view.last_used_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleApplyView(view)}
                              className="p-2 hover:bg-white rounded-lg transition-colors"
                              title="Apply view"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleToggleQuickAccess(view)}
                              className={`p-2 hover:bg-white rounded-lg transition-colors ${
                                view.quick_access ? 'text-yellow-600' : 'text-gray-400'
                              }`}
                              title={view.quick_access ? 'Remove from quick access' : 'Add to quick access'}
                            >
                              <Star className={`w-4 h-4 ${view.quick_access ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleDeleteView(view.id)}
                              className="p-2 hover:bg-white rounded-lg transition-colors"
                              title="Delete view"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Team Views */}
                {popularViews.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Popular Team Views
                    </h4>
                    <div className="space-y-2">
                      {popularViews.map((view: any, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                          onClick={() => onApplyView(view.filters, 'cards')}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{view.icon}</span>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{view.name}</div>
                              <div className="text-xs text-gray-500">{view.usage_count} uses</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Filters */}
                {recentFilters.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Recent Filters
                    </h4>
                    <div className="space-y-2">
                      {recentFilters.map((filters, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => onApplyView(filters, currentViewMode)}
                        >
                          <div className="text-sm text-gray-700">
                            Recent filter configuration #{index + 1}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}