'use client';

import { useState, useEffect } from 'react';
import { useFeatureRoadmapLinks, LinkedFeature, LinkedRoadmapItem } from '@/hooks/useFeatureRoadmapLinks';

interface LinkedItemsDisplayProps {
  orgId: string;
  itemId: string;
  type: 'feature' | 'roadmap'; // 'feature' shows roadmap items, 'roadmap' shows features
  title: string;
  onLinkClick?: () => void;
}

const LINK_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  implements: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Implements' },
  addresses: { bg: 'bg-blue-100', text: 'text-blue-800', label: '→ Addresses' },
  related_to: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '~ Related' },
  blocks: { bg: 'bg-red-100', text: 'text-red-800', label: '⊢ Blocks' },
  blocked_by: { bg: 'bg-orange-100', text: 'text-orange-800', label: '⊣ Blocked By' },
};

export default function LinkedItemsDisplay({
  orgId,
  itemId,
  type,
  title,
  onLinkClick,
}: LinkedItemsDisplayProps) {
  const [items, setItems] = useState<(LinkedFeature | LinkedRoadmapItem)[]>([]);
  const [loading, setLoading] = useState(false);
  const {
    getLinkedFeaturesForRoadmap,
    getLinkedRoadmapItems,
  } = useFeatureRoadmapLinks(orgId);

  useEffect(() => {
    fetchLinkedItems();
  }, [itemId, type]);

  const fetchLinkedItems = async () => {
    setLoading(true);
    try {
      if (type === 'feature') {
        const data = await getLinkedRoadmapItems(itemId);
        setItems(data);
      } else {
        const data = await getLinkedFeaturesForRoadmap(itemId);
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching linked items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 p-3">
        Loading {type === 'feature' ? 'linked roadmap items' : 'linked features'}...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-sm text-gray-600">
          No linked {type === 'feature' ? 'roadmap items' : 'features'}
        </span>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            + Link
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Linked {type === 'feature' ? 'Roadmap Items' : 'Features'}
        </h4>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            + Link More
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.map(item => {
          const linkTypeColor = LINK_TYPE_COLORS[item.link_type] || LINK_TYPE_COLORS.related_to;
          return (
            <div
              key={item.id}
              className="p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900 line-clamp-2">
                    {item.title}
                  </h5>
                </div>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${linkTypeColor.bg} ${linkTypeColor.text}`}>
                  {linkTypeColor.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {item.status}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {item.priority}
                </span>
                {type === 'feature' && 'target_date' in item && item.target_date && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">
                    {new Date(item.target_date).toLocaleDateString()}
                  </span>
                )}
                {type === 'roadmap' && 'votes' in item && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                    {item.votes} votes
                  </span>
                )}
              </div>

              {item.notes && (
                <p className="mt-2 text-xs text-gray-600 italic">
                  {item.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
