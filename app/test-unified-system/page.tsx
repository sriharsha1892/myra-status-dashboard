'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import UnifiedNoteEditor from '@/components/UnifiedNoteEditor';
import NoteCard from '@/components/NoteCard';
import ActivitySidebar from '@/components/ActivitySidebar';
import { createClient } from '@/lib/supabase/client';

export default function TestUnifiedSystemPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadCurrentUser();
    loadNotes();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/unified-notes?entity_type=standalone&limit=20');
      if (!response.ok) throw new Error('Failed to load notes');

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Unified Notifications & Notes System
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Test the new unified system with priority scoring & threading
              </p>
            </div>

            {/* Activity Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Instructions */}
        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🧪 Testing Instructions
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Create standalone notes below (use @ to mention users)</li>
            <li>• Click the bell icon to view notifications</li>
            <li>• Reply to notes to test threading</li>
            <li>• Check priority scoring (mentions = 60+ score)</li>
            <li>• Test visibility levels (team/internal/private)</li>
          </ul>
        </div>

        {/* Note Editor */}
        <div className="mb-8">
          <UnifiedNoteEditor
            entityType="standalone"
            visibility="team"
            placeholder="Create a test note... Use @ to mention someone and trigger notifications"
            onNoteCreated={loadNotes}
          />
        </div>

        {/* Notes List */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Standalone Notes ({notes.length})
          </h2>

          {loading ? (
            <div className="text-center py-12 text-slate-500">
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-2">No notes yet</p>
              <p className="text-sm text-slate-400">Create your first note above!</p>
            </div>
          ) : (
            notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                showReplies={true}
                onNoteUpdated={loadNotes}
                onNoteDeleted={loadNotes}
              />
            ))
          )}
        </div>
      </div>

      {/* Activity Sidebar */}
      <ActivitySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}
