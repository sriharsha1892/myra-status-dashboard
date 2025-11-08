'use client';

/**
 * AI AGENT ROADMAP BOARD
 * Executive-grade Kanban view for agent evolution tracking
 *
 * Features:
 * - 5 lifecycle phases: Concept → Under Build → Testing → Live → Retired
 * - Inline task creation and editing
 * - Drag-and-drop between phases
 * - Keyboard navigation (J/K, E, Enter/Esc, Cmd+K)
 * - Version filtering (non-grouping)
 * - Summary ribbon with live counts
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  X,
  Edit2,
  Check,
  Loader2,
  Filter,
  Table as TableIcon,
  LayoutGrid,
  ChevronDown,
  Command,
  ArrowRight,
} from 'lucide-react';

// Types
type LifecyclePhase = 'concept' | 'under_build' | 'testing' | 'live' | 'retired';

export type AgentRoadmapItem = {
  id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'suggested';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  proposer?: string;
  goal?: string;
  area?: string;
  rationale?: string;
  version_planned?: string;
  assigned_to?: string;
  org_id?: string;
  agent_name?: string;
  agent_url?: string;
  environment?: 'staging' | 'production' | null;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage?: number;
  last_activity_at?: string;
  days_since_activity?: number;
  sprint_id?: string;
  sprint_name?: string;
  // Lifecycle phase (derived from status or explicitly set)
  lifecycle_phase?: LifecyclePhase;
};

interface AgentKanbanBoardProps {
  items: AgentRoadmapItem[];
  onRefresh: () => void;
  users?: Array<{ id: string; email: string; name: string; role: string; status: string }>;
}

// Lifecycle phase configuration
const LIFECYCLE_PHASES: Array<{
  id: LifecyclePhase;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = [
  { id: 'concept', label: 'Concept', color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  { id: 'under_build', label: 'Under Build', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'testing', label: 'Testing', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'live', label: 'Live', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { id: 'retired', label: 'Retired', color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

// Priority colors
const PRIORITY_COLORS = {
  critical: 'border-l-4 border-l-red-500',
  high: 'border-l-4 border-l-orange-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-gray-300',
};

// Map status to lifecycle phase
function getLifecyclePhase(item: AgentRoadmapItem): LifecyclePhase {
  if (item.lifecycle_phase) return item.lifecycle_phase;

  // Derive from status
  switch (item.status) {
    case 'suggested':
    case 'planned':
      return 'concept';
    case 'in_progress':
      // Check if testing based on progress
      if (item.progress_percentage && item.progress_percentage > 80) {
        return 'testing';
      }
      return 'under_build';
    case 'completed':
      return 'live';
    case 'cancelled':
      return 'retired';
    default:
      return 'concept';
  }
}

// Extract agent name from title or metadata
function extractAgentName(item: AgentRoadmapItem): string {
  if (item.agent_name) return item.agent_name;

  // Try to extract from title (e.g., "[Orchestrator] Feature name")
  const match = item.title.match(/^\[([^\]]+)\]/);
  if (match) return match[1];

  return 'General';
}

export default function AgentKanbanBoard({ items, onRefresh, users = [] }: AgentKanbanBoardProps) {
  // State
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [focusedCardIndex, setFocusedCardIndex] = useState<number>(0);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Inline add state
  const [addingToPhase, setAddingToPhase] = useState<LifecyclePhase | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Inline edit state
  const [editingCard, setEditingCard] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Drag state
  const [draggedItem, setDraggedItem] = useState<AgentRoadmapItem | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<LifecyclePhase | null>(null);

  const supabase = createClient();
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when adding task
  useEffect(() => {
    if (addingToPhase && newTaskInputRef.current) {
      newTaskInputRef.current.focus();
    }
  }, [addingToPhase]);

  // Auto-focus input when editing
  useEffect(() => {
    if (editingCard && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCard]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        return;
      }

      // Close command palette with Escape
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false);
          setCommandSearch('');
          return;
        }
        if (editingCard) {
          setEditingCard(null);
          setEditValue('');
          return;
        }
        if (addingToPhase) {
          setAddingToPhase(null);
          setNewTaskTitle('');
          return;
        }
      }

      // Don't process other shortcuts if typing
      if (editingCard || addingToPhase || showCommandPalette) return;

      // J/K navigation
      if (e.key === 'j') {
        e.preventDefault();
        setFocusedCardIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
      }
      if (e.key === 'k') {
        e.preventDefault();
        setFocusedCardIndex(prev => Math.max(prev - 1, 0));
      }

      // E to edit focused card
      if (e.key === 'e') {
        const focusedItem = filteredItems[focusedCardIndex];
        if (focusedItem) {
          setEditingCard({ id: focusedItem.id, field: 'title' });
          setEditValue(focusedItem.title);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, editingCard, addingToPhase, focusedCardIndex]);

  // Derive unique values for filters
  const uniqueGoals = useMemo(() => {
    const goals = new Set(items.map(i => i.goal).filter(Boolean));
    return Array.from(goals);
  }, [items]);

  const uniqueAreas = useMemo(() => {
    const areas = new Set(items.map(i => i.area).filter(Boolean));
    return Array.from(areas);
  }, [items]);

  const uniqueVersions = useMemo(() => {
    const versions = new Set(items.map(i => i.version_planned).filter(Boolean));
    return Array.from(versions).sort();
  }, [items]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set(items.map(i => i.assigned_to).filter(Boolean));
    return Array.from(owners);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);
        const agentMatch = extractAgentName(item).toLowerCase().includes(query);
        const versionMatch = item.version_planned?.toLowerCase().includes(query);
        if (!titleMatch && !agentMatch && !versionMatch) return false;
      }

      // Goal filter
      if (selectedGoal !== 'all' && item.goal !== selectedGoal) return false;

      // Area filter
      if (selectedArea !== 'all' && item.area !== selectedArea) return false;

      // Version filter (FILTER ONLY, NOT GROUPING)
      if (selectedVersion !== 'all' && item.version_planned !== selectedVersion) return false;

      // Owner filter
      if (selectedOwner !== 'all' && item.assigned_to !== selectedOwner) return false;

      return true;
    });
  }, [items, searchQuery, selectedGoal, selectedArea, selectedVersion, selectedOwner]);

  // Group by lifecycle phase
  const itemsByPhase = useMemo(() => {
    const grouped: Record<LifecyclePhase, AgentRoadmapItem[]> = {
      concept: [],
      under_build: [],
      testing: [],
      live: [],
      retired: [],
    };

    filteredItems.forEach(item => {
      const phase = getLifecyclePhase(item);
      grouped[phase].push(item);
    });

    return grouped;
  }, [filteredItems]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    return {
      total: filteredItems.length,
      concept: itemsByPhase.concept.length,
      under_build: itemsByPhase.under_build.length,
      testing: itemsByPhase.testing.length,
      live: itemsByPhase.live.length,
      retired: itemsByPhase.retired.length,
    };
  }, [filteredItems, itemsByPhase]);

  // Create new task
  const handleCreateTask = async (phase: LifecyclePhase, shiftPressed = false) => {
    if (!newTaskTitle.trim()) return;

    setIsCreating(true);

    try {
      // Map phase to status
      let status: AgentRoadmapItem['status'] = 'planned';
      switch (phase) {
        case 'concept':
          status = 'planned';
          break;
        case 'under_build':
          status = 'in_progress';
          break;
        case 'testing':
          status = 'in_progress';
          break;
        case 'live':
          status = 'completed';
          break;
        case 'retired':
          status = 'cancelled';
          break;
      }

      const { data, error } = await supabase
        .from('roadmap_items')
        .insert({
          title: newTaskTitle,
          status,
          priority: 'medium',
          lifecycle_phase: phase,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Task created');
      setNewTaskTitle('');

      if (!shiftPressed) {
        setAddingToPhase(null);
      }

      onRefresh();

      // Scroll to new card with pulse
      setTimeout(() => {
        const newCard = document.querySelector(`[data-card-id="${data.id}"]`);
        if (newCard) {
          newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          newCard.classList.add('animate-pulse');
          setTimeout(() => newCard.classList.remove('animate-pulse'), 1000);
        }
      }, 100);
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  // Update task field
  const handleUpdateField = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('roadmap_items')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      toast.success('Updated');
      setEditingCard(null);
      setEditValue('');
      onRefresh();
    } catch (error: any) {
      console.error('Error updating:', error);
      toast.error('Update failed');
    }
  };

  // Handle drag and drop
  const handleDragStart = (item: AgentRoadmapItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, phase: LifecyclePhase) => {
    e.preventDefault();
    setDragOverPhase(phase);
  };

  const handleDragLeave = () => {
    setDragOverPhase(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPhase: LifecyclePhase) => {
    e.preventDefault();
    setDragOverPhase(null);

    if (!draggedItem) return;

    const currentPhase = getLifecyclePhase(draggedItem);
    if (currentPhase === targetPhase) {
      setDraggedItem(null);
      return;
    }

    try {
      // Map phase to status
      let newStatus: AgentRoadmapItem['status'] = draggedItem.status;
      switch (targetPhase) {
        case 'concept':
          newStatus = 'planned';
          break;
        case 'under_build':
          newStatus = 'in_progress';
          break;
        case 'testing':
          newStatus = 'in_progress';
          break;
        case 'live':
          newStatus = 'completed';
          break;
        case 'retired':
          newStatus = 'cancelled';
          break;
      }

      const { error } = await supabase
        .from('roadmap_items')
        .update({ status: newStatus, lifecycle_phase: targetPhase })
        .eq('id', draggedItem.id);

      if (error) throw error;

      toast.success(`Moved to ${LIFECYCLE_PHASES.find(p => p.id === targetPhase)?.label}`);
      onRefresh();
    } catch (error: any) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
    } finally {
      setDraggedItem(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Ribbon */}
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">{summaryCounts.total}</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            {LIFECYCLE_PHASES.map(phase => (
              <div key={phase.id} className="flex items-center gap-2">
                <span className={`text-xs ${phase.color}`}>{phase.label}</span>
                <span className={`px-2 py-0.5 rounded-md ${phase.bgColor} ${phase.color} text-xs font-medium`}>
                  {summaryCounts[phase.id]}
                </span>
              </div>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 inline-block mr-1" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4 inline-block mr-1" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roadmap… (title, agent, version)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />

          {/* Goal Filter */}
          {uniqueGoals.length > 0 && (
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Goals</option>
              {uniqueGoals.map(goal => (
                <option key={goal} value={goal}>{goal}</option>
              ))}
            </select>
          )}

          {/* Area Filter */}
          {uniqueAreas.length > 0 && (
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Areas</option>
              {uniqueAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          )}

          {/* Version Filter */}
          {uniqueVersions.length > 0 && (
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Versions</option>
              {uniqueVersions.map(version => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
          )}

          {/* Owner Filter */}
          {uniqueOwners.length > 0 && (
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Owners</option>
              {uniqueOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          )}

          {/* Clear Filters */}
          {(selectedGoal !== 'all' || selectedArea !== 'all' || selectedVersion !== 'all' || selectedOwner !== 'all') && (
            <button
              onClick={() => {
                setSelectedGoal('all');
                setSelectedArea('all');
                setSelectedVersion('all');
                setSelectedOwner('all');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-5 gap-4">
          {LIFECYCLE_PHASES.map(phase => (
            <div
              key={phase.id}
              className={`backdrop-blur-xl bg-white/60 border rounded-2xl p-4 min-h-[600px] transition-all ${
                phase.borderColor
              } ${
                dragOverPhase === phase.id ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, phase.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, phase.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-semibold ${phase.color}`}>{phase.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{itemsByPhase[phase.id].length} items</p>
                </div>
                <button
                  onClick={() => setAddingToPhase(phase.id)}
                  className={`p-1.5 rounded-lg ${phase.bgColor} ${phase.color} hover:opacity-80 transition-opacity`}
                  title="Add task (or press +)"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Add Task */}
              {addingToPhase === phase.id && (
                <div className="mb-3 space-y-2">
                  <input
                    ref={newTaskInputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTask(phase.id, e.shiftKey);
                      }
                      if (e.key === 'Escape') {
                        setAddingToPhase(null);
                        setNewTaskTitle('');
                      }
                    }}
                    placeholder="Task title… (Enter to save, Shift+Enter for another, Esc to cancel)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isCreating}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCreateTask(phase.id)}
                      disabled={!newTaskTitle.trim() || isCreating}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCreating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Add Task'}
                    </button>
                    <button
                      onClick={() => {
                        setAddingToPhase(null);
                        setNewTaskTitle('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Cards */}
              <div className="space-y-2">
                {itemsByPhase[phase.id].length === 0 && addingToPhase !== phase.id ? (
                  <div className="text-center py-12">
                    <div className={`w-12 h-12 mx-auto rounded-xl ${phase.bgColor} ${phase.borderColor} border-2 flex items-center justify-center mb-3`}>
                      <Plus className={`w-6 h-6 ${phase.color}`} />
                    </div>
                    <p className="text-xs text-slate-500 mb-2">No tasks yet</p>
                    <button
                      onClick={() => setAddingToPhase(phase.id)}
                      className={`text-xs ${phase.color} hover:underline`}
                    >
                      Add first task
                    </button>
                  </div>
                ) : (
                  itemsByPhase[phase.id].map((item, index) => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      isFocused={filteredItems[focusedCardIndex]?.id === item.id}
                      isExpanded={expandedCard === item.id}
                      isEditing={editingCard?.id === item.id}
                      editingField={editingCard?.field}
                      editValue={editValue}
                      editInputRef={editInputRef}
                      onExpand={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                      onEdit={(field) => {
                        setEditingCard({ id: item.id, field });
                        setEditValue(item[field as keyof AgentRoadmapItem] as string || '');
                      }}
                      onEditChange={setEditValue}
                      onEditSave={() => {
                        if (editingCard) {
                          handleUpdateField(item.id, editingCard.field, editValue);
                        }
                      }}
                      onEditCancel={() => {
                        setEditingCard(null);
                        setEditValue('');
                      }}
                      onDragStart={() => handleDragStart(item)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View (placeholder) */}
      {viewMode === 'table' && (
        <div className="backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl p-8 text-center">
          <TableIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Table View</h3>
          <p className="text-sm text-slate-600">Table view coming soon. Use Kanban for now.</p>
        </div>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          searchQuery={commandSearch}
          onSearchChange={setCommandSearch}
          onClose={() => {
            setShowCommandPalette(false);
            setCommandSearch('');
          }}
          onSelectVersion={setSelectedVersion}
          onSelectPhase={(phase) => setAddingToPhase(phase)}
          versions={uniqueVersions}
        />
      )}
    </div>
  );
}

// Kanban Card Component
interface KanbanCardProps {
  item: AgentRoadmapItem;
  isFocused: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  editingField?: string;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement>;
  onExpand: () => void;
  onEdit: (field: string) => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDragStart: () => void;
}

function KanbanCard({
  item,
  isFocused,
  isExpanded,
  isEditing,
  editingField,
  editValue,
  editInputRef,
  onExpand,
  onEdit,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDragStart,
}: KanbanCardProps) {
  const agentName = extractAgentName(item);

  return (
    <div
      data-card-id={item.id}
      draggable
      onDragStart={onDragStart}
      onDoubleClick={() => onEdit('title')}
      className={`group bg-white rounded-lg border p-3 cursor-pointer transition-all duration-150 ${
        PRIORITY_COLORS[item.priority]
      } ${
        isFocused ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md border-slate-200'
      }`}
    >
      {/* Title */}
      {isEditing && editingField === 'title' ? (
        <input
          ref={editInputRef}
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditSave();
            if (e.key === 'Escape') onEditCancel();
          }}
          onBlur={onEditSave}
          className="w-full px-2 py-1 text-sm font-medium text-slate-900 border border-blue-500 rounded focus:outline-none"
        />
      ) : (
        <h4 className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">{item.title}</h4>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* Agent Tag */}
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
          {agentName}
        </span>

        {/* Version */}
        {item.version_planned && (
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
            {item.version_planned}
          </span>
        )}

        {/* Priority */}
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
          item.priority === 'critical' ? 'bg-red-100 text-red-700' :
          item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {item.priority}
        </span>
      </div>

      {/* Owner */}
      {item.assigned_to && (
        <div className="text-xs text-slate-600 mb-2">
          <span className="opacity-60">Owner:</span> {item.assigned_to}
        </div>
      )}

      {/* Expand Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        className="text-xs text-blue-600 hover:underline"
      >
        {isExpanded ? 'Hide details' : 'Show details'}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
          {item.rationale && (
            <div>
              <p className="text-xs font-medium text-slate-700 mb-1">Rationale</p>
              <p className="text-xs text-slate-600">{item.rationale}</p>
            </div>
          )}
          {item.description && (
            <div>
              <p className="text-xs font-medium text-slate-700 mb-1">Description</p>
              <p className="text-xs text-slate-600">{item.description}</p>
            </div>
          )}
          {item.target_date && (
            <div>
              <p className="text-xs font-medium text-slate-700 mb-1">Target Date</p>
              <p className="text-xs text-slate-600">{new Date(item.target_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions (on hover) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit('title');
          }}
          className="text-xs text-slate-600 hover:text-blue-600"
          title="Edit (or press E)"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Command Palette Component
interface CommandPaletteProps {
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  onSelectVersion: (version: string) => void;
  onSelectPhase: (phase: LifecyclePhase) => void;
  versions: string[];
}

function CommandPalette({
  isOpen,
  searchQuery,
  onSearchChange,
  onClose,
  onSelectVersion,
  onSelectPhase,
  versions,
}: CommandPaletteProps) {
  if (!isOpen) return null;

  const commands = [
    { id: 'new-concept', label: 'New task in Concept', action: () => onSelectPhase('concept') },
    { id: 'new-build', label: 'New task in Under Build', action: () => onSelectPhase('under_build') },
    { id: 'new-testing', label: 'New task in Testing', action: () => onSelectPhase('testing') },
    { id: 'new-live', label: 'New task in Live', action: () => onSelectPhase('live') },
    ...versions.map(v => ({
      id: `filter-${v}`,
      label: `Filter by version ${v}`,
      action: () => onSelectVersion(v),
    })),
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Command className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type a command..."
            autoFocus
            className="flex-1 text-base border-none focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {filteredCommands.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 text-sm transition-colors"
            >
              {cmd.label}
            </button>
          ))}
          {filteredCommands.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-500">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
