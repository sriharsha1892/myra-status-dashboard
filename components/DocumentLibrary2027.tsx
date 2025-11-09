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
  onedrive: { label: 'OneDrive', color: 'from-blue-500 to-blue-600' },
  google_drive: { label: 'Google Drive', color: 'from-green-500 to-green-600' },
  external: { label: 'Link', color: 'from-purple-500 to-purple-600' },
};

export default function DocumentLibrary2027({ trialOrgId, viewMode = 'both' }: DocumentLibrary2027Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-8 shadow-sm sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Resource Library
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {filteredResources.length} resources • {categories.length} categories
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

              <button className="flex items-center gap-2 h-9 px-3 sm:px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex-1 sm:flex-none justify-center">
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">Add Resource</span>
                <span className="xs:hidden sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 sm:gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources..."
              className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <button
            className="p-2.5 sm:p-3 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
            aria-label="Filters"
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              !selectedCategory
                ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Resources
          </button>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {cat.name}
              </button>
            );
          })}
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
          <div className={viewType === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredResources.map((resource) => {
              const linkConfig = LINK_TYPE_CONFIG[resource.link_type];

              return (
                <div
                  key={resource.id}
                  className="group relative"
                >
                  {/* Card */}
                  <div className="relative h-full rounded-xl bg-white border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1">
                    {/* Content */}
                    <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {resource.title}
                          </h3>
                          {resource.description && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        <div className={`shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-gradient-to-r ${linkConfig.color} text-white text-[10px] sm:text-xs font-medium shadow-sm whitespace-nowrap`}>
                          {linkConfig.label}
                        </div>
                      </div>

                      {/* Tags */}
                      {resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {resource.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                          {resource.tags.length > 3 && (
                            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-500">
                              +{resource.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <RelativeTime
                          date={resource.created_at}
                          className="text-xs text-gray-500"
                        />

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <a
                            href={resource.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 transition-all hover:scale-110"
                            aria-label="Open resource"
                          >
                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </a>
                          <button
                            className="p-1.5 sm:p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label="Add comment"
                          >
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            className="p-1.5 sm:p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label="Edit resource"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
    </div>
  );
}
