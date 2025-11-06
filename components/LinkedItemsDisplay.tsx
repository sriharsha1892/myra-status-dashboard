/**
 * LinkedItemsDisplay Component
 * Displays linked roadmap items or feature requests
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExternalLink, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface LinkedItemsDisplayProps {
  orgId: string;
  itemId: string;
  type: 'feature' | 'roadmap';
  title: string;
  onLinkClick: () => void;
}

interface LinkedItem {
  id: string;
  link_id: string;
  link_type: string;
  title: string;
  status: string;
  description?: string;
}

export default function LinkedItemsDisplay({
  orgId,
  itemId,
  type,
  title,
  onLinkClick
}: LinkedItemsDisplayProps) {
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchLinkedItems();
  }, [itemId, type]);

  const fetchLinkedItems = async () => {
    try {
      setLoading(true);

      if (type === 'feature') {
        // Fetch roadmap items linked to this feature
        const { data, error } = await supabase
          .from('feature_roadmap_links')
          .select(`
            id,
            link_type,
            roadmap_item:product_roadmap (
              id,
              title,
              description,
              status
            )
          `)
          .eq('feature_request_id', itemId);

        if (error) throw error;

        setLinkedItems(
          (data || []).map((link: any) => ({
            id: link.roadmap_item?.id || '',
            link_id: link.id,
            link_type: link.link_type,
            title: link.roadmap_item?.title || 'Untitled',
            description: link.roadmap_item?.description,
            status: link.roadmap_item?.status || 'planned'
          }))
        );
      } else {
        // Fetch features linked to this roadmap item
        const { data, error } = await supabase
          .from('feature_roadmap_links')
          .select(`
            id,
            link_type,
            feature_request:feature_requests (
              id,
              title,
              description,
              status
            )
          `)
          .eq('roadmap_item_id', itemId);

        if (error) throw error;

        setLinkedItems(
          (data || []).map((link: any) => ({
            id: link.feature_request?.id || '',
            link_id: link.id,
            link_type: link.link_type,
            title: link.feature_request?.title || 'Untitled',
            description: link.feature_request?.description,
            status: link.feature_request?.status || 'submitted'
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching linked items:', error);
      toast.error('Failed to load linked items');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (linkId: string) => {
    if (!confirm('Are you sure you want to remove this link?')) return;

    try {
      const { error } = await supabase
        .from('feature_roadmap_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Link removed successfully');
      fetchLinkedItems();
    } catch (error) {
      console.error('Error unlinking item:', error);
      toast.error('Failed to remove link');
    }
  };

  const getLinkTypeLabel = (linkType: string) => {
    const labels: Record<string, string> = {
      implements: 'Implements',
      addresses: 'Addresses',
      related_to: 'Related to',
      blocks: 'Blocks',
      blocked_by: 'Blocked by'
    };
    return labels[linkType] || linkType;
  };

  const getLinkTypeColor = (linkType: string) => {
    const colors: Record<string, string> = {
      implements: 'bg-green-50 text-green-700 border-green-200',
      addresses: 'bg-blue-50 text-blue-700 border-blue-200',
      related_to: 'bg-slate-50 text-slate-700 border-slate-200',
      blocks: 'bg-red-50 text-red-700 border-red-200',
      blocked_by: 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[linkType] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="text-sm text-slate-500 italic">Loading linked items...</div>
    );
  }

  if (linkedItems.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <AlertCircle className="w-4 h-4" />
        <span>No linked {type === 'feature' ? 'roadmap items' : 'features'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">
          Linked {type === 'feature' ? 'Roadmap Items' : 'Features'} ({linkedItems.length})
        </h4>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {linkedItems.map((item) => (
            <div
              key={item.link_id}
              className="flex items-start justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getLinkTypeColor(item.link_type)}`}>
                    {getLinkTypeLabel(item.link_type)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-white rounded border border-slate-200 capitalize">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1">{item.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={onLinkClick}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="View details"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleUnlink(item.link_id)}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="Remove link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
