'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  X,
  Save,
  Edit2,
  Trash2,
  Settings2,
  Eye,
  EyeOff,
  Filter,
  List,
  Search,
  Copy,
  RefreshCw,
  ChevronDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  Link2,
  Mail,
  ListChecks,
  Building,
  Users,
  Ticket,
  Clock,
  Activity,
} from 'lucide-react';
import type {
  CustomFieldDefinition,
  EntityType,
  CustomFieldType,
  FieldConfig,
} from '@/lib/customFields/types';
import { ENTITY_TYPES, FIELD_TYPES } from '@/lib/customFields/schemas';

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  trial_organizations: 'Organizations',
  trial_users: 'Users',
  tickets: 'Tickets',
  trial_timeline_events: 'Timeline Events',
  user_activity_log: 'Activity Log',
};

const ENTITY_TYPE_ICONS: Record<EntityType, React.ReactNode> = {
  trial_organizations: <Building className="w-4 h-4" />,
  trial_users: <Users className="w-4 h-4" />,
  tickets: <Ticket className="w-4 h-4" />,
  trial_timeline_events: <Clock className="w-4 h-4" />,
  user_activity_log: <Activity className="w-4 h-4" />,
};

const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  trial_organizations: 'from-blue-500 to-indigo-600',
  trial_users: 'from-green-500 to-emerald-600',
  tickets: 'from-orange-500 to-red-600',
  trial_timeline_events: 'from-purple-500 to-violet-600',
  user_activity_log: 'from-gray-500 to-slate-600',
};

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Yes/No',
  date: 'Date',
  enum: 'Dropdown',
  multi_select: 'Multi-Select',
  url: 'URL',
  email: 'Email',
};

const FIELD_TYPE_ICONS: Record<CustomFieldType, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  boolean: <ToggleLeft className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  enum: <ChevronDown className="w-4 h-4" />,
  multi_select: <ListChecks className="w-4 h-4" />,
  url: <Link2 className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
};

const FIELD_TYPE_COLORS: Record<CustomFieldType, string> = {
  text: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  number: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  boolean: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  date: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  enum: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  multi_select: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  url: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  email: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
};

interface FormData {
  field_key: string;
  field_label: string;
  entity_type: EntityType;
  field_type: CustomFieldType;
  description: string;
  placeholder: string;
  default_value: string;
  is_required: boolean;
  is_filterable: boolean;
  is_visible: boolean;
  show_in_list: boolean;
  options: { value: string; label: string; color?: string }[];
  min?: number;
  max?: number;
  validation_regex: string;
  validation_message: string;
}

const initialFormData: FormData = {
  field_key: '',
  field_label: '',
  entity_type: 'trial_organizations',
  field_type: 'text',
  description: '',
  placeholder: '',
  default_value: '',
  is_required: false,
  is_filterable: false,
  is_visible: true,
  show_in_list: false,
  options: [],
  validation_regex: '',
  validation_message: '',
};

type TabValue = EntityType | 'all';

