'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ResourceCard from '@/components/ResourceCard';
import toast from 'react-hot-toast';
import {
  Plus, Search, X, Filter, Rocket, GraduationCap, Code, Star,
  LifeBuoy, FileText, Scale, TrendingUp, Sparkles, Globe, Building
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  link_url: string;
  link_type: 'onedrive' | 'google_drive' | 'external';
  category_id: string | null;
  is_global: boolean;
  trial_org_id: string | null;
  tags: string[];
  created_at: string;
  created_by: string | null;
  category?: Category;
  creator_name?: string;
}

interface DocumentLibraryProps {
  trialOrgId?: string; // If provided, shows org-specific resources
  viewMode?: 'global' | 'org' | 'both';
}

const ICON_MAP: Record<string, any> = {
  Rocket, GraduationCap, Code, Star, LifeBuoy, FileText, Scale, TrendingUp
};

// Color class mappings for category badges (Tailwind JIT-safe)
const COLOR_CLASSES: Record<string, {
  gradient: string;
  shadow: string;
  border: string;
}> = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/30',
    border: 'border-blue-200 hover:border-blue-400'
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/30',
    border: 'border-purple-200 hover:border-purple-400'
  },
  green: {
    gradient: 'from-green-500 to-green-600',
    shadow: 'shadow-green-500/30',
    border: 'border-green-200 hover:border-green-400'
  },
  yellow: {
    gradient: 'from-yellow-500 to-yellow-600',
    shadow: 'shadow-yellow-500/30',
    border: 'border-yellow-200 hover:border-yellow-400'
  },
  red: {
    gradient: 'from-red-500 to-red-600',
    shadow: 'shadow-red-500/30',
    border: 'border-red-200 hover:border-red-400'
  },
  indigo: {
    gradient: 'from-indigo-500 to-indigo-600',
    shadow: 'shadow-indigo-500/30',
    border: 'border-indigo-200 hover:border-indigo-400'
  },
  slate: {
    gradient: 'from-slate-500 to-slate-600',
    shadow: 'shadow-slate-500/30',
    border: 'border-slate-200 hover:border-slate-400'
  },
  emerald: {
    gradient: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/30',
    border: 'border-emerald-200 hover:border-emerald-400'
  }
};

export default function DocumentLibrary({ trialOrgId, viewMode = 'both' }: DocumentLibraryProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
    fetchResources();
  }, [trialOrgId, viewMode]);

  useEffect(() => {
    filterResources();
  }, [resources, selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .order('sort_order');

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('document_library')
        .select('*, category:document_categories(*), creator:users(full_name)')
        .order('created_at', { ascending: false });

      if (viewMode === 'global') {
        query = query.eq('is_global', true);
      } else if (viewMode === 'org' && trialOrgId) {
        query = query.eq('trial_org_id', trialOrgId);
      } else if (viewMode === 'both' && trialOrgId) {
        query = query.or(`is_global.eq.true,trial_org_id.eq.${trialOrgId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedResources = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        link_url: r.link_url,
        link_type: r.link_type,
        category_id: r.category_id,
        is_global: r.is_global,
        trial_org_id: r.trial_org_id,
        tags: r.tags || [],
        created_at: r.created_at,
        created_by: r.created_by,
        category: r.category,
        creator_name: r.creator?.full_name,
      }));

      setResources(formattedResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    if (selectedCategory) {
      filtered = filtered.filter(r => r.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.title.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredResources(filtered);
  };

  const handleAddNote = (resourceId: string) => {
    setSelectedResource(resourceId);
    setShowNoteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin animation-delay-150" style={{ animationDirection: 'reverse' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse animation-delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-pink-400/10 via-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
      </div>

      <div className="relative z-10 space-y-8">
        {/* Header Section with Glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10" />
          <div className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/60 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/50 animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="relative inline-block">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white relative z-10">
                      Resource Library
                    </h1>
                    <div className="absolute -bottom-1 left-0 right-0 h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30 blur-sm rounded-full"></div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    {viewMode === 'global' ? 'Global resources for all trials' : viewMode === 'org' ? 'Organization-specific resources' : 'All available resources'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Add Resource
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources by title, description, or tags..."
                className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/50 hover:border-purple-500/50 hover:shadow-md'
            }`}
          >
            <Globe className="w-4 h-4" />
            All Resources
          </button>

          {categories.map((category) => {
            const Icon = ICON_MAP[category.icon] || FileText;
            const isSelected = selectedCategory === category.id;
            const colorClass = COLOR_CLASSES[category.color] || COLOR_CLASSES['blue'];

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                  isSelected
                    ? `bg-gradient-to-r ${colorClass.gradient} text-white shadow-lg ${colorClass.shadow} hover:scale-105`
                    : `backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border ${colorClass.border} hover:shadow-md`
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-6 rounded-3xl backdrop-blur-xl bg-white/60 dark:bg-slate-900/40 border border-white/20 shadow-xl mb-4">
              <FileText className="w-16 h-16 text-slate-300 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No resources found
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first resource'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                id={resource.id}
                title={resource.title}
                description={resource.description || undefined}
                linkUrl={resource.link_url}
                linkType={resource.link_type}
                categoryName={resource.category?.name}
                categoryColor={resource.category?.color}
                tags={resource.tags}
                createdAt={resource.created_at}
                createdByName={resource.creator_name}
                isOrgSpecific={!resource.is_global}
                onAddNote={trialOrgId ? handleAddNote : undefined}
                onEdit={() => {/* TODO */}}
                onDelete={() => {/* TODO */}}
              />
            ))}
          </div>
        )}
      </div>

      {/* View Mode Toggle (if both modes are available) */}
      {trialOrgId && (
        <div className="fixed bottom-8 right-8 flex items-center gap-2 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 rounded-2xl p-2 shadow-2xl">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium shadow-lg">
            <Globe className="w-4 h-4" />
            Global
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
            <Building className="w-4 h-4" />
            Org-Specific
          </button>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <AddResourceModal
          categories={categories}
          trialOrgId={trialOrgId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchResources();
          }}
        />
      )}

      {/* Add Note Modal */}
      {showNoteModal && selectedResource && trialOrgId && (
        <AddNoteModal
          resourceId={selectedResource}
          trialOrgId={trialOrgId}
          onClose={() => {
            setShowNoteModal(false);
            setSelectedResource(null);
          }}
          onSuccess={() => {
            setShowNoteModal(false);
            setSelectedResource(null);
          }}
        />
      )}
    </div>
  );
}

