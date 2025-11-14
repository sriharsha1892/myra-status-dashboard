'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Copy,
  FileText,
  Save,
  X,
  AlertCircle,
  Layers,
  Settings,
  Calendar,
  Users,
  Tag,
  Link,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  target_date: string | null;
  estimated_completion_date: string | null;
  linked_features: string[] | null;
  label_ids: string[] | null;
  milestone_id: string | null;
  progress_percentage?: number;
}

interface CloneTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RoadmapItem;
  orgId: string;
  onSuccess: () => void;
  mode: 'clone' | 'template' | 'both';
}

export default function CloneTemplateModal({
  isOpen,
  onClose,
  item,
  orgId,
  onSuccess,
  mode = 'both'
}: CloneTemplateModalProps) {
  const [selectedMode, setSelectedMode] = useState<'clone' | 'template'>(mode === 'both' ? 'clone' : mode);
  const [newTitle, setNewTitle] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Clone options
  const [cloneDescription, setCloneDescription] = useState(true);
  const [cloneStatus, setCloneStatus] = useState(false);
  const [clonePriority, setClonePriority] = useState(true);
  const [cloneDates, setCloneDates] = useState(false);
  const [cloneLabels, setCloneLabels] = useState(true);
  const [cloneMilestone, setCloneMilestone] = useState(false);
  const [cloneLinkedFeatures, setCloneLinkedFeatures] = useState(false);
  const [cloneOwners, setCloneOwners] = useState(false);
  const [dateOffset, setDateOffset] = useState<'none' | '1week' | '2weeks' | '1month' | '3months'>('none');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setNewTitle(`${item.title} (Copy)`);
      setTemplateName(`${item.title} Template`);
      setTemplateDescription(`Template based on: ${item.title}`);
    }
  }, [isOpen, item]);

  const calculateNewDate = (originalDate: string | null): string | null => {
    if (!originalDate || dateOffset === 'none') return originalDate;

    const date = new Date(originalDate);
    switch (dateOffset) {
      case '1week':
        return format(addWeeks(date, 1), 'yyyy-MM-dd');
      case '2weeks':
        return format(addWeeks(date, 2), 'yyyy-MM-dd');
      case '1month':
        return format(addMonths(date, 1), 'yyyy-MM-dd');
      case '3months':
        return format(addMonths(date, 3), 'yyyy-MM-dd');
      default:
        return originalDate;
    }
  };

  const handleClone = async () => {
    if (!newTitle.trim()) {
      toast.error('Please enter a title for the cloned item');
      return;
    }

    setLoading(true);
    try {
      const clonedItem = {
        org_id: orgId,
        title: newTitle,
        description: cloneDescription ? item.description : null,
        status: cloneStatus ? item.status : 'planned',
        priority: clonePriority ? item.priority : 'medium',
        target_date: cloneDates ? calculateNewDate(item.target_date) : null,
        estimated_completion_date: cloneDates ? calculateNewDate(item.estimated_completion_date) : null,
        linked_features: cloneLinkedFeatures ? item.linked_features : [],
        label_ids: cloneLabels ? item.label_ids : [],
        milestone_id: cloneMilestone ? item.milestone_id : null,
        progress_percentage: 0,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data, error } = await supabase
        .from('org_product_roadmap')
        .insert(clonedItem)
        .select()
        .single();

      if (error) throw error;

      // Clone owners if selected
      if (cloneOwners && data) {
        const { data: originalOwners } = await supabase
          .from('roadmap_owner_assignments')
          .select('*')
          .eq('roadmap_item_id', item.id);

        if (originalOwners && originalOwners.length > 0) {
          const newOwners = originalOwners.map(owner => ({
            ...owner,
            id: undefined,
            roadmap_item_id: data.id,
            created_at: undefined
          }));

          await supabase
            .from('roadmap_owner_assignments')
            .insert(newOwners);
        }
      }

      toast.success(`Successfully cloned "${item.title}"`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error cloning item:', error);
      toast.error(error.message || 'Failed to clone item');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a name for the template');
      return;
    }

    setLoading(true);
    try {
      // Save as template in a templates table (if exists) or as metadata
      const templateData = {
        name: templateName,
        description: templateDescription,
        source_item: {
          title: item.title,
          description: item.description,
          priority: item.priority,
          label_ids: item.label_ids,
          linked_features: item.linked_features,
          milestone_id: item.milestone_id
        },
        org_id: orgId,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        created_at: new Date().toISOString()
      };

      // For now, save to localStorage as a quick implementation
      const existingTemplates = JSON.parse(localStorage.getItem('roadmap_templates') || '[]');
      existingTemplates.push({
        id: `template_${Date.now()}`,
        ...templateData
      });
      localStorage.setItem('roadmap_templates', JSON.stringify(existingTemplates));

      toast.success(`Template "${templateName}" saved successfully!`);
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (selectedMode === 'clone') {
      handleClone();
    } else {
      handleSaveTemplate();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {mode === 'both' ? 'Clone or Save as Template' : mode === 'clone' ? 'Clone Item' : 'Save as Template'}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Original: {item.title}
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Mode Selection */}
              {mode === 'both' && (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedMode('clone')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        selectedMode === 'clone'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Copy className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <div className="font-medium text-gray-900">Clone Item</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Create a duplicate with customizable options
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedMode('template')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        selectedMode === 'template'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <div className="font-medium text-gray-900">Save as Template</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Save for reuse across multiple projects
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Clone Options */}
              {selectedMode === 'clone' && (
                <div className="space-y-6">
                  {/* New Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Clone Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      What to Include
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={cloneDescription}
                          onChange={(e) => setCloneDescription(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Description</span>
                          </div>
                          <span className="text-xs text-gray-500">Copy the item description</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={cloneStatus}
                          onChange={(e) => setCloneStatus(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Status</span>
                          </div>
                          <span className="text-xs text-gray-500">Keep the same status</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={clonePriority}
                          onChange={(e) => setClonePriority(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Priority</span>
                          </div>
                          <span className="text-xs text-gray-500">Keep the same priority level</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={cloneDates}
                          onChange={(e) => setCloneDates(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Dates</span>
                          </div>
                          <span className="text-xs text-gray-500">Copy target and estimated dates</span>
                        </div>
                      </label>

                      {cloneDates && (
                        <div className="ml-7 p-3 bg-purple-50 rounded-lg">
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Date Offset
                          </label>
                          <select
                            value={dateOffset}
                            onChange={(e) => setDateOffset(e.target.value as any)}
                            className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="none">Keep original dates</option>
                            <option value="1week">+1 week</option>
                            <option value="2weeks">+2 weeks</option>
                            <option value="1month">+1 month</option>
                            <option value="3months">+3 months</option>
                          </select>
                        </div>
                      )}

                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={cloneLabels}
                          onChange={(e) => setCloneLabels(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Labels</span>
                          </div>
                          <span className="text-xs text-gray-500">Copy all assigned labels</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={cloneMilestone}
                          onChange={(e) => setCloneMilestone(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Milestone</span>
                          </div>
                          <span className="text-xs text-gray-500">Keep the same milestone</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={cloneLinkedFeatures}
                          onChange={(e) => setCloneLinkedFeatures(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Linked Features</span>
                          </div>
                          <span className="text-xs text-gray-500">Copy feature connections</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={cloneOwners}
                          onChange={(e) => setCloneOwners(e.target.checked)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Owners</span>
                          </div>
                          <span className="text-xs text-gray-500">Copy owner assignments</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Template Options */}
              {selectedMode === 'template' && (
                <div className="space-y-6">
                  {/* Template Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Feature Launch Template"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Template Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Describe when and how to use this template"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Template Preview */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm font-medium text-purple-900 mb-2">
                      Template will include:
                    </div>
                    <ul className="space-y-1 text-sm text-purple-700">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-600" />
                        Title structure
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-600" />
                        Description template
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-600" />
                        Default priority: {item.priority}
                      </li>
                      {item.label_ids && item.label_ids.length > 0 && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-600" />
                          {item.label_ids.length} label{item.label_ids.length !== 1 ? 's' : ''}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading || (selectedMode === 'clone' ? !newTitle.trim() : !templateName.trim())}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {selectedMode === 'clone' ? <Copy className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {selectedMode === 'clone' ? 'Clone Item' : 'Save Template'}
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}