export default function CustomFieldsAdminPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();
  const [allDefinitions, setAllDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomFieldType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<CustomFieldDefinition | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading && (role === 'Admin' || is_super_admin)) {
      fetchAllDefinitions();
    }
  }, [user, authLoading, role, is_super_admin]);

  const fetchAllDefinitions = async () => {
    setLoading(true);
    try {
      // Fetch all entity types at once
      const responses = await Promise.all(
        ENTITY_TYPES.map(type =>
          fetch(`/api/custom-fields/definitions?entity_type=${type}&include_hidden=true`)
            .then(res => res.json())
        )
      );

      const allDefs = responses.flatMap(res => res.data || []);
      setAllDefinitions(allDefs);
    } catch (error) {
      console.error('Error fetching definitions:', error);
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  // Filtered definitions
  const filteredDefinitions = useMemo(() => {
    let result = [...allDefinitions];

    // Tab filter (entity type)
    if (activeTab !== 'all') {
      result = result.filter(d => d.entity_type === activeTab);
    }

    // Type filter
    if (typeFilter) {
      result = result.filter(d => d.field_type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.field_label.toLowerCase().includes(query) ||
        d.field_key.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allDefinitions, activeTab, typeFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const byEntity: Record<EntityType, number> = {
      trial_organizations: 0,
      trial_users: 0,
      tickets: 0,
      trial_timeline_events: 0,
      user_activity_log: 0,
    };
    allDefinitions.forEach(d => {
      byEntity[d.entity_type]++;
    });
    return {
      total: allDefinitions.length,
      byOrgs: byEntity.trial_organizations,
      byUsers: byEntity.trial_users,
      byTickets: byEntity.tickets,
    };
  }, [allDefinitions]);

  const handleCreateNew = () => {
    setEditingDefinition(null);
    setFormData({
      ...initialFormData,
      entity_type: activeTab === 'all' ? 'trial_organizations' : activeTab,
    });
    setShowModal(true);
  };

  const handleEdit = (definition: CustomFieldDefinition) => {
    setEditingDefinition(definition);
    const config = definition.field_config as FieldConfig;
    setFormData({
      field_key: definition.field_key,
      field_label: definition.field_label,
      entity_type: definition.entity_type,
      field_type: definition.field_type,
      description: definition.description || '',
      placeholder: ('placeholder' in config ? config.placeholder : '') || '',
      default_value: definition.default_value != null ? String(definition.default_value) : '',
      is_required: definition.is_required,
      is_filterable: definition.is_filterable,
      is_visible: definition.is_visible,
      show_in_list: definition.show_in_list,
      options: 'options' in config ? (config.options || []) : [],
      min: 'min' in config ? config.min : undefined,
      max: 'max' in config ? config.max : undefined,
      validation_regex: definition.validation_regex || '',
      validation_message: definition.validation_message || '',
    });
    setShowModal(true);
  };

  const handleDuplicate = (definition: CustomFieldDefinition) => {
    setEditingDefinition(null);
    const config = definition.field_config as FieldConfig;
    setFormData({
      field_key: `${definition.field_key}_copy`,
      field_label: `${definition.field_label} (Copy)`,
      entity_type: definition.entity_type,
      field_type: definition.field_type,
      description: definition.description || '',
      placeholder: ('placeholder' in config ? config.placeholder : '') || '',
      default_value: definition.default_value != null ? String(definition.default_value) : '',
      is_required: definition.is_required,
      is_filterable: definition.is_filterable,
      is_visible: definition.is_visible,
      show_in_list: definition.show_in_list,
      options: 'options' in config ? (config.options || []) : [],
      min: 'min' in config ? config.min : undefined,
      max: 'max' in config ? config.max : undefined,
      validation_regex: definition.validation_regex || '',
      validation_message: definition.validation_message || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/custom-fields/definitions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete definition');
      }

      toast.success('Custom field deleted');
      setDeleteConfirmId(null);
      fetchAllDefinitions();
    } catch (error) {
      console.error('Error deleting definition:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Build field_config based on field_type
      const fieldConfig: FieldConfig = {};

      if (formData.placeholder) {
        (fieldConfig as Record<string, unknown>).placeholder = formData.placeholder;
      }

      if (formData.field_type === 'number') {
        if (formData.min !== undefined) (fieldConfig as { min?: number }).min = formData.min;
        if (formData.max !== undefined) (fieldConfig as { max?: number }).max = formData.max;
      }

      if (formData.field_type === 'enum' || formData.field_type === 'multi_select') {
        (fieldConfig as { options?: { value: string; label: string; color?: string }[] }).options = formData.options;
      }

      const payload = {
        field_key: formData.field_key,
        field_label: formData.field_label,
        entity_type: formData.entity_type,
        field_type: formData.field_type,
        description: formData.description || undefined,
        field_config: fieldConfig,
        default_value: formData.default_value || undefined,
        is_required: formData.is_required,
        is_filterable: formData.is_filterable,
        is_visible: formData.is_visible,
        show_in_list: formData.show_in_list,
        validation_regex: formData.validation_regex || undefined,
        validation_message: formData.validation_message || undefined,
      };

      const url = editingDefinition
        ? `/api/custom-fields/definitions/${editingDefinition.id}`
        : '/api/custom-fields/definitions';

      const response = await fetch(url, {
        method: editingDefinition ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save definition');
      }

      toast.success(editingDefinition ? 'Custom field updated' : 'Custom field created');
      setShowModal(false);
      fetchAllDefinitions();
    } catch (error) {
      console.error('Error saving definition:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { value: '', label: '' }],
    });
  };

  const updateOption = (index: number, field: 'value' | 'label' | 'color', value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    // Auto-generate value from label if value is empty
    if (field === 'label' && !newOptions[index].value) {
      newOptions[index].value = value.toLowerCase().replace(/\s+/g, '_');
    }
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  // FIXED: Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show unauthorized AFTER auth loading completes
  if (!user || (role !== 'Admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Access Denied</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Admin access required to view this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <Settings2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Custom Fields
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Define custom data fields for organizations, users, and tickets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllDefinitions}
              className="h-11 px-5 border-2 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleCreateNew}
              className="h-11 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Fields</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Settings2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Organizations</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.byOrgs}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Building className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.byUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-slate-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Tickets</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.byTickets}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Ticket className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                All
                {stats.total > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                    {stats.total}
                  </span>
                )}
              </button>
              {ENTITY_TYPES.slice(0, 3).map((type) => {
                const count = allDefinitions.filter(d => d.entity_type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === type
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {ENTITY_TYPE_ICONS[type]}
                    {ENTITY_TYPE_LABELS[type]}
                    {count > 0 && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-slate-500 text-gray-700 dark:text-slate-200 rounded-full">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 h-10 pl-10 pr-4 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="relative">
                <select
                  value={typeFilter || ''}
                  onChange={(e) => setTypeFilter(e.target.value as CustomFieldType || null)}
                  className="h-10 pl-3 pr-8 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {FIELD_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Fields Grid */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading custom fields...</p>
          </div>
        ) : filteredDefinitions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Settings2 className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || typeFilter ? 'No fields match your filters' : 'No custom fields defined'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {searchQuery || typeFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Create custom fields to capture additional data for organizations, users, and tickets'}
            </p>
            {!searchQuery && !typeFilter && (
              <button
                onClick={handleCreateNew}
                className="h-11 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30"
              >
                Create Your First Field
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDefinitions.map((def) => (
              <div
                key={def.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all hover:shadow-lg"
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ENTITY_TYPE_COLORS[def.entity_type]} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        {ENTITY_TYPE_ICONS[def.entity_type]}
                        <span className="text-white">{/* Icon shown above */}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {def.field_label}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${FIELD_TYPE_COLORS[def.field_type]}`}>
                            {FIELD_TYPE_ICONS[def.field_type]}
                            {FIELD_TYPE_LABELS[def.field_type]}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-500 dark:text-slate-400 mt-0.5">
                          {def.field_key}
                        </p>
                        {def.description && (
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {def.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Visibility Toggle */}
                    <div className={`p-2 rounded-lg ${def.is_visible ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                      {def.is_visible ? (
                        <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Settings Info */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      {ENTITY_TYPE_LABELS[def.entity_type]}
                    </span>
                    {def.is_required && (
                      <span className="text-red-600 dark:text-red-400 font-medium">Required</span>
                    )}
                    {def.is_filterable && (
                      <span className="flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" />
                        Filterable
                      </span>
                    )}
                    {def.show_in_list && (
                      <span className="flex items-center gap-1">
                        <List className="w-3.5 h-3.5" />
                        In List
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    Created {formatDistanceToNow(new Date(def.created_at), { addSuffix: true })}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(def)}
                      className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(def)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(def.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <CustomFieldModal
          definition={editingDefinition}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          addOption={addOption}
          updateOption={updateOption}
          removeOption={removeOption}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Custom Field?
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                This will permanently delete this field definition. Any existing data stored in this field will remain but won&apos;t be accessible through this definition.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 h-11 px-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 h-11 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Delete Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Field Create/Edit Modal
interface CustomFieldModalProps {
  definition: CustomFieldDefinition | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  addOption: () => void;
  updateOption: (index: number, field: 'value' | 'label' | 'color', value: string) => void;
  removeOption: (index: number) => void;
}

function CustomFieldModal({
  definition,
  formData,
  setFormData,
  saving,
  onSubmit,
  onClose,
  addOption,
  updateOption,
  removeOption,
}: CustomFieldModalProps) {
  const isEdit = !!definition;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Custom Field' : 'Create Custom Field'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Define a custom field for capturing additional data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Section 1: Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Field Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.field_label}
                    onChange={(e) => {
                      const label = e.target.value;
                      setFormData({
                        ...formData,
                        field_label: label,
                        field_key: isEdit
                          ? formData.field_key
                          : label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                      });
                    }}
                    placeholder="e.g., Industry"
                    required
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Field Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.field_key}
                    onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
                    placeholder="e.g., industry"
                    required
                    disabled={isEdit}
                    className="w-full h-12 px-4 text-sm font-mono border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Help text shown to users"
                  className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Section 2: Field Type & Entity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                Field Type & Entity
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Entity Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as EntityType })}
                    disabled={isEdit}
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                  >
                    {ENTITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ENTITY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Field Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.field_type}
                    onChange={(e) => setFormData({ ...formData, field_type: e.target.value as CustomFieldType })}
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {FIELD_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Type-specific Config */}
            {(formData.field_type === 'enum' || formData.field_type === 'multi_select') && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Options <span className="text-red-500">*</span>
                </h3>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateOption(index, 'label', e.target.value)}
                        placeholder="Label"
                        className="flex-1 h-10 px-3 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={option.value}
                        onChange={(e) => updateOption(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="w-32 h-10 px-3 text-sm font-mono bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="color"
                        value={option.color || '#6366f1'}
                        onChange={(e) => updateOption(index, 'color', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-300 dark:border-slate-600 cursor-pointer"
                        title="Badge color"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Option
                  </button>
                </div>
              </div>
            )}

            {formData.field_type === 'number' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Number Constraints
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Minimum Value
                    </label>
                    <input
                      type="number"
                      value={formData.min ?? ''}
                      onChange={(e) => setFormData({ ...formData, min: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Maximum Value
                    </label>
                    <input
                      type="number"
                      value={formData.max ?? ''}
                      onChange={(e) => setFormData({ ...formData, max: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Display Settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">{formData.field_type === 'enum' || formData.field_type === 'multi_select' || formData.field_type === 'number' ? '4' : '3'}</span>
                Display Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={formData.placeholder}
                    onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                    placeholder="e.g., Enter value..."
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={formData.default_value}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_required}
                      onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Required field</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_filterable}
                      onChange={(e) => setFormData({ ...formData, is_filterable: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Allow filtering</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_visible}
                      onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Visible to users</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.show_in_list}
                      onChange={(e) => setFormData({ ...formData, show_in_list: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Show in list view</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 5: Validation */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">{formData.field_type === 'enum' || formData.field_type === 'multi_select' || formData.field_type === 'number' ? '5' : '4'}</span>
                Validation (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Validation Regex
                  </label>
                  <input
                    type="text"
                    value={formData.validation_regex}
                    onChange={(e) => setFormData({ ...formData, validation_regex: e.target.value })}
                    placeholder="e.g., ^[A-Z]{2,3}$"
                    className="w-full h-12 px-4 text-sm font-mono border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Validation Message
                  </label>
                  <input
                    type="text"
                    value={formData.validation_message}
                    onChange={(e) => setFormData({ ...formData, validation_message: e.target.value })}
                    placeholder="Error message for invalid input"
                    className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0 bg-gray-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || !formData.field_label || !formData.field_key}
            className="h-11 px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Field'}
          </button>
        </div>
      </div>
    </div>
  );
}
