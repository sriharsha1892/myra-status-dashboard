'use client';

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag, User, Clock, Edit2, Check, ChevronDown, ChevronUp, MessageSquare, Send, Building2, Link2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DependencyManager from './DependencyManager';
import LabelManager from './LabelManager';
import MilestoneManager from './MilestoneManager';
import OwnerManager from './OwnerManager';
import MentionTextEditor from '@/components/MentionTextEditor';
import { handleError } from '@/lib/utils/errorHandler';

interface LinkedOrg {
  org_id: string;
  org_name: string;
  domain: string;
  link_type: string;
  priority: string;
  notes: string;
}

interface RoadmapItem {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date: string | null;
  estimated_completion_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  blocked_by_ids: string[] | null;
  blocks_ids: string[] | null;
  label_ids: string[] | null;
  milestone_id: string | null;
  owner_id: string | null;
  owner_name: string | null;
  progress_percentage: number | null;
  external_blocker: string | null;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Milestone {
  id: string;
  name: string;
  color: string;
}

interface RoadmapDetailPanelProps {
  itemId: string;
  orgId?: string; // Optional for global roadmap
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  allItems: RoadmapItem[];
  labels: Label[];
  milestones: Milestone[];
  item?: RoadmapItem; // Optional: pass item directly instead of fetching
  linkedOrgs?: LinkedOrg[]; // Linked organizations
  onOpenLinkOrgs?: () => void; // Callback to open link orgs modal
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-700', icon: '📋' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: '🚀' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700', icon: '✅' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: '⛔' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-neutral-100 text-neutral-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

const RoadmapDetailPanel = memo(function RoadmapDetailPanel({
  itemId,
  orgId,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  allItems,
  labels,
  linkedOrgs = [],
  onOpenLinkOrgs,
  milestones,
  item: passedItem,
}: RoadmapDetailPanelProps) {
  const [item, setItem] = useState<RoadmapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');

  // Pending changes state for manual save
  const [pendingChanges, setPendingChanges] = useState<Partial<RoadmapItem>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteMentions, setNewNoteMentions] = useState<string[]>([]);
  const [addingNote, setAddingNote] = useState(false);

  // Collapsible sections state
  const [sectionsExpanded, setSectionsExpanded] = useState({
    relationships: false,
    notes: false,
  });

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      // Reset pending changes when opening or switching items
      setPendingChanges({});
      setHasUnsavedChanges(false);

      if (passedItem) {
        // Use passed item directly (for GlobalRoadmapView)
        setItem(passedItem);
        setTempTitle(passedItem.title);
        setTempDescription(passedItem.description || '');
        setLoading(false);
      } else if (itemId) {
        // Fetch item (for org-specific roadmap)
        fetchItem();
      }
      // Fetch notes when panel opens
      fetchNotes();
    } else {
      // Reset pending changes when panel closes
      setPendingChanges({});
      setHasUnsavedChanges(false);
    }
  }, [itemId, isOpen, passedItem]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      // Always use org_product_roadmap table
      const tableName = 'org_product_roadmap';
      let query = supabase.from(tableName).select('*').eq('id', itemId);

