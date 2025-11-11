'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import TemplateSelector from '@/components/support/TemplateSelector';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Building,
  User,
  Mail,
  Tag,
  AlertCircle,
  Send,
  X,
  CheckCircle2
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

interface FormData {
  organization: string;
  user_name: string;
  user_email: string;
  category: string;
  priority: string;
  description: string;
}

export default function SubmitTicketPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);
  const [formData, setFormData] = useState<FormData>({
    organization: '',
    user_name: '',
    user_email: '',
    category: 'Other',
    priority: 'Medium',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchOrganizations = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('status', 'Active')
        .order('name');

      if (!error && data) {
        const orgs = data.map((org: any) => ({ value: org.name, label: org.name }));
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setFormData((prev) => ({ ...prev, organization: orgs[0].value }));
        }
      }
    };

    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.organization) newErrors.organization = 'Organization is required';
    if (!formData.user_name.trim()) newErrors.user_name = 'Name is required';
    if (!formData.user_email.trim()) newErrors.user_email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user_email)) {
      newErrors.user_email = 'Invalid email format';
    }
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
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

    setLoading(true);

    try {
      // @ts-ignore - Supabase typing issue with dynamic columns
      const { data, error } = await supabase.from('tickets').insert([formData]).select();

      if (error) throw error;

      toast.success('Ticket submitted successfully!');

      // Reset form
      setFormData({
        organization: organizations[0]?.value || '',
        user_name: '',
        user_email: '',
        category: 'Other',
        priority: 'Medium',
        description: '',
      });
      setErrors({});
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast.error(error.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTemplateSelect = (template: {
    category: string;
    priority: string;
    description: string;
    custom_fields: Record<string, any> | null;
  }) => {
    setFormData((prev) => ({
      ...prev,
      category: template.category,
      priority: template.priority,
      description: template.description,
    }));
    // Clear any existing errors when template is applied
    setErrors({});
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto">
        {/* Modern Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-8 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Create Ticket</h2>
            <p className="text-xs text-gray-500 mt-0.5">Submit a new support request</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/support/dashboard')}
            className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </header>

        {/* Page content */}
        <div className="p-8">
          <div className="max-w-3xl mx-auto">
            {/* Success Indicator */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selector */}
                <TemplateSelector
                  onTemplateSelect={handleTemplateSelect}
                  placeholders={{
                    organization: formData.organization,
                    user_name: formData.user_name,
                    user_email: formData.user_email,
                  }}
                />

                {/* Organization */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                    <Building className="w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                    Organization
                  </label>
                  <div className="relative">
                    <select
                      value={formData.organization}
                      onChange={(e) => handleChange('organization', e.target.value)}
                      disabled={loading || organizations.length === 0}
                      className="w-full h-11 px-4 text-sm bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none"
                    >
                      {organizations.map((org) => (
                        <option key={org.value} value={org.value}>
                          {org.label}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {errors.organization && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.organization}
                    </p>
                  )}
                </div>

                {/* Name and Email */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                      <User className="w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                      Your Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.user_name}
                        onChange={(e) => handleChange('user_name', e.target.value)}
                        placeholder="John Doe"
                        disabled={loading}
                        className="w-full h-11 px-4 text-sm bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                    {errors.user_name && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.user_name}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                      <Mail className="w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                      Your Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.user_email}
                        onChange={(e) => handleChange('user_email', e.target.value)}
                        placeholder="john@example.com"
                        disabled={loading}
                        className="w-full h-11 px-4 text-sm bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                    {errors.user_email && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.user_email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                      <Tag className="w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        disabled={loading}
                        className="w-full h-11 px-4 text-sm bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                      <AlertCircle className="w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        value={formData.priority}
                        onChange={(e) => handleChange('priority', e.target.value)}
                        disabled={loading}
                        className="w-full h-11 px-4 text-sm bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none"
                      >
                        {PRIORITIES.map((priority) => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 transition-colors group-focus-within:text-blue-600">
                      <FileText className="w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                      Description
                    </label>
                    <span className={`text-xs font-semibold ${
                      formData.description.length < 10
                        ? 'text-gray-400'
                        : formData.description.length > 500
                        ? 'text-orange-600'
                        : 'text-gray-500'
                    }`}>
                      {formData.description.length} / 1000
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      rows={6}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Describe the issue in detail..."
                      disabled={loading}
                      maxLength={1000}
                      className="w-full px-4 py-3 text-sm bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                  {errors.description ? (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                      Provide as much detail as possible to help us resolve your issue quickly
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative h-11 px-6 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30 disabled:shadow-none flex items-center justify-center gap-2 overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="relative z-10">Creating...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Create Ticket</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/support/dashboard')}
                    disabled={loading}
                    className="h-11 px-6 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
  );
}
