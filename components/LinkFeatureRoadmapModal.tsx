'use client';

import { useState, useEffect } from 'react';
import { useFeatureRoadmapLinks } from '@/hooks/useFeatureRoadmapLinks';
import { createClient } from '@/lib/supabase/client';

interface LinkFeatureRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  mode: 'feature' | 'roadmap'; // 'feature' means linking roadmap items to a feature, 'roadmap' means linking features to a roadmap item
  selectedId: string; // feature_id or roadmap_id depending on mode
  selectedTitle: string;
  onSuccess: () => void;
}

const LINK_TYPES = [
  { value: 'implements', label: 'Implements', description: 'This roadmap item implements this feature' },
  { value: 'addresses', label: 'Addresses', description: 'This roadmap item addresses this feature' },
  { value: 'related_to', label: 'Related To', description: 'Related but not directly implementing' },
  { value: 'blocks', label: 'Blocks', description: 'This roadmap item is blocked by this feature' },
  { value: 'blocked_by', label: 'Blocked By', description: 'This roadmap item blocks this feature' },
];

export default function LinkFeatureRoadmapModal({
  isOpen,
  onClose,
  orgId,
  mode,
  selectedId,
  selectedTitle,
  onSuccess,
}: LinkFeatureRoadmapModalProps) {
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedLinkType, setSelectedLinkType] = useState('implements');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { linkFeatureToRoadmap } = useFeatureRoadmapLinks(orgId);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableItems();
    }
  }, [isOpen, mode, selectedId]);

  const fetchAvailableItems = async () => {
    setLoading(true);
    try {
      if (mode === 'feature') {
        // Fetch roadmap items for this organization
        const { data, error } = await supabase
          .from('org_product_roadmap')
          .select('id, title, status, priority, target_date')
          .eq('org_id', orgId)
          .order('target_date', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailableItems(data || []);
      } else {
        // Fetch features for this organization
        const { data, error } = await supabase
          .from('feature_requests')
          .select('id, title, status, priority, votes')
          .eq('org_id', orgId)
          .order('votes', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailableItems(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching available items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkItem = async (itemId: string) => {
    try {
      setLoading(true);
      if (mode === 'feature') {
        await linkFeatureToRoadmap(selectedId, itemId, selectedLinkType, notes);
      } else {
        await linkFeatureToRoadmap(itemId, selectedId, selectedLinkType, notes);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error linking items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = availableItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Link {mode === 'feature' ? 'Roadmap Items' : 'Features'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === 'feature'
                ? `Select roadmap items to link with: ${selectedTitle}`
                : `Select features to link with: ${selectedTitle}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Link Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Link Type</label>
            <select
              value={selectedLinkType}
              onChange={(e) => setSelectedLinkType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {LINK_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this linking..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search {mode === 'feature' ? 'Roadmap Items' : 'Features'}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search by title...`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Available Items List */}
          <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? 'No items match your search' : 'No items available'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {item.status || 'Unknown'}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {item.priority || 'Medium'}
                        </span>
                        {mode === 'feature' && item.target_date && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            {new Date(item.target_date).toLocaleDateString()}
                          </span>
                        )}
                        {mode === 'roadmap' && item.votes !== undefined && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                            {item.votes} votes
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLinkItem(item.id)}
                      disabled={loading}
                      className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Link
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
