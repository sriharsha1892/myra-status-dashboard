'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
  AlertCircle,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'Security', label: 'Security' },
  { value: 'Tool Functioning', label: 'Tool Functioning' },
  { value: 'Feature Set', label: 'Feature Set' },
  { value: 'Usage', label: 'Usage' },
  { value: 'Requests', label: 'Requests' },
  { value: 'Data Quality', label: 'Data Quality' },
  { value: 'Performance', label: 'Performance' },
  { value: 'Feature Request', label: 'Feature Request' },
  { value: 'Other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

interface TicketTemplate {
  id: string;
  name: string;
  category: string;
  description_template: string;
  priority: string;
  custom_fields: Record<string, any> | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  name: string;
  category: string;
  priority: string;
  description_template: string;
  custom_fields: string;
}

export default function TemplatesPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    category: 'Other',
    priority: 'Medium',
    description_template: '',
    custom_fields: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TemplateFormData, string>>>({});

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'team')) {
      fetchTemplates();
    }
  }, [user, role]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: TicketTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        category: template.category,
        priority: template.priority,
        description_template: template.description_template,
        custom_fields: template.custom_fields ? JSON.stringify(template.custom_fields, null, 2) : '',
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        category: 'Other',
        priority: 'Medium',
        description_template: '',
        custom_fields: '',
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'Other',
      priority: 'Medium',
      description_template: '',
      custom_fields: '',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TemplateFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.description_template.trim()) {
      newErrors.description_template = 'Description template is required';
    }
    if (formData.custom_fields.trim()) {
      try {
        JSON.parse(formData.custom_fields);
      } catch (e) {
        newErrors.custom_fields = 'Invalid JSON format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);

    try {
      const templateData = {
        name: formData.name.trim(),
        category: formData.category,
        priority: formData.priority,
        description_template: formData.description_template.trim(),
        custom_fields: formData.custom_fields.trim() ? JSON.parse(formData.custom_fields) : null,
      };

      if (editingTemplate) {
        const { error } = await supabase
          // -ignore - Supabase typing issue with dynamic columns

          .from('ticket_templates')
          // @ts-ignore - Supabase typing issue with dynamic columns
          // -ignore - Supabase typing issue with dynamic columns

          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          // -ignore - Supabase typing issue with dynamic columns

          .from('ticket_templates')
          // @ts-ignore - Supabase typing issue with dynamic columns
          // -ignore - Supabase typing issue with dynamic columns

          .insert([templateData]);

        if (error) throw error;
        toast.success('Template created successfully');
      }

      handleCloseModal();
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ticket_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-700 bg-red-50';
      case 'High':
        return 'text-orange-700 bg-orange-50';
      case 'Medium':
        return 'text-yellow-700 bg-yellow-50';
      case 'Low':
        return 'text-green-700 bg-green-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Security': 'text-purple-700 bg-purple-50',
      'Tool Functioning': 'text-blue-700 bg-blue-50',
      'Performance': 'text-red-700 bg-red-50',
      'Feature Request': 'text-green-700 bg-green-50',
      'Feature Set': 'text-indigo-700 bg-indigo-50',
    };
    return colors[category] || 'text-gray-700 bg-gray-50';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role?.toLowerCase() !== 'admin' && role !== 'Team')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Unauthorized access</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-14 px-4 flex items-center border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">myRA AI Support</h1>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => router.push('/support/dashboard')}
            className="flex items-center gap-3 h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => router.push('/support/submit')}
            className="flex items-center gap-3 h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            <FileText className="w-4 h-4" />
            Submit Ticket
          </button>
          <button
            onClick={() => router.push('/support/reports')}
            className="flex items-center gap-3 h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            <BarChart3 className="w-4 h-4" />
            Reports
          </button>

          <div className="pt-4 pb-2">
            <div className="text-xs font-medium text-gray-500 px-3 mb-1">Settings</div>
            <button
              onClick={() => router.push('/support/settings/users')}
              className="flex items-center gap-3 h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
            >
              <Users className="w-4 h-4" />
              Users
            </button>
            <button className="flex items-center gap-3 h-8 px-3 text-sm font-medium text-gray-900 bg-gray-100 rounded-md transition-colors w-full">
              <FileText className="w-4 h-4" />
              Templates
            </button>
          </div>
        </nav>

        <div className="p-2 border-t border-gray-200">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 h-10 w-full text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs font-medium text-gray-900 truncate">
                {user?.email?.split('@')[0] || 'Admin'}
              </div>
              <div className="text-xs text-gray-500">Sign out</div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">Ticket Templates</h2>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12">
              <div className="text-center text-sm text-gray-500">Loading templates...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">No templates yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first ticket template to speed up ticket creation
                </p>
                <button
                  onClick={() => handleOpenModal()}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create Template
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Name
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Category
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Priority
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Usage
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {template.description_template}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(template.priority)}`}>
                          {template.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Used {template.usage_count} {template.usage_count === 1 ? 'time' : 'times'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(template)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit template"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id, template.name)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Can't download PPT"
                  className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Description Template <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={formData.description_template}
                  onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                  placeholder="Use placeholders like {{organization}}, {{user_name}}, {{user_email}}"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 resize-none"
                />
                {errors.description_template && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.description_template}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Use placeholders like {'{{organization}}'} to auto-fill values
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Custom Fields (JSON)
                </label>
                <textarea
                  rows={4}
                  value={formData.custom_fields}
                  onChange={(e) => setFormData({ ...formData, custom_fields: e.target.value })}
                  placeholder={'{\n  "affected_feature": "PowerPoint Export",\n  "browser": "Chrome"\n}'}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 resize-none font-mono"
                />
                {errors.custom_fields && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.custom_fields}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Add custom key-value pairs in JSON format
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="h-9 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
