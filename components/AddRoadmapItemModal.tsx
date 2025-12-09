'use client';

import { useEffect, useState, memo } from 'react';
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
import { Target, Sparkles, Building2, Link2 } from 'lucide-react';

// Mode types for unified modal behavior
type RoadmapMode = 'org-specific' | 'master' | 'flexible';

// Org link type for linking organizations to master items during creation
interface OrgLinkEntry {
  org_id: string;
  org_name: string;
  link_type: 'interested' | 'requested' | 'evaluating' | 'committed' | 'using';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface AddRoadmapItemModalProps {
  orgId?: string; // Optional - if not provided, user can select from dropdown
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string; // Optional pre-filled date in yyyy-MM-dd format
  initialStatus?: 'planned' | 'in_progress' | 'completed' | 'cancelled'; // Optional pre-filled status
  initialPriority?: 'low' | 'medium' | 'high' | 'critical'; // Optional pre-filled priority
  initialStrategicCategories?: string[]; // Optional pre-filled strategic categories
  showOrgPicker?: boolean; // Show organization picker (for Master Roadmap) - DEPRECATED, use mode instead
  mode?: RoadmapMode; // Control modal behavior: org-specific, master, or flexible (user chooses)
  initialLinkedOrgs?: OrgLinkEntry[]; // Pre-link organizations for master items
  defaultValues?: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    target_date?: string;
  };
}

