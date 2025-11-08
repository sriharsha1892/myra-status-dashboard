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
  onedrive: { label: 'OneDrive', color: 'from-blue-500 to-blue-600', icon: '📁' },
  google_drive: { label: 'Google Drive', color: 'from-green-500 to-green-600', icon: '📂' },
  external: { label: 'Link', color: 'from-purple-500 to-purple-600', icon: '🔗' },
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
    <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-20 blur"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                    Resource Library
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {filteredResources.length} resources • {categories.length} categories
                  </p>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
                <button
                  onClick={() => setViewType('grid')}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    viewType === 'grid'
                      ? 'bg-white/10 text-white shadow-lg'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    viewType === 'list'
                      ? 'bg-white/10 text-white shadow-lg'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button className="group relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Resource
                </div>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources, tags, or descriptions..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
              />
            </div>
            <button className="p-3.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`group relative px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105 whitespace-nowrap ${
              !selectedCategory
                ? 'bg-white/10 text-white shadow-lg shadow-white/10 border border-white/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
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
                className={`group relative px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105 whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-white/10 text-white shadow-lg shadow-white/10 border border-white/20'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                <Icon className="w-4 h-4 inline-block mr-2" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Resources Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
              <p className="text-gray-500">Loading resources...</p>
            </div>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center mx-auto">
                <FileText className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-xl font-medium text-gray-400">No resources found</p>
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
                  {/* Magnetic Hover Effect Background */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-500"></div>

                  {/* Card */}
                  <div className="relative h-full rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]">
                    {/* Content */}
                    <div className="p-6 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300">
                            {resource.title}
                          </h3>
                          {resource.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        <div className={`shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r ${linkConfig.color} text-white text-xs font-medium shadow-lg`}>
                          {linkConfig.icon} {linkConfig.label}
                        </div>
                      </div>

                      {/* Tags */}
                      {resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {resource.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {resource.tags.length > 3 && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-gray-500 border border-white/10">
                              +{resource.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <RelativeTime
                          date={resource.created_at}
                          className="text-xs text-gray-600"
                        />

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <a
                            href={resource.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-110"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Shine Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
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
