'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FileText, ExternalLink, MessageSquare, Plus, Folder,
  TrendingUp, Clock, Users, Loader2, Coffee, Zap,
  BookOpen, Lightbulb
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  link_url: string;
  link_type: string;
  tags: string[];
  folder_id: string | null;
  folder_name?: string;
  discussion_count: number;
  created_at: string;
  created_by_name?: string;
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
}

export default function InternalDocumentsSection() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'all' | 'trending' | 'recent'>('all');

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch internal folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('resource_folders')
        .select('*')
        .eq('visibility', 'internal')
        .order('sort_order');

      if (foldersError) throw foldersError;
      setFolders(foldersData || []);

      // Fetch internal resources with discussion counts
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('document_library')
        .select(`
          *,
          folder:resource_folders(name)
        `)
        .eq('visibility', 'internal')
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;

      if (!resourcesData || resourcesData.length === 0) {
        setResources([]);
        return;
      }

      // Batch fetch all discussion counts in one query
      const resourceIds = resourcesData.map((r: any) => r.id);
      const { data: discussionsData } = await supabase
        .from('resource_discussions')
        .select('resource_id')
        .in('resource_id', resourceIds);

      // Count discussions per resource
      const discussionCountMap = new Map<string, number>();
      (discussionsData || []).forEach((d: any) => {
        discussionCountMap.set(d.resource_id, (discussionCountMap.get(d.resource_id) || 0) + 1);
      });

      // Map resources with counts (no more N+1!)
      const resourcesWithCounts = resourcesData.map((resource: any) => ({
        ...resource,
        folder_name: resource.folder?.name,
        discussion_count: discussionCountMap.get(resource.id) || 0,
      }));

      setResources(resourcesWithCounts);
    } catch (error: any) {
      console.error('Error fetching internal resources:', error);
      toast.error('Failed to load internal resources');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort resources
  const filteredResources = resources.filter((resource) => {
    // Folder filter
    if (selectedFolder) {
      return resource.folder_id === selectedFolder;
    }

    return true;
  });

  // Sort by view type
  const sortedResources = [...filteredResources].sort((a, b) => {
    if (view === 'trending') {
      return b.discussion_count - a.discussion_count;
    } else if (view === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  // Fun empty state messages
  const getEmptyStateMessage = () => {
    if (selectedFolder) {
      return {
        icon: Folder,
        title: "Folder's a bit empty",
        subtitle: "Like a conference room before the donuts arrive. Add some resources!",
        emoji: "📂"
      };
    }
    return {
      icon: BookOpen,
      title: "No internal docs yet",
      subtitle: "Time to share that secret playbook everyone keeps asking about!",
      emoji: "📚"
    };
  };

  const emptyState = getEmptyStateMessage();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="text-gray-600 font-medium">Loading your secret sauce...</span>
          <span className="text-xs text-gray-500">🔍 Finding those playbooks</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar */}
      <div className="col-span-12 lg:col-span-3 space-y-4">
        {/* View Filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Quick Views
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setView('all')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                view === 'all' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              All Documents
            </button>
            <button
              onClick={() => setView('trending')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                view === 'trending' ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              🔥 Trending
            </button>
            <button
              onClick={() => setView('recent')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                view === 'recent' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              Latest Drops
            </button>
          </div>
        </div>

        {/* Folders */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Folders
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                !selectedFolder ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              All Folders
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedFolder === folder.id
                    ? `bg-${folder.color}-50 text-${folder.color}-700 font-medium`
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={folder.description || undefined}
              >
                <Lightbulb className="w-4 h-4" />
                <span className="flex-1 text-left truncate">{folder.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fun Stats Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-900">{resources.length}</p>
            <p className="text-xs text-purple-700 font-medium">Resources</p>
            <p className="text-xs text-purple-600 mt-2">💡 Collective brain power!</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="col-span-12 lg:col-span-9">
        {sortedResources.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-12 text-center">
            <emptyState.icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-4xl mb-3">{emptyState.emoji}</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{emptyState.title}</h3>
            <p className="text-gray-600 mb-6">{emptyState.subtitle}</p>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Resource
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with count */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {view === 'trending' && '🔥 Trending Resources'}
                  {view === 'recent' && '✨ Latest Resources'}
                  {view === 'all' && 'All Resources'}
                </h2>
                <p className="text-sm text-gray-600">
                  {sortedResources.length} {sortedResources.length === 1 ? 'resource' : 'resources'}
                  {view === 'trending' && ' • Sorted by discussion activity'}
                  {view === 'recent' && ' • Fresh off the press'}
                </p>
              </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Resource
              </button>
            </div>

            {/* Resource Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedResources.map((resource) => (
                <div
                  key={resource.id}
                  className="group bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">
                          {resource.title}
                        </h4>
                        {resource.folder_name && (
                          <p className="text-xs text-purple-600 font-medium">
                            📁 {resource.folder_name}
                          </p>
                        )}
                      </div>
                      {resource.discussion_count > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-lg">
                          <MessageSquare className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-bold text-purple-700">
                            {resource.discussion_count}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {resource.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {resource.description}
                      </p>
                    )}

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}</span>
                      </div>
                      <a
                        href={resource.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