// Add Resource Modal Component
function AddResourceModal({
  categories,
  trialOrgId,
  onClose,
  onSuccess,
}: {
  categories: Category[];
  trialOrgId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link_url: '',
    link_type: 'onedrive' as 'onedrive' | 'google_drive' | 'external',
    category_id: '',
    is_global: !trialOrgId,
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase.from('document_library').insert({
        title: formData.title,
        description: formData.description || null,
        link_url: formData.link_url,
        link_type: formData.link_type,
        category_id: formData.category_id || null,
        is_global: formData.is_global,
        trial_org_id: formData.is_global ? null : trialOrgId,
        tags: tagsArray,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Resource added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Glassmorphism container */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl" />
          <div className="relative backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="relative inline-block">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white relative z-10">
                    Add New Resource
                  </h2>
                  <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 blur-sm rounded-full"></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Add a link to OneDrive, Google Drive, or external resource
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="e.g., Getting Started Guide"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Brief description of the resource..."
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Link URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="https://..."
                />
              </div>

              {/* Link Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Link Type *
                  </label>
                  <select
                    value={formData.link_type}
                    onChange={(e) => setFormData({ ...formData, link_type: e.target.value as any })}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  >
                    <option value="onedrive">OneDrive</option>
                    <option value="google_drive">Google Drive</option>
                    <option value="external">External Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="e.g., tutorial, advanced, video"
                />
              </div>

              {/* Global/Org-Specific Toggle */}
              {trialOrgId && (
                <div className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/50">
                  <input
                    type="checkbox"
                    id="is_global"
                    checked={formData.is_global}
                    onChange={(e) => setFormData({ ...formData, is_global: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_global" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Make this a global resource (available to all trial orgs)
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl backdrop-blur-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Adding...' : 'Add Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Note Modal Component
function AddNoteModal({
  resourceId,
  trialOrgId,
  onClose,
  onSuccess,
}: {
  resourceId: string;
  trialOrgId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Add note to resource_notes table
      const { error: noteError } = await supabase.from('resource_notes').insert({
        resource_id: resourceId,
        trial_org_id: trialOrgId,
        note_text: noteText,
        created_by: user?.id,
      });

      if (noteError) throw noteError;

      // Also log to activity feed
      const { error: activityError } = await supabase.from('trial_activities').insert({
        trial_org_id: trialOrgId,
        activity_type: 'feedback_received',
        title: 'Resource note added',
        description: noteText,
        metadata: { resource_id: resourceId },
        created_by: user?.id,
      });

      if (activityError) {
        console.warn('Failed to log activity:', activityError);
      }

      toast.success('Note added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative max-w-lg w-full">
        {/* Glassmorphism container */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-pink-500/20 backdrop-blur-xl" />
          <div className="relative backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="relative inline-block">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white relative z-10">
                    Add Note
                  </h2>
                  <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-blue-500 opacity-30 blur-sm rounded-full"></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  This note will be logged to the trial org activity feed
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Note
                </label>
                <textarea
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Add your note about this resource..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl backdrop-blur-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