      // For org-specific roadmap items, filter by org_id
      // For global roadmap items (orgId is null/undefined), use IS NULL check
      if (orgId && orgId !== 'null' && orgId !== 'undefined') {
        query = query.eq('org_id', orgId);
      } else if (!orgId || orgId === 'null' || orgId === 'undefined') {
        query = query.is('org_id', null);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setItem(data);
      setTempTitle(data.title);
      setTempDescription(data.description || '');
    } catch (error: any) {
      handleError(error, {
        context: 'fetching roadmap item details',
        additionalContext: { itemId, orgId }
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (field: string, value: any) => {
    if (!item) return;

    // Validate progress_percentage
    if (field === 'progress_percentage') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        toast.error('Progress must be between 0 and 100');
        return;
      }
      value = numValue;
    }

    setSaving(true);
    try {
      const updates = { [field]: value, updated_at: new Date().toISOString() };

      // Always use org_product_roadmap table
      const tableName = 'org_product_roadmap';
      let query = supabase.from(tableName).update(updates).eq('id', item.id);

      // For org-specific roadmap items, filter by org_id
      // For global roadmap items (orgId is null/undefined), use IS NULL check
      if (orgId && orgId !== 'null' && orgId !== 'undefined') {
        query = query.eq('org_id', orgId);
      } else if (!orgId || orgId === 'null' || orgId === 'undefined') {
        query = query.is('org_id', null);
      }

      const { data, error} = await query.select().single();

      if (error) throw error;

      // Optimistic update
      setItem({ ...item, ...updates });
      toast.success('Saved', { duration: 2000 });

      if (onUpdate) onUpdate();
    } catch (error: any) {
      handleError(error, {
        context: `updating roadmap item field '${field}'`,
        additionalContext: { itemId: item.id, orgId, field, value }
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!item || Object.keys(pendingChanges).length === 0) return;

    setSaving(true);
    try {
      const updates = { ...pendingChanges, updated_at: new Date().toISOString() };

      // Always use org_product_roadmap table
      const tableName = 'org_product_roadmap';
      let query = supabase.from(tableName).update(updates).eq('id', item.id);

      // For org-specific roadmap items, filter by org_id
      // For global roadmap items (orgId is null/undefined), use IS NULL check
      if (orgId && orgId !== 'null' && orgId !== 'undefined') {
        query = query.eq('org_id', orgId);
      } else if (!orgId || orgId === 'null' || orgId === 'undefined') {
        query = query.is('org_id', null);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;

      // Update item with saved changes
      setItem({ ...item, ...updates });

      // Create detailed success message
      const fieldNames: Record<string, string> = {
        title: 'Title',
        description: 'Description',
        status: 'Status',
        priority: 'Priority',
        target_date: 'Target Date',
        estimated_completion_date: 'Estimated Completion',
        external_blocker: 'External Blocker',
        label_ids: 'Labels',
        milestone_id: 'Milestone',
      };

      const changedFields = Object.keys(pendingChanges)
        .filter(key => key !== 'updated_at')
        .map(key => fieldNames[key] || key)
        .slice(0, 3); // Show max 3 fields

      const moreCount = Math.max(0, Object.keys(pendingChanges).length - 1 - 3);
      const message = changedFields.length > 0
        ? `Saved: ${changedFields.join(', ')}${moreCount > 0 ? ` +${moreCount} more` : ''}`
        : 'All changes saved';

      setPendingChanges({});
      setHasUnsavedChanges(false);
      toast.success(message, { duration: 3000 });

      if (onUpdate) onUpdate();
    } catch (error: any) {
      handleError(error, {
        context: 'saving all roadmap item changes',
        additionalContext: { itemId: item.id, orgId, pendingChanges }
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim() && tempTitle !== item?.title) {
      setPendingChanges({ ...pendingChanges, title: tempTitle.trim() });
      setHasUnsavedChanges(true);
    }
    setEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (tempDescription !== item?.description) {
      setPendingChanges({ ...pendingChanges, description: tempDescription });
      setHasUnsavedChanges(true);
    }
    setEditingDescription(false);
  };

  const fetchNotes = async () => {
    if (!itemId) return;

    // Notes may not be available for global roadmap items if orgId is not provided
    // In that case, just skip loading notes
    if (!orgId || orgId === 'null' || orgId === 'undefined') {
      setNotes([]);
      setLoadingNotes(false);
      return;
    }

    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_notes')
        .select('*')
        .eq('roadmap_item_id', itemId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      handleError(error, {
        context: 'fetching roadmap notes',
        additionalContext: { itemId, orgId }
      });
    } finally {
      setLoadingNotes(false);
    }
  };

  const addNote = async () => {
    // Notes are not available for global roadmap items without orgId
    if (!newNote.trim() || !itemId) return;
    if (!orgId || orgId === 'null' || orgId === 'undefined') {
      toast.error('Notes are only available for organization-specific roadmap items');
      return;
    }

    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('roadmap_notes')
        .insert({
          org_id: orgId,
          roadmap_item_id: itemId,
          content: newNote.trim(),
          note_type: 'comment',
          author_id: user?.id,
          author_name: user?.user_metadata?.name || user?.email || 'Unknown',
          mentioned_users: newNoteMentions.length > 0 ? newNoteMentions : null,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote('');
      setNewNoteMentions([]);
      toast.success('Note added');
    } catch (error: any) {
      handleError(error, {
        context: 'adding roadmap note',
        additionalContext: { itemId, orgId }
      });
    } finally {
      setAddingNote(false);
    }
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

  // Helper to check if a field has unsaved changes
  const isFieldChanged = (fieldName: keyof RoadmapItem) => {
    return fieldName in pendingChanges;
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setDeleting(true);
    try {
      const tableName = 'org_product_roadmap';
      let query = supabase.from(tableName).delete().eq('id', item.id);

      // For org-specific roadmap items, filter by org_id
      // For global roadmap items (orgId is null/undefined), use IS NULL check
      if (orgId && orgId !== 'null' && orgId !== 'undefined') {
        query = query.eq('org_id', orgId);
      } else if (!orgId || orgId === 'null' || orgId === 'undefined') {
        query = query.is('org_id', null);
      }

      const { error } = await query;

      if (error) throw error;

      toast.success('Roadmap item deleted');
      setShowDeleteConfirm(false);
      onClose();
      onDelete?.();
    } catch (error: any) {
      handleError(error, {
        context: 'deleting roadmap item',
        additionalContext: { itemId: item.id, orgId }
      });
    } finally {
      setDeleting(false);
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
              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                    title="Delete item"
                  >
                    <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
              <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-2 bg-red-100 rounded-full">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">Delete this roadmap item?</p>
                    <p className="text-xs text-red-700 mt-0.5">This action cannot be undone.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : item ? (
                <>
                  {/* Title */}
                  <div className="pb-4">
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

                  {/* Key Metrics Row: Status, Priority */}
                  <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Status
                        {isFieldChanged('status') && <span className="ml-1 text-blue-600 text-xs">●</span>}
                      </label>
                      <select
                        value={pendingChanges.status ?? item.status}
                        onChange={(e) => {
                          setPendingChanges({ ...pendingChanges, status: e.target.value as any });
                          setHasUnsavedChanges(true);
                        }}
                        disabled={saving}
                        className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white ${
                          isFieldChanged('status') ? 'border-l-4 border-l-blue-500 border-gray-300' : 'border-gray-300'
                        }`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Priority
                        {isFieldChanged('priority') && <span className="ml-1 text-blue-600 text-xs">●</span>}
                      </label>
                      <select
                        value={pendingChanges.priority ?? item.priority}
                        onChange={(e) => {
                          setPendingChanges({ ...pendingChanges, priority: e.target.value as any });
                          setHasUnsavedChanges(true);
                        }}
                        disabled={saving}
                        className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white ${
                          isFieldChanged('priority') ? 'border-l-4 border-l-blue-500 border-gray-300' : 'border-gray-300'
                        }`}
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
                        <div className="rounded-xl backdrop-blur-sm bg-white border-2 border-blue-500">
                          <MentionTextEditor
                            content={tempDescription}
                            onChange={(html) => setTempDescription(html)}
                            placeholder="Add a description..."
                            minHeight={150}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            Click Save to save changes • Esc to cancel
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setTempDescription(item.description || '');
                                setEditingDescription(false);
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveDescription}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingDescription(true)}
                        className="group cursor-pointer min-h-[100px] p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                      >
                        {item.description ? (
                          <div
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: item.description }}
                          />
                        ) : (
                          <p className="text-gray-400 italic">Click to add a description...</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Target Date
                        {isFieldChanged('target_date') && <span className="ml-1 text-blue-600 text-xs">●</span>}
                      </label>
                      <input
                        type="date"
                        value={
                          pendingChanges.target_date !== undefined
                            ? (pendingChanges.target_date ? format(new Date(pendingChanges.target_date), 'yyyy-MM-dd') : '')
                            : (item.target_date ? format(new Date(item.target_date), 'yyyy-MM-dd') : '')
                        }
                        onChange={(e) => {
                          setPendingChanges({ ...pendingChanges, target_date: e.target.value || null });
                          setHasUnsavedChanges(true);
                        }}
                        disabled={saving}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                          isFieldChanged('target_date') ? 'border-l-4 border-l-blue-500 border-gray-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Estimated Completion
                        {isFieldChanged('estimated_completion_date') && <span className="ml-1 text-blue-600 text-xs">●</span>}
                      </label>
                      <input
                        type="date"
                        value={
                          pendingChanges.estimated_completion_date !== undefined
                            ? (pendingChanges.estimated_completion_date ? format(new Date(pendingChanges.estimated_completion_date), 'yyyy-MM-dd') : '')
                            : (item.estimated_completion_date ? format(new Date(item.estimated_completion_date), 'yyyy-MM-dd') : '')
                        }
                        onChange={(e) => {
                          setPendingChanges({ ...pendingChanges, estimated_completion_date: e.target.value || null });
                          setHasUnsavedChanges(true);
                        }}
                        disabled={saving}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                          isFieldChanged('estimated_completion_date') ? 'border-l-4 border-l-blue-500 border-gray-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Owners & Contributors - Always show */}
                  <div className="pt-4 border-t border-gray-200">
                    <OwnerManager
                      orgId={orgId ?? item?.org_id ?? null}
                      roadmapItemId={itemId}
                      onOwnersChange={() => {
                        fetchItem();
                        onUpdate?.();
                      }}
                    />
                  </div>

                  {/* Linked Organizations - For Global Roadmap */}
                  {onOpenLinkOrgs && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <h4 className="text-sm font-semibold text-gray-900">
                            Linked Organizations ({linkedOrgs.length})
                          </h4>
                        </div>
                        <button
                          onClick={onOpenLinkOrgs}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Link Organizations</span>
                        </button>
                      </div>

                      {linkedOrgs.length === 0 ? (
                        <div className="text-sm text-gray-500 italic py-3 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          No organizations linked yet. Click "Link Organizations" to connect trial orgs to this roadmap item.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {linkedOrgs.map(org => (
                            <div
                              key={org.org_id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-gray-900">
                                      {org.org_name}
                                    </span>
                                  </div>
                                  {org.domain && (
                                    <p className="text-xs text-gray-500 mt-0.5">{org.domain}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      org.link_type === 'committed' ? 'bg-green-100 text-green-800' :
                                      org.link_type === 'requested' ? 'bg-blue-100 text-blue-800' :
                                      org.link_type === 'evaluating' ? 'bg-purple-100 text-purple-800' :
                                      org.link_type === 'using' ? 'bg-emerald-100 text-emerald-800' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {org.link_type}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      org.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                      org.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                      org.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {org.priority}
                                    </span>
                                  </div>
                                  {org.notes && (
                                    <p className="text-xs text-gray-600 mt-2 italic">"{org.notes}"</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Details Grid - Always Visible */}
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Details</h4>

                    {/* Labels & Milestone in Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <LabelManager
                          orgId={orgId}
                          selectedLabelIds={item.label_ids || []}
                          onLabelsChange={(labelIds) => {
                            setPendingChanges({ ...pendingChanges, label_ids: labelIds.length > 0 ? labelIds : null });
                            setHasUnsavedChanges(true);
                          }}
                        />
                      </div>
                      <div>
                        <MilestoneManager
                          orgId={orgId}
                          selectedMilestoneId={item.milestone_id}
                          onMilestoneChange={(milestoneId) => {
                            setPendingChanges({ ...pendingChanges, milestone_id: milestoneId });
                            setHasUnsavedChanges(true);
                          }}
                          showProgress={false}
                        />
                      </div>
                    </div>

                    {/* External Blocker */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        External Blocker
                        {isFieldChanged('external_blocker') && <span className="ml-1 text-blue-600 text-xs">●</span>}
                      </label>
                      <textarea
                        value={pendingChanges.external_blocker !== undefined ? (pendingChanges.external_blocker || '') : (item.external_blocker || '')}
                        onChange={(e) => {
                          setPendingChanges({ ...pendingChanges, external_blocker: e.target.value || null });
                          setHasUnsavedChanges(true);
                        }}
                        disabled={saving}
                        placeholder="E.g., waiting on vendor response, customer decision pending..."
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm resize-none ${
                          isFieldChanged('external_blocker') ? 'border-l-4 border-l-blue-500 border-gray-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Relationships Section */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() =>
                        setSectionsExpanded((prev) => ({ ...prev, relationships: !prev.relationships }))
                      }
                      className="flex items-center justify-between w-full text-left group mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          Relationships
                        </h4>
                        {((item.blocked_by_ids?.length || 0) + (item.blocks_ids?.length || 0)) > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {(item.blocked_by_ids?.length || 0) + (item.blocks_ids?.length || 0)}
                          </span>
                        )}
                      </div>
                      {sectionsExpanded.relationships ? (
                        <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      )}
                    </button>

                    {sectionsExpanded.relationships && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                        <DependencyManager
                          itemId={itemId}
                          orgId={orgId}
                          currentItem={item}
                          allItems={allItems}
                          onUpdate={() => {
                            fetchItem();
                            onUpdate?.();
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() =>
                        setSectionsExpanded((prev) => ({ ...prev, notes: !prev.notes }))
                      }
                      className="flex items-center justify-between w-full text-left group mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          Notes & Comments
                        </h4>
                        {notes.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {notes.length}
                          </span>
                        )}
                      </div>
                      {sectionsExpanded.notes ? (
                        <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      )}
                    </button>

                    {sectionsExpanded.notes && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Add Note Form */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <MentionTextEditor
                            content={newNote}
                            onChange={(html, mentions) => {
                              setNewNote(html);
                              setNewNoteMentions(mentions || []);
                            }}
                            placeholder="Add a note or comment..."
                            minHeight="100px"
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={addNote}
                              disabled={!newNote.trim() || addingNote}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {addingNote ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Adding...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  <span>Add Note</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Notes List */}
                        {loadingNotes ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : notes.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>No notes yet. Add one above!</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                                      {note.author_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {note.author_name || 'Unknown'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                  {note.note_type && note.note_type !== 'comment' && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                      {note.note_type}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: note.content }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Save Changes Button - Appears when there are unsaved changes */}
                  {hasUnsavedChanges && (
                    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 mt-6 border-t-2 border-blue-300 shadow-[0_-4px_20px_rgba(59,130,246,0.15)]">
                      <div className="animate-pulse mb-3">
                        <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-sm">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                          <span>You have unsaved changes</span>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAll}
                          disabled={saving}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setPendingChanges({});
                            setHasUnsavedChanges(false);
                          }}
                          disabled={saving}
                          className="px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Metadata Footer - Compact */}
                  <div className="mt-6 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created {format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                      <span>•</span>
                      <span>Updated {format(new Date(item.updated_at), 'MMM d, yyyy')}</span>
                      {saving && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            Saving...
                          </span>
                        </>
                      )}
                    </div>
                  </div>
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
});

export default RoadmapDetailPanel;
