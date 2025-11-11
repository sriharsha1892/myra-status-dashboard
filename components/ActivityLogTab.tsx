'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import MentionTextEditor from '@/components/MentionTextEditor';

interface ActivityLogTabProps {
  orgId: string;
}

interface ActivityNote {
  note_id: string;
  org_id: string;
  trial_user_id: string | null;
  logged_by: string;
  note_category: string;
  note_text: string;
  linked_roadmap_id: string | null;
  mentions: string[];
  created_at: string;
  updated_at: string | null;
  edited: boolean;
  trial_users: {
    user_id: string;
    name: string;
    email: string;
  } | null;
  roadmap_items: {
    roadmap_id: string;
    title: string;
    status: string;
  } | null;
}

interface TrialUser {
  user_id: string;
  full_name: string;
  email: string;
}

interface RoadmapItem {
  roadmap_id: string;
  title: string;
  status: string;
}

interface InternalUser {
  email: string;
  name: string;
}

const CATEGORY_CONFIG = {
  first_login: { label: 'First Login', color: 'bg-accent-100 text-accent-700 border-accent-200' },
  question: { label: 'Question', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  issue: { label: 'Issue', color: 'bg-red-100 text-red-700 border-red-200' },
  success: { label: 'Success', color: 'bg-green-100 text-green-700 border-green-200' },
  data_quality: { label: 'Data Quality', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  feature_request: { label: 'Feature Request', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function ActivityLogTab({ orgId }: ActivityLogTabProps) {
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTrialUser, setSelectedTrialUser] = useState<string>('');
  const [selectedRoadmap, setSelectedRoadmap] = useState<string>('');
  const [editorKey, setEditorKey] = useState(0); // Key to reset editor after submit

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterTrialUser, setFilterTrialUser] = useState<string>('');
  const [filterLoggedBy, setFilterLoggedBy] = useState<string>('');
  const [filterHasRoadmap, setFilterHasRoadmap] = useState<boolean>(false);

  const supabase = createClient();

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch activity notes
      const { data: notesData, error: notesError } = await supabase
        .from('org_activity_notes')
        .select(`
          *,
          trial_users:trial_user_id (
            user_id,
            name:full_name,
            email
          ),
          roadmap_items:linked_roadmap_id (
            roadmap_id,
            title,
            status
          )
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);

      // Fetch trial users for this org
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('user_id, full_name, email')
        .eq('org_id', orgId)
        .order('full_name', { ascending: true });

      if (usersError) throw usersError;
      setTrialUsers(usersData || []);

      // Fetch roadmap items
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmap_items')
        .select('roadmap_id, title, status')
        .order('title', { ascending: true });

      if (roadmapError) {
        console.log('Roadmap items may not exist:', roadmapError);
        setRoadmapItems([]);
      } else {
        setRoadmapItems(roadmapData || []);
      }

      // Fetch internal users for @mentions
      const { data: internalUsersData, error: internalUsersError } = await supabase
        .from('users')
        .select('email, full_name')
        .order('full_name', { ascending: true });

      if (internalUsersError) {
        console.log('Internal users may not exist:', internalUsersError);
        setInternalUsers([]);
      } else {
        setInternalUsers((internalUsersData || []).map((u: any) => ({
          email: u.email,
          name: u.full_name || u.email,
        })));
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (noteContent: string, mentionedUserIds: string[]) => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    if (!noteContent || noteContent === '<p></p>') {
      toast.error('Please enter note text');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/activity-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          trial_user_id: selectedTrialUser || null,
          note_category: selectedCategory,
          note_text: noteContent, // Now HTML content
          linked_roadmap_id: selectedRoadmap || null,
          mentions: mentionedUserIds, // User IDs from editor
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create note');
      }

      toast.success('Activity logged successfully');

      // Reset form
      setSelectedCategory('');
      setSelectedTrialUser('');
      setSelectedRoadmap('');
      setEditorKey(prev => prev + 1); // Reset editor by changing key

      // Refresh notes
      fetchData();
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast.error(error.message || 'Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  };


  const filteredNotes = notes.filter((note) => {
    if (filterCategory && note.note_category !== filterCategory) return false;
    if (filterTrialUser && note.trial_user_id !== filterTrialUser) return false;
    if (filterLoggedBy && note.logged_by !== filterLoggedBy) return false;
    if (filterHasRoadmap && !note.linked_roadmap_id) return false;
    return true;
  });

  const uniqueLoggedByUsers = Array.from(new Set(notes.map((n) => n.logged_by)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading activity log...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Log Form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Log Activity</h3>

        {/* Category Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  selectedCategory === key
                    ? config.color + ' ring-2 ring-offset-1 ring-current'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trial User Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Trial User (Optional)</label>
          <select
            value={selectedTrialUser}
            onChange={(e) => setSelectedTrialUser(e.target.value)}
            className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select trial user...</option>
            {trialUsers.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.full_name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Roadmap Link */}
        {roadmapItems.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Link to Roadmap (Optional)</label>
            <select
              value={selectedRoadmap}
              onChange={(e) => setSelectedRoadmap(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select roadmap item...</option>
              {roadmapItems.map((item) => (
                <option key={item.roadmap_id} value={item.roadmap_id}>
                  {item.title} ({item.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Note Text with Rich Text Editor */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Note *</label>
          <MentionTextEditor
            key={editorKey}
            placeholder="Type your activity note here... Use @ to mention team members"
            onSubmit={handleSubmit}
            submitButtonText={submitting ? 'Logging...' : 'Log Activity'}
            minHeight="120px"
            showToolbar={true}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Trial User</label>
            <select
              value={filterTrialUser}
              onChange={(e) => setFilterTrialUser(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Users</option>
              {trialUsers.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Logged By</label>
            <select
              value={filterLoggedBy}
              onChange={(e) => setFilterLoggedBy(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Team Members</option>
              {uniqueLoggedByUsers.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 h-9 cursor-pointer">
              <input
                type="checkbox"
                checked={filterHasRoadmap}
                onChange={(e) => setFilterHasRoadmap(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Has Roadmap Link</span>
            </label>
          </div>
        </div>
        {(filterCategory || filterTrialUser || filterLoggedBy || filterHasRoadmap) && (
          <button
            onClick={() => {
              setFilterCategory('');
              setFilterTrialUser('');
              setFilterLoggedBy('');
              setFilterHasRoadmap(false);
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Activity Timeline ({filteredNotes.length})
          </h3>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-12 text-center">
            <p className="text-gray-500">No activity notes yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => {
              const config = CATEGORY_CONFIG[note.note_category as keyof typeof CATEGORY_CONFIG];

              return (
                <div
                  key={note.note_id}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">by {note.logged_by}</span>
                        {note.edited && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs text-gray-400 italic">edited</span>
                          </>
                        )}
                      </div>

                      {note.trial_users && (
                        <div className="mb-2 text-sm text-gray-600">
                          <span className="font-medium">Trial User:</span> {note.trial_users.name} ({note.trial_users.email})
                        </div>
                      )}

                      <div
                        className="text-sm text-gray-800 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: note.note_text }}
                      />

                      {note.roadmap_items && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="font-medium text-indigo-700">Roadmap:</span>
                          <span className="text-indigo-600">{note.roadmap_items.title}</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {note.roadmap_items.status}
                          </span>
                        </div>
                      )}

                      {note.mentions && note.mentions.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span>Mentioned:</span>
                          {note.mentions.map((email, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded-full">
                              @{email}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
