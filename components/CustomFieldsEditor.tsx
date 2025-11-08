'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Plus, X, Save, Edit2, Trash2 } from 'lucide-react';

interface CustomFieldsEditorProps {
  trialOrgId: string;
  initialFields?: Record<string, any>;
  onSave?: (fields: Record<string, any>) => void;
}

export default function CustomFieldsEditor({
  trialOrgId,
  initialFields = {},
  onSave,
}: CustomFieldsEditorProps) {
  const [fields, setFields] = useState<Record<string, any>>(initialFields);
  const [editMode, setEditMode] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (Object.keys(initialFields).length === 0) {
      fetchFields();
    }
  }, [trialOrgId]);

  const fetchFields = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('custom_fields')
        .eq('org_id', trialOrgId)
        .single();

      if (error) throw error;
      setFields(data?.custom_fields || {});
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const handleAddField = () => {
    if (!newKey || !newValue) {
      toast.error('Please enter both key and value');
      return;
    }

    if (fields[newKey]) {
      toast.error('Field already exists');
      return;
    }

    setFields({ ...fields, [newKey]: newValue });
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveField = (key: string) => {
    const updatedFields = { ...fields };
    delete updatedFields[key];
    setFields(updatedFields);
  };

  const handleUpdateField = (key: string, value: any) => {
    setFields({ ...fields, [key]: value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update({ custom_fields: fields })
        .eq('org_id', trialOrgId);

      if (error) throw error;

      toast.success('Custom fields saved successfully');
      setEditMode(false);
      onSave?.(fields);
    } catch (error) {
      console.error('Error saving custom fields:', error);
      toast.error('Failed to save custom fields');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Custom Fields
        </h3>
        <button
          onClick={() => setEditMode(!editMode)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg backdrop-blur-sm bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
        >
          {editMode ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              Edit
            </>
          )}
        </button>
      </div>

      {/* Fields Display/Edit */}
      {Object.keys(fields).length === 0 && !editMode ? (
        <div className="text-center py-8 rounded-xl backdrop-blur-sm bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/30">
          <p className="text-sm text-slate-500">No custom fields yet</p>
          <button
            onClick={() => setEditMode(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add custom fields
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(fields).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-3 p-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/30 hover:border-blue-500/30 transition-all"
            >
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Key
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {key}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Value
                  </div>
                  {editMode ? (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleUpdateField(key, e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded-lg backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {String(value)}
                    </div>
                  )}
                </div>
              </div>
              {editMode && (
                <button
                  onClick={() => handleRemoveField(key)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Field */}
      {editMode && (
        <div className="p-4 rounded-xl backdrop-blur-sm bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/30">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Key
              </label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g., industry"
                className="w-full px-3 py-2 text-sm rounded-lg backdrop-blur-sm bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Value
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g., Healthcare"
                className="w-full px-3 py-2 text-sm rounded-lg backdrop-blur-sm bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <button
              onClick={handleAddField}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Save Button */}
      {editMode && (
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Custom Fields'}
        </button>
      )}
    </div>
  );
}
