'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Folder, FileText, ExternalLink, Share2, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  link_url: string;
  link_type: string;
  thumbnail_url: string | null;
  category_id: string;
  category_name: string;
  tags: string[];
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  resource_count?: number;
}

export default function ExternalResourcesTab() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch external folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('resource_folders')
        .select('*')
        .eq('visibility', 'external')
        .order('sort_order');

      if (foldersError) throw foldersError;
      setFolders(foldersData || []);

      // Fetch external resources with category names
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('document_library')
        .select(`
          *,
          category:document_categories(name)
        `)
        .eq('visibility', 'external')
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;

      // Transform data to include category name
      const transformedResources = (resourcesData || []).map((r: any) => ({
        ...r,
        category_name: r.category?.name || 'Uncategorized'
      }));

      setResources(transformedResources);
    } catch (error: any) {
      console.error('Error fetching external resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  // Filter resources based on search and selected folder
  const filteredResources = resources.filter((resource) => {
    // Search filter
    // Folder filter
    if (selectedFolder) {
      return resource.folder_id === selectedFolder;
    }

    return true;
  });

  const copyShareLink = (resourceId: string, title: string) => {
    const shareUrl = `${window.location.origin}/resources/${resourceId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(`Share link copied for "${title}"`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-gray-600 font-medium">Loading resources...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar - Folders */}
      <div className="col-span-12 lg:col-span-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-4 sticky top-32">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Categories
          </h3>

          <div className="space-y-1">
            {/* All Resources */}
            <button
              onClick={() => setSelectedFolder(null)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${!selectedFolder
                  ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <BookOpen className="w-4 h-4" />
              <span className="flex-1 text-left">All Resources</span>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-md font-semibold">
                {resources.length}
              </span>
            </button>

            {/* Folder List */}
            {folders.map((folder) => {
              const folderResources = resources.filter((r) => r.folder_id === folder.id);
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                    ${selectedFolder === folder.id
                      ? `bg-${folder.color}-50 text-${folder.color}-700 font-medium border border-${folder.color}-200`
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Folder className={`w-4 h-4 text-${folder.color}-500`} />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-md font-semibold">
                    {folderResources.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Resource Grid */}
      <div className="col-span-12 lg:col-span-9">
        {filteredResources.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600 text-sm">
              No resources in this category yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className="group bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* Card Content */}
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                        {resource.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {resource.category_name}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyShareLink(resource.id, resource.title);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copy share link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
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
                      {resource.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{resource.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer - Open Link Button */}
                  <a
                    href={resource.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Resource</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
