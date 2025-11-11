'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Filter, ChevronDown } from 'lucide-react';
import UnifiedNoteEditor from './UnifiedNoteEditor';
import NoteCard from './NoteCard';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

interface UnifiedNotesPanelProps {
  noteType?: 'trial_org_note' | 'demo_note' | 'follow_up_note' | 'general_note' | 'feature_proposal';
  contextId?: string; // trial_org_id or demo_event_id
  contextName?: string; // Display name for context
  allowFeatureProposals?: boolean; // Show feature proposal option
  currentUserId: string;
  currentUserRole?: string;
}

type NoteTypeOption = {
  value: string;
  label: string;
  description: string;
};

const NOTE_TYPE_OPTIONS: NoteTypeOption[] = [
  {
    value: 'trial_org_note',
    label: 'Organization Note',
    description: 'General note about this organization'
  },
  {
    value: 'general_note',
    label: 'General Note',
    description: 'General observation or update'
  },
  {
    value: 'follow_up_note',
    label: 'Follow-up',
    description: 'Follow-up action or reminder'
  },
  {
    value: 'feature_proposal',
    label: 'Feature Proposal',
    description: 'Propose a new feature or enhancement'
  },
];

export default function UnifiedNotesPanel({
  noteType = 'trial_org_note',
  contextId,
  contextName,
  allowFeatureProposals = false,
  currentUserId,
  currentUserRole,
}: UnifiedNotesPanelProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedNoteType, setSelectedNoteType] = useState(noteType);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const supabase = createClient();

  // Filter note type options based on allowFeatureProposals
  const availableNoteTypes = NOTE_TYPE_OPTIONS.filter(opt =>
    allowFeatureProposals || opt.value !== 'feature_proposal'
  );

  useEffect(() => {
    fetchNotes();
  }, [contextId, filter]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('unified_notes')
        .select('*')
        .eq('deleted', false)
        .eq('is_root', true)
        .order('created_at', { ascending: false });

      // Filter by context
      if (contextId) {
        query = query.or(`trial_org_id.eq.${contextId},demo_event_id.eq.${contextId}`);
      }

      // Filter by creator
      if (filter === 'mine') {
        query = query.eq('created_by', currentUserId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteCreated = () => {
    setShowEditor(false);
    fetchNotes();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">
            {contextName ? `Notes - ${contextName}` : 'Notes'}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {notes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'mine')}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Notes</option>
            <option value="mine">My Notes</option>
          </select>

          {/* Add Note Button */}
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>
      </div>

      {/* Note Type Selector (when editor is open) */}
      {showEditor && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableNoteTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedNoteType(type.value as any)}
                className={`p-3 text-left rounded-lg border-2 transition-all ${
                  selectedNoteType === type.value
                    ? 'border-blue-600 bg-blue-100'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`text-sm font-medium ${
                  selectedNoteType === type.value ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {type.label}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {type.description}
                </div>
              </button>
            ))}
          </div>

          {selectedNoteType === 'feature_proposal' && (
            <div className="mt-3 p-3 bg-accent-50 border border-accent-200 rounded-lg">
              <p className="text-xs text-purple-900">
                <strong>Feature Proposals</strong> will notify all admins and appear in the Feature Proposals page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Note Editor */}
      {showEditor && (
        <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
          <UnifiedNoteEditor
            entityType={selectedNoteType as any}
            entityId={contextId}
            entityTitle={contextName}
            placeholder={`Write a ${NOTE_TYPE_OPTIONS.find(t => t.value === selectedNoteType)?.label.toLowerCase()}...`}
            onNoteCreated={handleNoteCreated}
            onCancel={() => setShowEditor(false)}
            showCancelButton={true}
          />
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-900 font-medium mb-1">No notes yet</p>
          <p className="text-sm text-gray-600 mb-4">
            {filter === 'mine'
              ? "You haven't created any notes yet."
              : "Be the first to add a note!"}
          </p>
          {!showEditor && (
            <button
              onClick={() => setShowEditor(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              showReplies={true}
              onNoteUpdated={fetchNotes}
              onNoteDeleted={fetchNotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
