'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  Plus, Search, X, Sparkles, ExternalLink, MessageCircle,
  Trash2, Edit, ChevronRight, Filter, Grid3x3, List,
  Rocket, GraduationCap, Code, Star, LifeBuoy, FileText,
  Scale, TrendingUp, Loader2
} from 'lucide-react';
import RelativeTime from '@/components/ui/RelativeTime';
import MentionTextEditor from '@/components/MentionTextEditor';

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

interface DocumentLibrary2027Props {
  trialOrgId?: string;
  viewMode?: 'global' | 'org' | 'both';
}

const ICON_MAP: Record<string, any> = {
  Rocket, GraduationCap, Code, Star, LifeBuoy, FileText, Scale, TrendingUp, Sparkles
};

const LINK_TYPE_CONFIG = {
  onedrive: { label: 'OneDrive', dotColor: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  google_drive: { label: 'Google Drive', dotColor: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
  external: { label: 'Link', dotColor: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' },
};

const CATEGORY_COLORS: Record<string, string> = {
  blue: 'border-blue-500',
  purple: 'border-purple-500',
  green: 'border-green-500',
  yellow: 'border-yellow-500',
  red: 'border-red-500',
  indigo: 'border-indigo-500',
  slate: 'border-slate-500',
  emerald: 'border-emerald-500',
};

export default function DocumentLibrary2027({ trialOrgId, viewMode = 'both' }: DocumentLibrary2027Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
    fetchResources();
  }, [trialOrgId, viewMode]);

  useEffect(() => {
    filterResources();
  }, [resources, selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('document_library')
        .select('*, category:document_categories(*)')
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
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredResources(filtered);
  };

  const getCategoryIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || FileText;
    return Icon;
  };

  const handleEditClick = (resource: Resource) => {
    setEditingResource(resource);
    setShowEditModal(true);
  };

  const handleDeleteResource = async (resourceId: string, resourceTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${resourceTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('document_library')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      toast.success('Resource deleted successfully');
      fetchResources();
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5 mb-8 sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    Resource Library
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">
                    {filteredResources.length} resources · {categories.length} categories
                  </p>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200">
                <button
                  onClick={() => setViewType('grid')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewType === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewType === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 h-9 px-3 sm:px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex-1 sm:flex-none justify-center"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">Add Resource</span>
                <span className="xs:hidden sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Category Filter - Clean Linear Style */}
        <div className="flex items-center gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="appearance-none pl-3 pr-8 py-2 text-sm rounded-md bg-white border border-gray-200 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-all cursor-pointer hover:bg-gray-50"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
          </div>
        </div>

        {/* Resources Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-600">Loading resources...</p>
            </div>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-900">No resources found</p>
              <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className={viewType === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredResources.map((resource) => {
              const linkConfig = LINK_TYPE_CONFIG[resource.link_type];
              const categoryColor = resource.category?.color ? CATEGORY_COLORS[resource.category.color] : 'border-gray-300';
              const CategoryIcon = resource.category ? getCategoryIcon(resource.category.icon) : FileText;

              return (
                <div
                  key={resource.id}
                  className="group relative"
                >
                  {/* Clean Linear-inspired Card */}
                  <div className="relative h-full bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-300 hover:shadow-sm">

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Title & Category */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">
                            {resource.title}
                          </h3>

                          {/* Category badge */}
                          {resource.category && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <CategoryIcon className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{resource.category.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Link type indicator */}
                        <div className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${linkConfig.bgColor} ${linkConfig.textColor}`}>
                          {linkConfig.label}
                        </div>
                      </div>

                      {/* Description */}
                      {resource.description && (
                        <div
                          className="text-xs text-gray-600 line-clamp-2 prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{ __html: resource.description }}
                        />
                      )}

                      {/* Tags */}
                      {resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {resource.tags.slice(0, 4).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                          {resource.tags.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                              +{resource.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer - Clean Actions Row */}
                      <div className="flex items-center justify-between pt-2 mt-1">
                        <RelativeTime
                          date={resource.created_at}
                          className="text-xs text-gray-400"
                        />

                        {/* Actions - Compact */}
                        <div className="flex items-center gap-0.5">
                          <a
                            href={resource.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Open"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {trialOrgId && (
                            <button
                              onClick={() => {
                                setSelectedResource(resource.id);
                                setShowNoteModal(true);
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                              title="Comment"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditClick(resource)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(resource.id, resource.title)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

      {/* Edit Resource Modal */}
      {showEditModal && editingResource && (
        <AddResourceModal
          categories={categories}
          trialOrgId={trialOrgId}
          existingResource={editingResource}
          onClose={() => {
            setShowEditModal(false);
            setEditingResource(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingResource(null);
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
  existingResource,
  onClose,
  onSuccess,
}: {
  categories: Category[];
  trialOrgId?: string;
  existingResource?: Resource;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!existingResource;

  const [formData, setFormData] = useState({
    title: existingResource?.title || '',
    description: existingResource?.description || '',
    link_url: existingResource?.link_url || '',
    link_type: (existingResource?.link_type || 'onedrive') as 'onedrive' | 'google_drive' | 'external',
    category_id: existingResource?.category_id || '',
    is_global: existingResource?.is_global ?? !trialOrgId,
    tags: existingResource?.tags.join(', ') || '',
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

      const resourceData = {
        title: formData.title,
        description: formData.description || null,
        link_url: formData.link_url,
        link_type: formData.link_type,
        category_id: formData.category_id || null,
        is_global: formData.is_global,
        trial_org_id: formData.is_global ? null : trialOrgId,
        tags: tagsArray,
      };

      if (isEdit && existingResource) {
        const { error } = await supabase
          .from('document_library')
          .update(resourceData)
          .eq('id', existingResource.id);

        if (error) throw error;
        toast.success('Resource updated successfully!');
      } else {
        const { error } = await supabase.from('document_library').insert({
          ...resourceData,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success('Resource added successfully!');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error(`Failed to ${isEdit ? 'update' : 'add'} resource`);
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
          <div className="relative backdrop-blur-xl bg-white/95 dark:bg-slate-800/95 border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="relative inline-block">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white relative z-10">
                    {isEdit ? 'Edit Resource' : 'Add New Resource'}
                  </h2>
                  <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 blur-sm rounded-full"></div>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                  {isEdit ? 'Update resource information' : 'Add a link to OneDrive, Google Drive, or external resource'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g., Getting Started Guide"
                />
              </div>

              {/* Description with WYSIWYG */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200 mb-2">
                  Description
                </label>
                <div className="rounded-xl backdrop-blur-sm bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600">
                  <MentionTextEditor
                    content={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Brief description of the resource..."
                    minHeight={120}
                  />
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Link URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="https://..."
                />
              </div>

              {/* Link Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Link Type *
                  </label>
                  <select
                    value={formData.link_type}
                    onChange={(e) => setFormData({ ...formData, link_type: e.target.value as any })}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="onedrive">OneDrive</option>
                    <option value="google_drive">Google Drive</option>
                    <option value="external">External Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g., tutorial, advanced, video"
                />
              </div>

              {/* Global/Org-Specific Toggle */}
              {trialOrgId && (
                <div className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm bg-neutral-50/50 dark:bg-slate-800/50 border border-neutral-200/50">
                  <input
                    type="checkbox"
                    id="is_global"
                    checked={formData.is_global}
                    onChange={(e) => setFormData({ ...formData, is_global: e.target.checked })}
                    className="w-4 h-4 rounded text-accent-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_global" className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                    Make this a global resource (available to all trial orgs)
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl backdrop-blur-sm bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 font-medium hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl bg-accent-500 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 transition-all"
                >
                  {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Resource' : 'Add Resource')}
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
        activity_type_id: '3a1f77cc-9999-4444-8888-feedback000001', // feedback_received type
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
          <div className="absolute inset-0 bg-gradient-to-br from-accent-500/20 via-blue-500/20 to-pink-500/20 backdrop-blur-xl" />
          <div className="relative backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="relative inline-block">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white relative z-10">
                    Add Note
                  </h2>
                  <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-blue-500 opacity-30 blur-sm rounded-full"></div>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                  This note will be logged to the trial org activity feed
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200 mb-2">
                  Note
                </label>
                <div className="rounded-xl backdrop-blur-sm bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600">
                  <MentionTextEditor
                    content={noteText}
                    onChange={(html) => setNoteText(html)}
                    placeholder="Add your note about this resource..."
                    minHeight={150}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl backdrop-blur-sm bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 font-medium hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
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
