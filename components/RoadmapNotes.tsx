'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Note {
  id: string;
  content: string;
  note_type: string;
  author_name: string;
  created_at: string;
}

interface RoadmapNotesProps {
  orgId: string;
  roadmapItemId: string;
}

export default function RoadmapNotes({ orgId, roadmapItemId }: RoadmapNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'comment' | 'update' | 'blocker' | 'decision'>('comment');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchNotes();
  }, [roadmapItemId]);

  const fetchNotes = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_notes')
        .select('*')
        .eq('roadmap_item_id', roadmapItemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('roadmap_notes').insert({
        org_id: orgId,
        roadmap_item_id: roadmapItemId,
        content: newNote,
        note_type: noteType,
      });

      if (error) throw error;

      toast.success('Note added!');
      setNewNote('');
      setNoteType('comment');
      fetchNotes();
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'update':
        return '📝';
      case 'blocker':
        return '🚧';
      case 'decision':
        return '✅';
      default:
        return '💬';
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'update':
        return 'bg-blue-50 border-blue-200';
      case 'blocker':
        return 'bg-red-50 border-red-200';
      case 'decision':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2 mb-3">
          {(['comment', 'update', 'blocker', 'decision'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setNoteType(type)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                noteType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getNoteIcon(type)} {type}
            </button>
          ))}
        </div>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note, update, blocker, or decision..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          rows={3}
        />
        <button
          onClick={handleAddNote}
          disabled={loading || !newNote.trim()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all"
        >
          {loading ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Notes List */}
      <div className="space-y-2">
        {fetching ? (
          <div className="text-center py-4 text-gray-500">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">No notes yet. Start a discussion!</div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={`rounded-lg border p-3 ${getNoteColor(note.note_type)}`}>
              <div className="flex items-start gap-2 mb-1">
                <span className="text-lg flex-shrink-0">{getNoteIcon(note.note_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{note.author_name}</p>
                  <p className="text-xs text-gray-600">{format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
              <p className="text-sm text-gray-800 mt-2">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
