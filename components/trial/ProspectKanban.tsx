'use client';

/**
 * ProspectKanban - Pipedrive-inspired Kanban board for prospect pipeline
 * Features: Rich cards, visual column headers, drag-drop with feedback
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  getActiveStages,
  getStageConfig,
  formatDealValue,
  type ProspectStageConfig,
} from '@/lib/prospects/config';
import ProspectCardCompact, { type ProspectCardData } from '@/components/prospect/ProspectCardCompact';
import { Plus, Layers } from 'lucide-react';

// Get active stages (excluding disqualified for main board)
const KANBAN_STAGES = getActiveStages();

interface ProspectKanbanProps {
  prospects: ProspectCardData[];
  onStageChange?: (orgId: string, newStage: string) => Promise<void> | void;
  onCardClick?: (orgId: string) => void;
  onQuickAction?: (action: string, orgId: string) => void;
  onAddProspect?: () => void;
}

// Calculate totals for a column
function calculateColumnTotals(prospects: ProspectCardData[]) {
  const totalValue = prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
  return {
    count: prospects.length,
    totalValue,
  };
}

// Column Header Component
function ColumnHeader({
  stage,
  count,
  totalValue,
}: {
  stage: ProspectStageConfig;
  count: number;
  totalValue: number;
}) {
  const Icon = stage.icon;

  return (
    <div className="relative overflow-hidden rounded-t-xl">
      {/* Colored top bar */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: stage.columnColor }}
      />

      {/* Header content */}
      <div className={cn('px-4 py-3', stage.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${stage.columnColor}20` }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: stage.columnColor }}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{stage.label}</h3>
              {totalValue > 0 && (
                <p className="text-xs text-gray-500">{formatDealValue(totalValue)}</p>
              )}
            </div>
          </div>

          {/* Count badge */}
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: stage.columnColor }}
          >
            {count}
          </span>
        </div>
      </div>
    </div>
  );
}

// Empty Column State
function EmptyColumnState({ stage }: { stage: ProspectStageConfig }) {
  const Icon = stage.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${stage.columnColor}15` }}
      >
        <Icon
          className="w-6 h-6"
          style={{ color: stage.columnColor, opacity: 0.5 }}
        />
      </div>
      <p className="text-sm text-gray-400 font-medium">No prospects</p>
      <p className="text-xs text-gray-300 mt-1">Drag cards here</p>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({
  stage,
  prospects,
  onDragStart,
  onDragOver,
  onDrop,
  onCardClick,
  onQuickAction,
  isDragging,
}: {
  stage: ProspectStageConfig;
  prospects: ProspectCardData[];
  onDragStart: (e: React.DragEvent, orgId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageValue: string) => void;
  onCardClick: (orgId: string) => void;
  onQuickAction?: (action: string, orgId: string) => void;
  isDragging: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { count, totalValue } = calculateColumnTotals(prospects);

  return (
    <div
      className={cn(
        'flex-shrink-0 w-80 rounded-xl bg-gray-50/80 border-2 transition-all duration-200',
        'flex flex-col',
        isDragOver
          ? 'border-dashed border-blue-400 bg-blue-50/50 scale-[1.02] shadow-lg'
          : stage.headerBorder
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver(e);
      }}
      onDragLeave={(e) => {
        // Only set false if leaving the column entirely
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop(e, stage.value);
      }}
    >
      {/* Column Header */}
      <ColumnHeader stage={stage} count={count} totalValue={totalValue} />

      {/* Cards Container */}
      <div className="flex-1 p-3 space-y-3 min-h-[250px] max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {prospects.length === 0 ? (
          <EmptyColumnState stage={stage} />
        ) : (
          prospects.map((prospect) => (
            <ProspectCardCompact
              key={prospect.org_id}
              prospect={prospect}
              onDragStart={onDragStart}
              onClick={() => onCardClick(prospect.org_id)}
              onQuickAction={onQuickAction}
              isDragging={isDragging && false} // TODO: track per-card
            />
          ))
        )}
      </div>

      {/* Drop indicator when dragging */}
      {isDragOver && (
        <div className="mx-3 mb-3 p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 flex items-center justify-center">
          <p className="text-sm text-blue-500 font-medium">Drop to move here</p>
        </div>
      )}
    </div>
  );
}

