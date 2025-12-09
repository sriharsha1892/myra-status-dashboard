'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
  Building2,
  Loader2,
} from 'lucide-react';
import type {
  PromptTemplate,
  PromptOverride,
  TemplateWithOverrides,
  PromptCategory,
} from '@/lib/prompts/types';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  AVAILABLE_MODELS,
} from '@/lib/prompts/types';

export default function PromptsAdminPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();

  const [templates, setTemplates] = useState<TemplateWithOverrides[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [editingOverride, setEditingOverride] = useState<{
    template: PromptTemplate;
    override: PromptOverride | null;
    orgId: string;
  } | null>(null);

  useEffect(() => {
    if (user && (role === 'Admin' || is_super_admin)) {
      fetchTemplates();
    }
  }, [user, role, is_super_admin]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/prompts/templates?includeOverrides=true&activeOnly=false');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      setTemplates(data.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load prompt templates');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTemplates(newExpanded);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template? This will also delete all overrides.')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Are you sure you want to delete this override?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/overrides/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete override');
      }

      toast.success('Override deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting override:', error);
      toast.error('Failed to delete override');
    }
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const cat = template.category as PromptCategory;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(template);
    return acc;
  }, {} as Record<PromptCategory, TemplateWithOverrides[]>);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role !== 'Admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-sm text-gray-500">Unauthorized - Admin access required</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Prompt Templates
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Customize AI prompts used throughout the system
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditingTemplate({} as PromptTemplate)}
            className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {/* Templates by Category */}
        {(Object.keys(CATEGORY_LABELS) as PromptCategory[]).map((category) => {
          const categoryTemplates = templatesByCategory[category] || [];
          if (categoryTemplates.length === 0) return null;

          return (
            <div
              key={category}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[category]}`}>
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {categoryTemplates.map((template) => (
                  <div key={template.id}>
                    {/* Template Row */}
                    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => toggleExpanded(template.id)}
                      >
                        {template.overrides.length > 0 ? (
                          expandedTemplates.has(template.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )
                        ) : (
                          <div className="w-4" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {template.template_name}
                            </span>
                            {!template.is_active && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {template.template_key}
                          </p>
                          {template.description && (
                            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-gray-500 dark:text-slate-400">
                            {template.model}
                          </div>
                          <div className="text-gray-400 dark:text-slate-500 text-xs">
                            v{template.version} • {template.overrides.length} override{template.overrides.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingOverride({ template, override: null, orgId: '' })}
                            className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Add org override"
                          >
                            <Building2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit template"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Overrides */}
                    {expandedTemplates.has(template.id) && template.overrides.length > 0 && (
                      <div className="bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700">
                        {template.overrides.map((override) => (
                          <div
                            key={override.id}
                            className="px-6 py-3 pl-14 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                  {override.org_id}
                                </span>
                                {!override.is_active && (
                                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 rounded">
                                    Inactive
                                  </span>
                                )}
                                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                                  {override.model_override && `Model: ${override.model_override}`}
                                  {override.system_prompt_override && ' • Custom system prompt'}
                                  {override.additional_instructions && ' • Extra instructions'}
                                  {override.custom_examples.length > 0 && ` • ${override.custom_examples.length} examples`}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingOverride({ template, override, orgId: override.org_id })}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit override"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOverride(override.id)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete override"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {templates.length === 0 && !loading && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
            <Brain className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400">No prompt templates found</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              Run the database migration to seed default templates
            </p>
          </div>
        )}
      </div>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={() => {
            setEditingTemplate(null);
            fetchTemplates();
          }}
        />
      )}

      {/* Edit Override Modal */}
      {editingOverride && (
        <OverrideEditModal
          template={editingOverride.template}
          override={editingOverride.override}
          initialOrgId={editingOverride.orgId}
          onClose={() => setEditingOverride(null)}
          onSave={() => {
            setEditingOverride(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

// ============================================
// Template Edit Modal
// ============================================

interface TemplateEditModalProps {
  template: PromptTemplate;
  onClose: () => void;
  onSave: () => void;
}

function TemplateEditModal({ template, onClose, onSave }: TemplateEditModalProps) {
  const isNew = !template.id;
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    template_key: template.template_key || '',
    template_name: template.template_name || '',
    description: template.description || '',
    category: template.category || 'extraction',
    system_prompt: template.system_prompt || '',
    user_prompt_template: template.user_prompt_template || '',
    model: template.model || 'llama-3.3-70b-versatile',
    temperature: template.temperature ?? 0.2,
    max_tokens: template.max_tokens ?? 4000,
    available_variables: template.available_variables?.join(', ') || '',
    is_active: template.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        available_variables: formData.available_variables
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      };

      const response = await fetch(
        isNew ? '/api/prompts/templates' : `/api/prompts/templates/${template.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      toast.success(isNew ? 'Template created' : 'Template updated');
      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isNew ? 'New Prompt Template' : 'Edit Prompt Template'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Template Key *
              </label>
              <input
                type="text"
                value={formData.template_key}
                onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
                placeholder="extraction.timeline_events"
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="Timeline Events Extraction"
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as PromptCategory })}
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {(Object.keys(CATEGORY_LABELS) as PromptCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Model
              </label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this prompt does"
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              System Prompt *
            </label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              placeholder="You are an expert at..."
              rows={8}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              User Prompt Template
            </label>
            <textarea
              value={formData.user_prompt_template}
              onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
              placeholder="Extract events from: {{text}}"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use {'{{variable}}'} syntax for template variables
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Temperature
              </label>
              <input
                type="number"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                min="0"
                max="2"
                step="0.1"
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                min="100"
                max="32000"
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Available Variables
              </label>
              <input
                type="text"
                value={formData.available_variables}
                onChange={(e) => setFormData({ ...formData, available_variables: e.target.value })}
                placeholder="text, org_name, context"
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-slate-300">Active</span>
          </label>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Override Edit Modal
// ============================================

interface OverrideEditModalProps {
  template: PromptTemplate;
  override: PromptOverride | null;
  initialOrgId: string;
  onClose: () => void;
  onSave: () => void;
}

function OverrideEditModal({ template, override, initialOrgId, onClose, onSave }: OverrideEditModalProps) {
  const isNew = !override;
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    org_id: override?.org_id || initialOrgId,
    system_prompt_override: override?.system_prompt_override || '',
    user_prompt_template_override: override?.user_prompt_template_override || '',
    model_override: override?.model_override || '',
    temperature_override: override?.temperature_override?.toString() || '',
    max_tokens_override: override?.max_tokens_override?.toString() || '',
    additional_instructions: override?.additional_instructions || '',
    custom_examples: override?.custom_examples || [],
    is_active: override?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.org_id.trim()) {
      toast.error('Organization ID is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        template_id: template.id,
        org_id: formData.org_id.trim(),
        system_prompt_override: formData.system_prompt_override || undefined,
        user_prompt_template_override: formData.user_prompt_template_override || undefined,
        model_override: formData.model_override || undefined,
        temperature_override: formData.temperature_override
          ? parseFloat(formData.temperature_override)
          : undefined,
        max_tokens_override: formData.max_tokens_override
          ? parseInt(formData.max_tokens_override)
          : undefined,
        additional_instructions: formData.additional_instructions || undefined,
        custom_examples: formData.custom_examples.length > 0 ? formData.custom_examples : undefined,
        is_active: formData.is_active,
      };

      const response = await fetch('/api/prompts/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save override');
      }

      toast.success(isNew ? 'Override created' : 'Override updated');
      onSave();
    } catch (error) {
      console.error('Error saving override:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addExample = () => {
    setFormData({
      ...formData,
      custom_examples: [...formData.custom_examples, { input: '', output: '' }],
    });
  };

  const updateExample = (index: number, field: 'input' | 'output', value: string) => {
    const newExamples = [...formData.custom_examples];
    newExamples[index] = { ...newExamples[index], [field]: value };
    setFormData({ ...formData, custom_examples: newExamples });
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      custom_examples: formData.custom_examples.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isNew ? 'New Organization Override' : 'Edit Organization Override'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              For template: {template.template_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Organization ID *
            </label>
            <input
              type="text"
              value={formData.org_id}
              onChange={(e) => setFormData({ ...formData, org_id: e.target.value })}
              placeholder="acme-corp"
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
              disabled={!isNew}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Model Override
            </label>
            <select
              value={formData.model_override}
              onChange={(e) => setFormData({ ...formData, model_override: e.target.value })}
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Use default ({template.model})</option>
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              System Prompt Override
            </label>
            <textarea
              value={formData.system_prompt_override}
              onChange={(e) => setFormData({ ...formData, system_prompt_override: e.target.value })}
              placeholder="Leave empty to use default template"
              rows={6}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Additional Instructions
            </label>
            <textarea
              value={formData.additional_instructions}
              onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
              placeholder="Extra context or instructions specific to this organization..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Custom Examples
              </label>
              <button
                type="button"
                onClick={addExample}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Example
              </button>
            </div>
            {formData.custom_examples.length > 0 ? (
              <div className="space-y-3">
                {formData.custom_examples.map((example, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Example {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeExample(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={example.input}
                      onChange={(e) => updateExample(index, 'input', e.target.value)}
                      placeholder="Input..."
                      className="w-full h-8 px-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={example.output}
                      onChange={(e) => updateExample(index, 'output', e.target.value)}
                      placeholder="Expected output..."
                      className="w-full h-8 px-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                No custom examples. Add examples to help the AI understand org-specific patterns.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Temperature Override
              </label>
              <input
                type="number"
                value={formData.temperature_override}
                onChange={(e) => setFormData({ ...formData, temperature_override: e.target.value })}
                min="0"
                max="2"
                step="0.1"
                placeholder={`Default: ${template.temperature}`}
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Max Tokens Override
              </label>
              <input
                type="number"
                value={formData.max_tokens_override}
                onChange={(e) => setFormData({ ...formData, max_tokens_override: e.target.value })}
                min="100"
                max="32000"
                placeholder={`Default: ${template.max_tokens}`}
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-slate-300">Active</span>
          </label>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isNew ? 'Create Override' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
