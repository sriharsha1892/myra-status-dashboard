'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Flag, Check, Calendar, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Milestone {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  status: 'active' | 'completed' | 'cancelled';
  color: string;
}

interface MilestoneWithProgress extends Milestone {
  total_items?: number;
  completed_items?: number;
  completion_percentage?: number;
}

interface MilestoneManagerProps {
  orgId: string;
  selectedMilestoneId: string | null;
  onMilestoneChange: (milestoneId: string | null) => void;
  showProgress?: boolean;
}

const PRESET_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
];

export default function MilestoneManager({
  orgId,
  selectedMilestoneId,
  onMilestoneChange,
  showProgress = false,
}: MilestoneManagerProps) {
  const [milestones, setMilestones] = useState<MilestoneWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    description: '',
    target_date: '',
    color: PRESET_COLORS[0],
  });
  const supabase = createClient();

  useEffect(() => {
    fetchMilestones();
  }, [orgId]);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      if (!orgId) {
        console.warn('MilestoneManager: orgId is undefined, cannot fetch milestones');
        setMilestones([]);
        return;
      }

      if (showProgress) {
        // Fetch with progress data from view
        const { data, error } = await supabase
          .from('roadmap_milestone_progress')
          .select('*')
          .eq('org_id', orgId)
          .order('target_date', { ascending: true, nullsFirst: false });

        if (error) throw error;
        setMilestones(data || []);
      } else {
        // Fetch milestones only
        const { data, error } = await supabase
          .from('roadmap_milestones')
          .select('*')
          .eq('org_id', orgId)
          .order('target_date', { ascending: true, nullsFirst: false });

        if (error) throw error;
        setMilestones(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching milestones:', error);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const createMilestone = async () => {
    if (!newMilestone.name.trim()) {
      toast.error('Milestone name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('roadmap_milestones')
        .insert({
          org_id: orgId,
          name: newMilestone.name.trim(),
          description: newMilestone.description.trim() || null,
          target_date: newMilestone.target_date || null,
          color: newMilestone.color,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      setMilestones([...milestones, data]);
      setNewMilestone({ name: '', description: '', target_date: '', color: PRESET_COLORS[0] });
      setShowAddMilestone(false);
      toast.success('Milestone created');
    } catch (error: any) {
      console.error('Error creating milestone:', error);
      toast.error('Failed to create milestone');
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    if (!confirm('Delete this milestone? Items will be unlinked but not deleted.')) return;

    try {
      const { error } = await supabase
        .from('roadmap_milestones')
        .delete()
        .eq('id', milestoneId)
        .eq('org_id', orgId);

      if (error) throw error;

      setMilestones(milestones.filter(m => m.id !== milestoneId));
      if (selectedMilestoneId === milestoneId) {
        onMilestoneChange(null);
      }
      toast.success('Milestone deleted');
    } catch (error: any) {
      console.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone');
    }
  };

  const updateMilestoneStatus = async (milestoneId: string, status: Milestone['status']) => {
    try {
      const { error } = await supabase
        .from('roadmap_milestones')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', milestoneId)
        .eq('org_id', orgId);

      if (error) throw error;

      setMilestones(milestones.map(m => (m.id === milestoneId ? { ...m, status } : m)));
      toast.success('Milestone status updated');
    } catch (error: any) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">Milestone</label>
        <button
          onClick={() => setShowAddMilestone(!showAddMilestone)}
          className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          New Milestone
        </button>
      </div>

      {/* Add Milestone Form */}
      {showAddMilestone && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <input
            type="text"
            placeholder="Milestone name..."
            value={newMilestone.name}
            onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            value={newMilestone.target_date}
            onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewMilestone({ ...newMilestone, color })}
                className={`w-6 h-6 rounded-full transition-all ${
                  newMilestone.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={createMilestone}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowAddMilestone(false);
                setNewMilestone({ name: '', description: '', target_date: '', color: PRESET_COLORS[0] });
              }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Milestone Selector */}
      <div className="space-y-2">
        {/* None option */}
        <button
          onClick={() => onMilestoneChange(null)}
          className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
            selectedMilestoneId === null
              ? 'bg-gray-100 border-gray-400 text-gray-900'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm">No milestone</span>
        </button>

        {/* Milestone list */}
        {milestones.length === 0 ? (
          <p className="text-xs text-gray-500 italic px-3">No milestones yet. Create one above.</p>
        ) : (
          milestones.map(milestone => (
            <div
              key={milestone.id}
              className={`group relative rounded-lg border transition-all ${
                selectedMilestoneId === milestone.id
                  ? 'border-2 shadow-sm'
                  : 'border hover:border-gray-300'
              }`}
              style={{
                borderColor: selectedMilestoneId === milestone.id ? milestone.color : undefined,
              }}
            >
              <button
                onClick={() => onMilestoneChange(milestone.id)}
                className="w-full text-left px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Flag
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: milestone.color }}
                      />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {milestone.name}
                      </span>
                      {milestone.status === 'completed' && (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    {milestone.target_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {showProgress && milestone.total_items !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>
                            {milestone.completed_items || 0} / {milestone.total_items} items
                          </span>
                          <span className="font-medium">{milestone.completion_percentage || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${milestone.completion_percentage || 0}%`,
                              backgroundColor: milestone.color,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Actions */}
              <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                {milestone.status === 'active' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateMilestoneStatus(milestone.id, 'completed');
                    }}
                    className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    title="Mark as completed"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMilestone(milestone.id);
                  }}
                  className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Delete milestone"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
