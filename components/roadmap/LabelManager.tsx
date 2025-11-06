'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Edit2, Check, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Label {
  id: string;
  org_id: string;
  name: string;
  color: string;
  description: string | null;
}

interface LabelManagerProps {
  orgId: string;
  selectedLabelIds: string[];
  onLabelsChange: (labelIds: string[]) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

export default function LabelManager({ orgId, selectedLabelIds, onLabelsChange }: LabelManagerProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState({ name: '', color: PRESET_COLORS[0], description: '' });
  const supabase = createClient();

  useEffect(() => {
    fetchLabels();
  }, [orgId]);

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_labels')
        .select('*')
        .eq('org_id', orgId)
        .order('name');

      if (error) throw error;
      setLabels(data || []);
    } catch (error: any) {
      console.error('Error fetching labels:', error);
      toast.error('Failed to load labels');
    } finally {
      setLoading(false);
    }
  };

  const createLabel = async () => {
    if (!newLabel.name.trim()) {
      toast.error('Label name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('roadmap_labels')
        .insert({
          org_id: orgId,
          name: newLabel.name.trim(),
          color: newLabel.color,
          description: newLabel.description.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setLabels([...labels, data]);
      setNewLabel({ name: '', color: PRESET_COLORS[0], description: '' });
      setShowAddLabel(false);
      toast.success('Label created');
    } catch (error: any) {
      console.error('Error creating label:', error);
      toast.error(error.message?.includes('duplicate') ? 'Label name already exists' : 'Failed to create label');
    }
  };

  const updateLabel = async (labelId: string, updates: Partial<Label>) => {
    try {
      const { error } = await supabase
        .from('roadmap_labels')
        .update(updates)
        .eq('id', labelId)
        .eq('org_id', orgId);

      if (error) throw error;

      setLabels(labels.map(l => l.id === labelId ? { ...l, ...updates } : l));
      setEditingLabelId(null);
      toast.success('Label updated');
    } catch (error: any) {
      console.error('Error updating label:', error);
      toast.error('Failed to update label');
    }
  };

  const deleteLabel = async (labelId: string) => {
    if (!confirm('Delete this label? It will be removed from all items.')) return;

    try {
      const { error } = await supabase
        .from('roadmap_labels')
        .delete()
        .eq('id', labelId)
        .eq('org_id', orgId);

      if (error) throw error;

      setLabels(labels.filter(l => l.id !== labelId));
      onLabelsChange(selectedLabelIds.filter(id => id !== labelId));
      toast.success('Label deleted');
    } catch (error: any) {
      console.error('Error deleting label:', error);
      toast.error('Failed to delete label');
    }
  };

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onLabelsChange(selectedLabelIds.filter(id => id !== labelId));
    } else {
      onLabelsChange([...selectedLabelIds, labelId]);
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
      {/* Selected Labels */}
      {selectedLabelIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {labels
            .filter(label => selectedLabelIds.includes(label.id))
            .map(label => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white transition-all hover:opacity-80"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                <X className="w-3 h-3" />
              </button>
            ))}
        </div>
      )}

      {/* Available Labels */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Available Labels</label>
          <button
            onClick={() => setShowAddLabel(!showAddLabel)}
            className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            New Label
          </button>
        </div>

        {/* Add Label Form */}
        {showAddLabel && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 space-y-2">
            <input
              type="text"
              placeholder="Label name..."
              value={newLabel.name}
              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewLabel({ ...newLabel, color })}
                  className={`w-6 h-6 rounded-full transition-all ${
                    newLabel.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={createLabel}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowAddLabel(false);
                  setNewLabel({ name: '', color: PRESET_COLORS[0], description: '' });
                }}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Label List */}
        <div className="flex flex-wrap gap-2">
          {labels.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No labels yet. Create one above.</p>
          ) : (
            labels.map(label => (
              <div key={label.id} className="group relative">
                <button
                  onClick={() => toggleLabel(label.id)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedLabelIds.includes(label.id)
                      ? 'text-white'
                      : 'text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                  style={
                    selectedLabelIds.includes(label.id)
                      ? { backgroundColor: label.color }
                      : { backgroundColor: `${label.color}20` }
                  }
                >
                  <Tag className="w-3 h-3" />
                  {label.name}
                </button>

                {/* Delete button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLabel(label.id);
                  }}
                  className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
