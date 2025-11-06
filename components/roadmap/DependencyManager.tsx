'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Plus, AlertCircle, CheckCircle2, Link2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface RoadmapItem {
  id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  blocked_by_ids: string[] | null;
  blocks_ids: string[] | null;
}

interface DependencyManagerProps {
  itemId: string;
  orgId: string;
  currentItem: RoadmapItem;
  allItems: RoadmapItem[];
  onUpdate: () => void;
}

export default function DependencyManager({
  itemId,
  orgId,
  currentItem,
  allItems,
  onUpdate,
}: DependencyManagerProps) {
  const [showAddBlocker, setShowAddBlocker] = useState(false);
  const [showAddBlocks, setShowAddBlocks] = useState(false);
  const [selectedBlockerId, setSelectedBlockerId] = useState<string>('');
  const [selectedBlocksId, setSelectedBlocksId] = useState<string>('');
  const supabase = createClient();

  const blockedByItems = allItems.filter((item) =>
    currentItem.blocked_by_ids?.includes(item.id)
  );

  const blocksItems = allItems.filter((item) =>
    currentItem.blocks_ids?.includes(item.id)
  );

  const availableBlockers = allItems.filter(
    (item) =>
      item.id !== itemId &&
      !currentItem.blocked_by_ids?.includes(item.id) &&
      // Prevent circular dependencies
      !item.blocked_by_ids?.includes(itemId)
  );

  const availableBlocksItems = allItems.filter(
    (item) =>
      item.id !== itemId &&
      !currentItem.blocks_ids?.includes(item.id) &&
      // Prevent circular dependencies
      !item.blocks_ids?.includes(itemId)
  );

  const addBlocker = async () => {
    if (!selectedBlockerId) return;

    const updatedBlockedBy = [...(currentItem.blocked_by_ids || []), selectedBlockerId];

    const { error } = await supabase
      .from('org_product_roadmap')
      .update({
        blocked_by_ids: updatedBlockedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('org_id', orgId);

    if (error) {
      console.error('Error adding blocker:', error);
      toast.error('Failed to add blocker');
      return;
    }

    // Also update the blocker item's blocks_ids
    const blockerItem = allItems.find((item) => item.id === selectedBlockerId);
    if (blockerItem) {
      const updatedBlocks = [...(blockerItem.blocks_ids || []), itemId];
      await supabase
        .from('org_product_roadmap')
        .update({
          blocks_ids: updatedBlocks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBlockerId)
        .eq('org_id', orgId);
    }

    toast.success('Blocker added');
    setShowAddBlocker(false);
    setSelectedBlockerId('');
    onUpdate();
  };

  const removeBlocker = async (blockerId: string) => {
    const updatedBlockedBy = currentItem.blocked_by_ids?.filter((id) => id !== blockerId) || [];

    const { error } = await supabase
      .from('org_product_roadmap')
      .update({
        blocked_by_ids: updatedBlockedBy.length > 0 ? updatedBlockedBy : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('org_id', orgId);

    if (error) {
      console.error('Error removing blocker:', error);
      toast.error('Failed to remove blocker');
      return;
    }

    // Also update the blocker item's blocks_ids
    const blockerItem = allItems.find((item) => item.id === blockerId);
    if (blockerItem) {
      const updatedBlocks = blockerItem.blocks_ids?.filter((id) => id !== itemId) || [];
      await supabase
        .from('org_product_roadmap')
        .update({
          blocks_ids: updatedBlocks.length > 0 ? updatedBlocks : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', blockerId)
        .eq('org_id', orgId);
    }

    toast.success('Blocker removed');
    onUpdate();
  };

  const addBlocks = async () => {
    if (!selectedBlocksId) return;

    const updatedBlocks = [...(currentItem.blocks_ids || []), selectedBlocksId];

    const { error } = await supabase
      .from('org_product_roadmap')
      .update({
        blocks_ids: updatedBlocks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('org_id', orgId);

    if (error) {
      console.error('Error adding blocks:', error);
      toast.error('Failed to add dependency');
      return;
    }

    // Also update the blocked item's blocked_by_ids
    const blockedItem = allItems.find((item) => item.id === selectedBlocksId);
    if (blockedItem) {
      const updatedBlockedBy = [...(blockedItem.blocked_by_ids || []), itemId];
      await supabase
        .from('org_product_roadmap')
        .update({
          blocked_by_ids: updatedBlockedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBlocksId)
        .eq('org_id', orgId);
    }

    toast.success('Dependency added');
    setShowAddBlocks(false);
    setSelectedBlocksId('');
    onUpdate();
  };

  const removeBlocks = async (blocksId: string) => {
    const updatedBlocks = currentItem.blocks_ids?.filter((id) => id !== blocksId) || [];

    const { error } = await supabase
      .from('org_product_roadmap')
      .update({
        blocks_ids: updatedBlocks.length > 0 ? updatedBlocks : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('org_id', orgId);

    if (error) {
      console.error('Error removing blocks:', error);
      toast.error('Failed to remove dependency');
      return;
    }

    // Also update the blocked item's blocked_by_ids
    const blockedItem = allItems.find((item) => item.id === blocksId);
    if (blockedItem) {
      const updatedBlockedBy = blockedItem.blocked_by_ids?.filter((id) => id !== itemId) || [];
      await supabase
        .from('org_product_roadmap')
        .update({
          blocked_by_ids: updatedBlockedBy.length > 0 ? updatedBlockedBy : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', blocksId)
        .eq('org_id', orgId);
    }

    toast.success('Dependency removed');
    onUpdate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  const hasActiveBlockers = blockedByItems.some((item) => item.status !== 'completed');

  return (
    <div className="space-y-4">
      {/* Warning if trying to complete with active blockers */}
      {hasActiveBlockers && currentItem.status !== 'completed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">This item is blocked</p>
            <p>Complete or remove blocking items before marking this as done.</p>
          </div>
        </div>
      )}

      {/* Blocked By Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Blocked By ({blockedByItems.length})
          </h4>
          <button
            onClick={() => setShowAddBlocker(!showAddBlocker)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Add Blocker UI */}
        {showAddBlocker && (
          <div className="mb-2 flex gap-2">
            <select
              value={selectedBlockerId}
              onChange={(e) => setSelectedBlockerId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an item...</option>
              {availableBlockers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.status})
                </option>
              ))}
            </select>
            <button
              onClick={addBlocker}
              disabled={!selectedBlockerId}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddBlocker(false)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Blocked By List */}
        {blockedByItems.length > 0 ? (
          <div className="space-y-2">
            {blockedByItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm"
              >
                <div className="flex items-center gap-2 flex-1">
                  {getStatusIcon(item.status)}
                  <span className="text-gray-900">{item.title}</span>
                  <span className="text-xs text-gray-500 capitalize">({item.status})</span>
                </div>
                <button
                  onClick={() => removeBlocker(item.id)}
                  className="text-gray-400 hover:text-red-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No blockers</p>
        )}
      </div>

      {/* Blocks Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Blocks ({blocksItems.length})
          </h4>
          <button
            onClick={() => setShowAddBlocks(!showAddBlocks)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Add Blocks UI */}
        {showAddBlocks && (
          <div className="mb-2 flex gap-2">
            <select
              value={selectedBlocksId}
              onChange={(e) => setSelectedBlocksId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an item...</option>
              {availableBlocksItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.status})
                </option>
              ))}
            </select>
            <button
              onClick={addBlocks}
              disabled={!selectedBlocksId}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddBlocks(false)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Blocks List */}
        {blocksItems.length > 0 ? (
          <div className="space-y-2">
            {blocksItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm"
              >
                <div className="flex items-center gap-2 flex-1">
                  {getStatusIcon(item.status)}
                  <span className="text-gray-900">{item.title}</span>
                  <span className="text-xs text-gray-500 capitalize">({item.status})</span>
                </div>
                <button
                  onClick={() => removeBlocks(item.id)}
                  className="text-gray-400 hover:text-red-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No dependencies</p>
        )}
      </div>
    </div>
  );
}
