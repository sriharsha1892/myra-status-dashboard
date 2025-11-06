'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';

type DemoEvent = Database['public']['Tables']['demo_events']['Row'];
type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];

export default function DemoDetailPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const params = useParams();
  const demoId = params.id as string;

  const [demo, setDemo] = useState<DemoEvent | null>(null);
  const [organization, setOrganization] = useState<TrialOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editedDemo, setEditedDemo] = useState({
    demo_status: '',
    attendee_names: '',
    demo_observations: '',
    pain_points: '',
    next_steps: '',
    demo_rating: 0
  });


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && demoId) {
      fetchDemo();
    }
  }, [user, demoId]);

  const fetchDemo = async () => {
    setLoading(true);
    try {
      const { data: demoData, error: demoError } = await supabase
        .from('demo_events')
        .select('*')
        .eq('demo_id', demoId)
        .single();

      if (demoError) throw demoError;

      const typedDemoData = demoData as any;
      setDemo(demoData);
      setEditedDemo({
        demo_status: typedDemoData.demo_status,
        attendee_names: typedDemoData.attendee_names?.join(', ') || '',
        demo_observations: typedDemoData.demo_observations || '',
        pain_points: typedDemoData.pain_points || '',
        next_steps: typedDemoData.next_steps || '',
        demo_rating: typedDemoData.demo_rating || 0
      });

      // Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from('trial_organizations')
        .select('*')
        .eq('org_id', typedDemoData.org_id)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);
    } catch (error: any) {
      console.error('Error fetching demo:', error);
      toast.error('Failed to load demo details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const attendeeArray = editedDemo.attendee_names
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('demo_events')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({
          demo_status: editedDemo.demo_status as 'scheduled' | 'completed' | 'cancelled',
          attendee_names: attendeeArray.length > 0 ? attendeeArray : null,
          demo_observations: editedDemo.demo_observations || null,
          pain_points: editedDemo.pain_points || null,
          next_steps: editedDemo.next_steps || null,
          demo_rating: editedDemo.demo_status === 'completed' && editedDemo.demo_rating > 0
            ? editedDemo.demo_rating
            : null
        })
        .eq('demo_id', demoId);

      if (error) throw error;

      toast.success('Demo updated successfully');
      fetchDemo();
    } catch (error: any) {
      console.error('Error updating demo:', error);
      toast.error('Failed to update demo');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('demo_events')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({ demo_status: 'completed' })
        .eq('demo_id', demoId);

      if (error) throw error;

      toast.success('Demo marked as completed');
      setEditedDemo({ ...editedDemo, demo_status: 'completed' });
      fetchDemo();
    } catch (error: any) {
      console.error('Error marking demo as completed:', error);
      toast.error('Failed to mark demo as completed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!demo || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-sm text-gray-500">Demo not found</div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-8 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{demo.demo_id}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Demo event details</p>
          </div>
          <button
            onClick={() => router.push('/support/trials/demos')}
            className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all border border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Demos</span>
          </button>
        </header>

        <div className="p-8 max-w-4xl">
          {/* Basic Info Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Demo ID</label>
                <p className="text-base font-mono text-gray-900">{demo.demo_id}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <button
                  onClick={() => router.push(`/support/trials/${organization.org_id}`)}
                  className="text-base text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  {organization.org_name}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <p className="text-base text-gray-900">
                  {format(new Date(demo.demo_date), 'MMMM d, yyyy')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <p className="text-base text-gray-900">{demo.demo_time || 'Not specified'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales POC</label>
                <p className="text-base text-gray-900">{demo.sales_poc}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editedDemo.demo_status}
                  onChange={(e) => setEditedDemo({ ...editedDemo, demo_status: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendees</h3>
            <textarea
              value={editedDemo.attendee_names}
              onChange={(e) => setEditedDemo({ ...editedDemo, attendee_names: e.target.value })}
              placeholder="John Doe, Jane Smith (comma-separated)"
              rows={3}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">Separate multiple names with commas</p>
          </div>

          {/* Demo Observations */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Observations</h3>
            <textarea
              value={editedDemo.demo_observations}
              onChange={(e) => setEditedDemo({ ...editedDemo, demo_observations: e.target.value })}
              placeholder="Notes from the demo session..."
              rows={6}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pain Points */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pain Points Identified</h3>
            <textarea
              value={editedDemo.pain_points}
              onChange={(e) => setEditedDemo({ ...editedDemo, pain_points: e.target.value })}
              placeholder="Key pain points discussed during the demo..."
              rows={6}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Next Steps */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
            <textarea
              value={editedDemo.next_steps}
              onChange={(e) => setEditedDemo({ ...editedDemo, next_steps: e.target.value })}
              placeholder="Action items and follow-up tasks..."
              rows={6}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Rating (only if completed) */}
          {editedDemo.demo_status === 'completed' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Rating</h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setEditedDemo({ ...editedDemo, demo_rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 ${
                        star <= editedDemo.demo_rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {editedDemo.demo_rating > 0
                    ? `${editedDemo.demo_rating} out of 5 stars`
                    : 'No rating'}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {demo.demo_status !== 'completed' && (
              <button
                onClick={handleMarkCompleted}
                className="px-6 h-11 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Mark Completed
              </button>
            )}
          </div>
        </div>
      </main>
  );
}
