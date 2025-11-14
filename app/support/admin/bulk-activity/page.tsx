'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface TrialOrg {
  org_id: string;
  org_name: string;
  domain: string;
}

interface ActivityEntry {
  id: string; // Temporary ID for tracking
  date: string;
  category: string;
  trialUserId: string;
  noteText: string;
}

interface OrgActivities {
  org: TrialOrg;
  entries: ActivityEntry[];
}

const ACTIVITY_CATEGORIES = [
  { value: 'first_login', label: 'First Login' },
  { value: 'question', label: 'Question' },
  { value: 'issue', label: 'Issue' },
  { value: 'success', label: 'Success' },
  { value: 'data_quality', label: 'Data Quality' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
];

export default function BulkActivityPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<TrialOrg[]>([]);
  const [trialUsers, setTrialUsers] = useState<Record<string, any[]>>({});
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [orgActivities, setOrgActivities] = useState<Record<string, ActivityEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }

    if (user && role !== 'Admin') {
      toast.error('Admin access required');
      router.push('/support/dashboard');
      return;
    }

    if (user && !authLoading) {
      fetchOrganizations();
    }
  }, [user, authLoading, role, router]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, domain')
        .eq('org_lifecycle_stage', 'trial_active')
        .order('org_name', { ascending: true });

      if (error) throw error;
      setOrgs(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialUsers = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('trial_users')
        .select('user_id, full_name, email')
        .eq('org_id', orgId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setTrialUsers(prev => ({ ...prev, [orgId]: data || [] }));
    } catch (error: any) {
      console.error('Error fetching trial users:', error);
    }
  };

  const addOrg = (orgId: string) => {
    if (!selectedOrgs.includes(orgId)) {
      setSelectedOrgs(prev => [...prev, orgId]);
      setOrgActivities(prev => ({
        ...prev,
        [orgId]: [{
          id: crypto.randomUUID(),
          date: format(new Date(), 'yyyy-MM-dd'),
          category: '',
          trialUserId: '',
          noteText: '',
        }]
      }));
      fetchTrialUsers(orgId);
    }
  };

  const removeOrg = (orgId: string) => {
    setSelectedOrgs(prev => prev.filter(id => id !== orgId));
    setOrgActivities(prev => {
      const newState = { ...prev };
      delete newState[orgId];
      return newState;
    });
  };

  const addEntry = (orgId: string) => {
    setOrgActivities(prev => ({
      ...prev,
      [orgId]: [
        ...prev[orgId],
        {
          id: crypto.randomUUID(),
          date: format(new Date(), 'yyyy-MM-dd'),
          category: '',
          trialUserId: '',
          noteText: '',
        }
      ]
    }));
  };

  const removeEntry = (orgId: string, entryId: string) => {
    setOrgActivities(prev => ({
      ...prev,
      [orgId]: prev[orgId].filter(entry => entry.id !== entryId)
    }));
  };

  const updateEntry = (orgId: string, entryId: string, field: keyof ActivityEntry, value: string) => {
    setOrgActivities(prev => ({
      ...prev,
      [orgId]: prev[orgId].map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const handleSaveAll = async () => {
    // Validate all entries
    const allEntries = Object.entries(orgActivities).flatMap(([orgId, entries]) =>
      entries.map(entry => ({ orgId, ...entry }))
    );

    const invalidEntries = allEntries.filter(entry =>
      !entry.category || !entry.noteText.trim()
    );

    if (invalidEntries.length > 0) {
      toast.error('Please fill in category and note text for all entries');
      return;
    }

    setSaving(true);
    try {
      const activitiesToSave = allEntries.map(entry => ({
        org_id: entry.orgId,
        trial_user_id: entry.trialUserId || null,
        note_category: entry.category,
        note_text: entry.noteText,
        created_at: new Date(entry.date).toISOString(),
        linked_roadmap_id: null,
        mentions: [],
      }));

      const { error } = await supabase
        .from('activity_notes')
        .insert(activitiesToSave);

      if (error) throw error;

      toast.success(`Successfully saved ${activitiesToSave.length} activities!`);

      // Reset
      setSelectedOrgs([]);
      setOrgActivities({});
    } catch (error: any) {
      console.error('Error saving activities:', error);
      toast.error('Failed to save activities');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  const totalEntries = Object.values(orgActivities).reduce((sum, entries) => sum + entries.length, 0);

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/support/dashboard')}
            className="mb-4 flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Bulk Activity Entry</h1>
              <p className="text-neutral-600 mt-1">Add historical activity notes for multiple trial organizations</p>
            </div>
            {totalEntries > 0 && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : `Save All (${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'})`}
              </button>
            )}
          </div>
        </div>

        {/* Add Organization Dropdown */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <label className="block text-sm font-semibold text-neutral-900 mb-3">
            Select Organization to Add Activities
          </label>
          <select
            value=""
            onChange={(e) => e.target.value && addOrg(e.target.value)}
            className="w-full h-12 px-4 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose an organization...</option>
            {orgs.filter(org => !selectedOrgs.includes(org.org_id)).map(org => (
              <option key={org.org_id} value={org.org_id}>
                {org.org_name} {org.domain && `(${org.domain})`}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Organizations & Activity Grids */}
        {selectedOrgs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Organizations Selected</h3>
            <p className="text-neutral-600">Select an organization above to start adding activity notes</p>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedOrgs.map(orgId => {
              const org = orgs.find(o => o.org_id === orgId);
              if (!org) return null;

              const entries = orgActivities[orgId] || [];
              const orgTrialUsers = trialUsers[orgId] || [];

              return (
                <div key={orgId} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Org Header */}
                  <div className="bg-accent-500 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{org.org_name}</h3>
                      {org.domain && <p className="text-sm text-blue-100">{org.domain}</p>}
                    </div>
                    <button
                      onClick={() => removeOrg(orgId)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      title="Remove organization"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Activity Entries */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {entries.map((entry, index) => (
                        <div key={entry.id} className="flex gap-4 items-start p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>

                          <div className="flex-1 grid grid-cols-12 gap-4">
                            {/* Date */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-neutral-700 mb-1">Date *</label>
                              <input
                                type="date"
                                value={entry.date}
                                onChange={(e) => updateEntry(orgId, entry.id, 'date', e.target.value)}
                                max={format(new Date(), 'yyyy-MM-dd')}
                                className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Category */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-neutral-700 mb-1">Category *</label>
                              <select
                                value={entry.category}
                                onChange={(e) => updateEntry(orgId, entry.id, 'category', e.target.value)}
                                className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select...</option>
                                {ACTIVITY_CATEGORIES.map(cat => (
                                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Trial User */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-neutral-700 mb-1">Trial User</label>
                              <select
                                value={entry.trialUserId}
                                onChange={(e) => updateEntry(orgId, entry.id, 'trialUserId', e.target.value)}
                                className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">None</option>
                                {orgTrialUsers.map(user => (
                                  <option key={user.user_id} value={user.user_id}>
                                    {user.full_name || user.email}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Note Text */}
                            <div className="col-span-5">
                              <label className="block text-xs font-medium text-neutral-700 mb-1">Activity Note *</label>
                              <input
                                type="text"
                                value={entry.noteText}
                                onChange={(e) => updateEntry(orgId, entry.id, 'noteText', e.target.value)}
                                placeholder="What happened?"
                                className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Remove Button */}
                            <div className="col-span-1 flex items-end">
                              <button
                                onClick={() => removeEntry(orgId, entry.id)}
                                className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Row Button */}
                    <button
                      onClick={() => addEntry(orgId)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Activity
                    </button>
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