// Main Component
export function ProspectKanban({
  prospects,
  onStageChange,
  onCardClick,
  onQuickAction,
  onAddProspect,
}: ProspectKanbanProps) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Group prospects by stage
  const prospectsByStage = useMemo(() => {
    const groups: Record<string, ProspectCardData[]> = {};

    // Initialize all stages
    for (const stage of KANBAN_STAGES) {
      groups[stage.value] = [];
    }

    // Distribute prospects
    for (const prospect of prospects) {
      const stage = prospect.prospect_stage || 'cold_lead';
      if (groups[stage]) {
        groups[stage].push(prospect);
      } else {
        // Fallback for unknown stages
        groups['cold_lead'].push(prospect);
      }
    }

    // Sort each group by ICP score (highest first), then by last activity
    for (const stage of Object.keys(groups)) {
      groups[stage].sort((a, b) => {
        // Primary: ICP score
        const aScore = a.icp_fit_score || 0;
        const bScore = b.icp_fit_score || 0;
        if (bScore !== aScore) return bScore - aScore;

        // Secondary: Last activity
        const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return bTime - aTime;
      });
    }

    return groups;
  }, [prospects]);

  // Calculate pipeline totals
  const pipelineTotals = useMemo(() => {
    const totalValue = prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
    return {
      count: prospects.length,
      totalValue,
    };
  }, [prospects]);

  const handleDragStart = useCallback((e: React.DragEvent, orgId: string) => {
    setDraggedId(orgId);
    e.dataTransfer.setData('text/plain', orgId);
    e.dataTransfer.effectAllowed = 'move';

    // Add visual feedback to dragged element
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const orgId = e.dataTransfer.getData('text/plain');

    if (orgId && onStageChange) {
      const prospect = prospects.find(p => p.org_id === orgId);
      if (prospect && prospect.prospect_stage !== newStage) {
        setIsUpdating(true);
        const fromStage = getStageConfig(prospect.prospect_stage);
        const toStage = getStageConfig(newStage);

        try {
          await onStageChange(orgId, newStage);

          // Success toast with stage info
          toast.success(
            <div className="flex items-center gap-2">
              <span className="font-medium">{prospect.org_name}</span>
              <span className="text-gray-400">→</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${toStage.columnColor}20`,
                  color: toStage.columnColor,
                }}
              >
                {toStage.label}
              </span>
            </div>,
            { duration: 3000 }
          );
        } catch (error) {
          toast.error('Failed to update stage');
        } finally {
          setIsUpdating(false);
        }
      }
    }

    setDraggedId(null);
  }, [prospects, onStageChange]);

  const handleCardClick = useCallback((orgId: string) => {
    if (onCardClick) {
      onCardClick(orgId);
    } else {
      router.push(`/support/trials/${orgId}`);
    }
  }, [onCardClick, router]);

  // Empty state
  if (prospects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Layers className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No prospects yet</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Start building your pipeline by adding prospects. They'll appear here organized by stage.
        </p>
        {onAddProspect && (
          <button
            onClick={onAddProspect}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add First Prospect
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Summary */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-500">Pipeline:</span>
            <span className="ml-2 font-bold text-gray-900">{pipelineTotals.count} prospects</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Total Value:</span>
            <span className="ml-2 font-bold text-green-600">{formatDealValue(pipelineTotals.totalValue)}</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          Drag cards between columns to change stage
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-4 min-w-max">
          {KANBAN_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.value}
              stage={stage}
              prospects={prospectsByStage[stage.value] || []}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onCardClick={handleCardClick}
              onQuickAction={onQuickAction}
              isDragging={!!draggedId}
            />
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Updating stage...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProspectKanban;