const AddRoadmapItemModal = memo(function AddRoadmapItemModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialStatus,
  initialPriority,
  initialStrategicCategories,
  showOrgPicker = false,
  mode: propMode,
  initialLinkedOrgs = [],
  defaultValues,
}: AddRoadmapItemModalProps) {
  const supabase = createClient();
  const [availableCategories, setAvailableCategories] = useState<Array<{id: string; name: string}>>([]);
  const [availableOrganizations, setAvailableOrganizations] = useState<Array<{org_id: string; org_name: string}>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(orgId || ''); // Empty string = no org (Master Roadmap)

  // Determine initial mode: prefer explicit mode prop, then infer from showOrgPicker or orgId
  const initialMode: RoadmapMode = propMode || (showOrgPicker ? 'flexible' : (orgId ? 'org-specific' : 'master'));
  const [currentMode, setCurrentMode] = useState<RoadmapMode>(initialMode);
  const isMasterMode = currentMode === 'master' || (currentMode === 'flexible' && !selectedOrgId);

  // State for org linking (only used in master mode)
  const [linkedOrgs, setLinkedOrgs] = useState<OrgLinkEntry[]>(initialLinkedOrgs);
  const [showOrgLinkingSection, setShowOrgLinkingSection] = useState(false);
  const [newOrgLink, setNewOrgLink] = useState<{
    org_id: string;
    link_type: OrgLinkEntry['link_type'];
    priority: OrgLinkEntry['priority'];
  }>({ org_id: '', link_type: 'interested', priority: 'medium' });

  // Use form validation hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
    setFormData,
  } = useFormValidation(createRoadmapItemSchema, {
    title: defaultValues?.title || '',
    description: defaultValues?.description || '',
    status: (defaultValues?.status || initialStatus || 'planned') as typeof ROADMAP_STATUSES[number],
    priority: (defaultValues?.priority || initialPriority || 'medium') as typeof ROADMAP_PRIORITIES[number],
    target_date: defaultValues?.target_date || initialDate || '',
    estimated_completion_date: '',
    created_by: '',
    strategic_categories: initialStrategicCategories || [] as string[],
    item_type: 'task' as 'task' | 'macro-goal',
    parent_item_id: null as string | null,
  });

  // Update form when defaultValues change (for command interface prefill)
  useEffect(() => {
    if (defaultValues) {
      setFormData(prev => ({
        ...prev,
        title: defaultValues.title || prev.title,
        description: defaultValues.description || prev.description,
        status: (defaultValues.status as typeof ROADMAP_STATUSES[number]) || prev.status,
        priority: (defaultValues.priority as typeof ROADMAP_PRIORITIES[number]) || prev.priority,
        target_date: defaultValues.target_date || prev.target_date,
      }));
    }
  }, [defaultValues, setFormData]);

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  // Reset mode and linked orgs when modal opens
  useEffect(() => {
    if (isOpen) {
      const newMode = propMode || (showOrgPicker ? 'flexible' : (orgId ? 'org-specific' : 'master'));
      setCurrentMode(newMode);
      setLinkedOrgs(initialLinkedOrgs);
      setShowOrgLinkingSection(false);
      setNewOrgLink({ org_id: '', link_type: 'interested', priority: 'medium' });
    }
  }, [isOpen, propMode, showOrgPicker, orgId, initialLinkedOrgs]);

  // Fetch strategic categories and organizations from database
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('strategic_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('display_order');

        if (!categoriesError && categoriesData) {
          setAvailableCategories(categoriesData);
        }

        // Fetch organizations for flexible/master modes or showOrgPicker
        const needsOrgs = showOrgPicker || currentMode === 'flexible' || currentMode === 'master';
        if (needsOrgs) {
          const { data: orgsData, error: orgsError } = await supabase
            .from('trial_organizations')
            .select('org_id, org_name')
            .order('org_name');

          if (!orgsError && orgsData) {
            setAvailableOrganizations(orgsData);
          }
        }
      };
      fetchData();
    }
  }, [isOpen, supabase, showOrgPicker, orgId, currentMode]);

  // Pre-fill fields when modal opens with initial values
  useEffect(() => {
    if (isOpen) {
      const updates: any = {};
      if (initialDate) updates.target_date = initialDate;
      if (initialStatus) updates.status = initialStatus;
      if (initialPriority) updates.priority = initialPriority;
      if (initialStrategicCategories && initialStrategicCategories.length > 0) {
        updates.strategic_categories = initialStrategicCategories;
      }

      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [isOpen, initialDate, initialStatus, initialPriority, initialStrategicCategories, setFormData]);

  // Helper function to add an org link
  const handleAddOrgLink = () => {
    if (!newOrgLink.org_id) return;

    const org = availableOrganizations.find(o => o.org_id === newOrgLink.org_id);
    if (!org) return;

    // Check for duplicates
    if (linkedOrgs.some(link => link.org_id === newOrgLink.org_id)) {
      toast.error('Organization already linked');
      return;
    }

    setLinkedOrgs([...linkedOrgs, {
      org_id: newOrgLink.org_id,
      org_name: org.org_name,
      link_type: newOrgLink.link_type,
      priority: newOrgLink.priority,
    }]);
    setNewOrgLink({ org_id: '', link_type: 'interested', priority: 'medium' });
  };

  // Helper function to remove an org link
  const handleRemoveOrgLink = (orgId: string) => {
    setLinkedOrgs(linkedOrgs.filter(link => link.org_id !== orgId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form with Zod
    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        // Determine final org_id based on mode
        let finalOrgId: string | null = null;
        if (currentMode === 'org-specific') {
          finalOrgId = orgId || selectedOrgId || null;
        } else if (currentMode === 'flexible') {
          finalOrgId = selectedOrgId || null;
        }
        // For 'master' mode, org_id stays null

        // Create the roadmap item
        const insertData = {
          org_id: finalOrgId, // null for Master Roadmap items
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
        };
        const { data: newItem, error } = await supabase
          .from('org_product_roadmap')
          .insert(insertData as any)
          .select('id')
          .single();

        if (error) throw error;

        // If we have linked orgs (master mode), create the links
        const newItemId = (newItem as { id: string } | null)?.id;
        if (linkedOrgs.length > 0 && newItemId) {
          const linkInserts = linkedOrgs.map(link => ({
            roadmap_item_id: newItemId,
            org_id: link.org_id,
            link_type: link.link_type,
            priority: link.priority,
          }));

          const { error: linkError } = await supabase
            .from('roadmap_org_links')
            .insert(linkInserts as any);

          if (linkError) {
            console.error('Error linking organizations:', linkError);
            // Don't fail the whole operation - the item was created
            toast.error('Item created but failed to link some organizations');
          }
        }
      },
      {
        successMessage: isMasterMode && linkedOrgs.length > 0
          ? `Master roadmap item created and linked to ${linkedOrgs.length} organization(s)`
          : isMasterMode
          ? 'Master roadmap item created successfully'
          : 'Roadmap item added successfully',
        errorMessage: 'Failed to add roadmap item',
        onSuccess: () => {
          resetForm();
          setLinkedOrgs([]);
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error adding roadmap item:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'generic');

          // Show error with report option
          showErrorWithReport(
            error,
            'generic',
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
        {/* Header - Style changes based on mode */}
        <div className={`sticky top-0 border-b px-6 py-4 ${
          isMasterMode
            ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {isMasterMode && (
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isMasterMode ? 'Add Master Roadmap Item' : 'Add Roadmap Item'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isMasterMode
                    ? 'Strategic item visible across all organizations'
                    : 'Add a new item to the product roadmap'}
                  {(initialStatus || initialPriority) && (
                    <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Pre-filled from Analytics
                    </span>
                  )}
                  {(initialStrategicCategories && initialStrategicCategories.length > 0) && (
                    <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Pre-filled from Master Roadmap
                    </span>
                  )}
                </p>
              </div>
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

        {/* Info Banner for Master Mode */}
        {isMasterMode && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Master Roadmap Items</p>
              <p className="text-blue-700">
                These are cross-organizational strategic items. They appear in the Strategic Timeline
                and can be linked to specific organizations to track demand and interest.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Mode Toggle (only in flexible mode) */}
          {currentMode === 'flexible' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Item Scope
              </label>
              <div className="flex gap-3">
                <label className={`flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer border transition-all flex-1 ${
                  !selectedOrgId
                    ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <input
                    type="radio"
                    name="scope"
                    checked={!selectedOrgId}
                    onChange={() => setSelectedOrgId('')}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Master (Cross-Org)</div>
                      <div className="text-xs text-gray-500">Strategic item for all orgs</div>
                    </div>
                  </div>
                </label>
                <label className={`flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer border transition-all flex-1 ${
                  selectedOrgId
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <input
                    type="radio"
                    name="scope"
                    checked={!!selectedOrgId}
                    onChange={() => {
                      if (availableOrganizations.length > 0) {
                        setSelectedOrgId(availableOrganizations[0].org_id);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Organization</div>
                      <div className="text-xs text-gray-500">Specific to one org</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Organization Picker (when in flexible mode with org selected) */}
          {currentMode === 'flexible' && selectedOrgId && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Organization *
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableOrganizations.map((org) => (
                  <option key={org.org_id} value={org.org_id}>
                    {org.org_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Org Linking Section (for master mode items) */}
          {isMasterMode && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-purple-600" />
                  <label className="text-sm font-semibold text-gray-900">
                    Link to Organizations
                  </label>
                  <span className="text-xs text-gray-500">(Optional)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrgLinkingSection(!showOrgLinkingSection)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  {showOrgLinkingSection ? 'Hide' : linkedOrgs.length > 0 ? `${linkedOrgs.length} linked` : 'Add links'}
                </button>
              </div>

              {/* Linked orgs display */}
              {linkedOrgs.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {linkedOrgs.map((link) => (
                    <div
                      key={link.org_id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-purple-200 rounded-full text-sm"
                    >
                      <span className="font-medium text-gray-700">{link.org_name}</span>
                      <span className="text-xs text-gray-500">({link.link_type})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOrgLink(link.org_id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add org link form */}
              {showOrgLinkingSection && (
                <div className="space-y-3 pt-3 border-t border-purple-200">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newOrgLink.org_id}
                      onChange={(e) => setNewOrgLink({ ...newOrgLink, org_id: e.target.value })}
                      className="col-span-1 h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select org...</option>
                      {availableOrganizations
                        .filter(org => !linkedOrgs.some(l => l.org_id === org.org_id))
                        .map((org) => (
                          <option key={org.org_id} value={org.org_id}>
                            {org.org_name}
                          </option>
                        ))}
                    </select>
                    <select
                      value={newOrgLink.link_type}
                      onChange={(e) => setNewOrgLink({ ...newOrgLink, link_type: e.target.value as OrgLinkEntry['link_type'] })}
                      className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="interested">Interested</option>
                      <option value="requested">Requested</option>
                      <option value="evaluating">Evaluating</option>
                      <option value="committed">Committed</option>
                      <option value="using">Using</option>
                    </select>
                    <select
                      value={newOrgLink.priority}
                      onChange={(e) => setNewOrgLink({ ...newOrgLink, priority: e.target.value as OrgLinkEntry['priority'] })}
                      className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOrgLink}
                    disabled={!newOrgLink.org_id}
                    className="w-full h-9 px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Organization Link
                  </button>
                </div>
              )}

              {!showOrgLinkingSection && linkedOrgs.length === 0 && (
                <p className="text-xs text-gray-500">
                  Link organizations to track which customers are interested in this feature.
                </p>
              )}
            </div>
          )}

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
});

export default AddRoadmapItemModal;
