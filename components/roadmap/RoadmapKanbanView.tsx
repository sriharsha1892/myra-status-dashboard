'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AlertCircle, CheckCircle2, Clock, XCircle, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/utils/errorHandler';

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date: string | null;
  estimated_completion_date: string | null;
  created_at: string;
  updated_at: string;
  linked_features: string[] | null;
  blocked_by_ids: string[] | null;
  blocks_ids: string[] | null;
}

interface RoadmapKanbanViewProps {
  orgId?: string | null; // Optional to support global roadmap items
  onItemClick: (itemId: string) => void;
  items: RoadmapItem[];
  onUpdate: () => void;
}

const COLUMNS = {
  planned: {
    title: 'Planned',
    icon: Clock,
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100 text-blue-800',
  },
  in_progress: {
    title: 'In Progress',
    icon: AlertCircle,
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-100 text-yellow-800',
  },
  completed: {
    title: 'Completed',
    icon: CheckCircle2,
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100 text-green-800',
  },
  cancelled: {
    title: 'Cancelled',
    icon: XCircle,
    color: 'bg-gray-50 border-gray-200',
    headerColor: 'bg-gray-100 text-gray-800',
  },
} as const;

const PRIORITY_COLORS = {
  low: 'border-l-4 border-l-gray-400',
  medium: 'border-l-4 border-l-blue-500',
  high: 'border-l-4 border-l-orange-500',
  critical: 'border-l-4 border-l-red-600',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export default function RoadmapKanbanView({ orgId, onItemClick, items, onUpdate }: RoadmapKanbanViewProps) {
  const supabase = createClient();

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const newStatus = destination.droppableId as RoadmapItem['status'];

    try {
      // Update the item status in the database
      let query = supabase
        .from('org_product_roadmap')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draggableId);

      // For org-specific roadmap items, filter by org_id
      // For global roadmap items (orgId is null/undefined), use IS NULL check
      if (orgId && orgId !== 'null' && orgId !== 'undefined') {
        query = query.eq('org_id', orgId);
      } else if (!orgId || orgId === 'null' || orgId === 'undefined') {
        query = query.is('org_id', null);
      }

      const { error } = await query;

      if (error) throw error;

      toast.success(`Moved to ${COLUMNS[newStatus].title}`);
      onUpdate();
    } catch (error: any) {
      handleError(error, {
        context: 'updating roadmap item status via drag and drop',
        additionalContext: { itemId: draggableId, newStatus, orgId }
      });
    }
  };

  const getColumnItems = (status: RoadmapItem['status']) => {
    return items.filter(item => item.status === status);
  };

  const hasBlockers = (item: RoadmapItem) => {
    if (!item.blocked_by_ids || item.blocked_by_ids.length === 0) return false;

    // Check if any blocker is not completed
    const blockerItems = items.filter(i => item.blocked_by_ids?.includes(i.id));
    return blockerItems.some(blocker => blocker.status !== 'completed');
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
        {(Object.keys(COLUMNS) as Array<keyof typeof COLUMNS>).map((columnId) => {
          const column = COLUMNS[columnId];
          const columnItems = getColumnItems(columnId);
          const Icon = column.icon;

          return (
            <div key={columnId} className="flex flex-col min-h-0">
              {/* Column Header */}
              <div className={`${column.headerColor} px-4 py-3 rounded-t-lg flex items-center justify-between sticky top-0 z-10`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <h3 className="font-semibold">{column.title}</h3>
                </div>
                <span className="text-sm font-medium bg-white/50 px-2 py-0.5 rounded-full">
                  {columnItems.length}
                </span>
              </div>

              {/* Column Content */}
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${column.color} border-2 rounded-b-lg p-3 flex-1 overflow-y-auto min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-opacity-70' : ''
                    }`}
                  >
                    <div className="space-y-2">
                      {columnItems.map((item, index) => {
                        const hasActiveBlockers = hasBlockers(item);

                        return (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={(e) => {
                                  // Only open detail panel if not dragging
                                  if (!snapshot.isDragging) {
                                    onItemClick(item.id);
                                  }
                                }}
                                className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                  PRIORITY_COLORS[item.priority]
                                } ${snapshot.isDragging ? 'shadow-xl rotate-2' : ''}`}
                              >
                                {/* Title */}
                                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                  {item.title}
                                </h4>

                                {/* Description */}
                                {item.description && (
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}

                                {/* Metadata */}
                                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                                  <span className="font-medium">
                                    {PRIORITY_LABELS[item.priority]}
                                  </span>
                                  {item.target_date && (
                                    <span>Due {formatDate(item.target_date)}</span>
                                  )}
                                </div>

                                {/* Blockers Warning */}
                                {hasActiveBlockers && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Blocked</span>
                                  </div>
                                )}

                                {/* Links Indicator */}
                                {((item.linked_features && item.linked_features.length > 0) ||
                                  (item.blocked_by_ids && item.blocked_by_ids.length > 0) ||
                                  (item.blocks_ids && item.blocks_ids.length > 0)) && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                    <Link2 className="w-3 h-3" />
                                    <span>
                                      {(item.linked_features?.length || 0) +
                                        (item.blocked_by_ids?.length || 0) +
                                        (item.blocks_ids?.length || 0)}{' '}
                                      links
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
