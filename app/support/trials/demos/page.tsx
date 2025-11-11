'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';

type DemoEvent = Database['public']['Tables']['demo_events']['Row'];
type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];

interface DemoWithOrg extends DemoEvent {
  org_name: string;
}

export default function DemosPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [demos, setDemos] = useState<DemoWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Schedule modal state
  const [organizations, setOrganizations] = useState<TrialOrg[]>([]);
  const [newDemo, setNewDemo] = useState({
    org_id: '',
    demo_date: '',
    demo_time: '',
    sales_poc: '',
    attendee_names: ''
  });
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDemos();
      fetchOrganizations();
    }
  }, [user]);

  const fetchDemos = async () => {
    const supabase = createClient();
    setLoading(true);
    try {
      const { data: demosData, error: demosError } = await supabase
        .from('demo_events')
        .select('*')
        .order('demo_date', { ascending: false });

      if (demosError) throw demosError;

      // Fetch org names
      const { data: orgsData, error: orgsError } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name');

      if (orgsError) throw orgsError;

      // Combine data
      const demosWithOrgs: DemoWithOrg[] = (demosData || []).map((demo: any) => {
        const org = (orgsData as any)?.find((o: any) => o.org_id === demo.org_id);
        return {
          ...demo,
          org_name: org?.org_name || 'Unknown'
        };
      });

      setDemos(demosWithOrgs);
    } catch (error: any) {
      console.error('Error fetching demos:', error);
      toast.error('Failed to load demos');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('*')
        .order('org_name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleScheduleDemo = async (e: React.FormEvent) => {
    const supabase = createClient();
    e.preventDefault();
    setScheduling(true);

    try {
      const attendeeArray = newDemo.attendee_names
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      // @ts-ignore - Supabase typing issue with dynamic columns
      const { error } = await supabase.from('demo_events').insert({
        org_id: newDemo.org_id,
        demo_date: newDemo.demo_date,
        demo_time: newDemo.demo_time || null,
        sales_poc: newDemo.sales_poc,
        attendee_names: attendeeArray.length > 0 ? attendeeArray : null
      });

      if (error) throw error;

      toast.success('Demo scheduled successfully');
      setShowScheduleModal(false);
      setNewDemo({
        org_id: '',
        demo_date: '',
        demo_time: '',
        sales_poc: '',
        attendee_names: ''
      });
      fetchDemos();
    } catch (error: any) {
      console.error('Error scheduling demo:', error);
      toast.error('Failed to schedule demo');
    } finally {
      setScheduling(false);
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

  const filteredDemos = statusFilter === 'all'
    ? demos
    : demos.filter((demo) => demo.demo_status === statusFilter);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-8 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Demo Events</h2>
            <p className="text-xs text-gray-500 mt-0.5">Schedule and manage product demonstrations</p>
          </div>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 h-9 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Schedule Demo</span>
          </button>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-medium text-gray-600">Loading demos...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Demos Table */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Demo ID</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Date</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Organization</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Sales POC</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredDemos.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                            No demos found
                          </td>
                        </tr>
                      ) : (
                        filteredDemos.map((demo) => (
                          <tr
                            key={demo.demo_id}
                            onClick={() => router.push(`/support/trials/demos/${demo.demo_id}`)}
                            className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-gray-900">{demo.demo_id}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900">
                                {format(new Date(demo.demo_date), 'MMM d, yyyy')}
                                {demo.demo_time && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    {demo.demo_time}
                                  </span>
                                )}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900">{demo.org_name}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900">{demo.sales_poc}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(demo.demo_status)}`}>
                                {demo.demo_status.charAt(0).toUpperCase() + demo.demo_status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {demo.demo_rating ? (
                                <div className="flex items-center gap-1">
                                  {[...Array(demo.demo_rating)].map((_, i) => (
                                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                    </svg>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No rating</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Schedule Demo Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Schedule Demo</h3>
              <p className="text-sm text-gray-500 mt-1">Schedule a product demonstration for a trial organization</p>
            </div>

            <form onSubmit={handleScheduleDemo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization *
                </label>
                <select
                  required
                  value={newDemo.org_id}
                  onChange={(e) => setNewDemo({ ...newDemo, org_id: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select organization</option>
                  {organizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Demo Date *
                </label>
                <input
                  type="date"
                  required
                  value={newDemo.demo_date}
                  onChange={(e) => setNewDemo({ ...newDemo, demo_date: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Demo Time
                </label>
                <input
                  type="time"
                  value={newDemo.demo_time}
                  onChange={(e) => setNewDemo({ ...newDemo, demo_time: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales POC *
                </label>
                <input
                  type="text"
                  required
                  value={newDemo.sales_poc}
                  onChange={(e) => setNewDemo({ ...newDemo, sales_poc: e.target.value })}
                  placeholder="Enter sales point of contact"
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attendees
                </label>
                <input
                  type="text"
                  value={newDemo.attendee_names}
                  onChange={(e) => setNewDemo({ ...newDemo, attendee_names: e.target.value })}
                  placeholder="John Doe, Jane Smith (comma-separated)"
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple names with commas</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setNewDemo({
                      org_id: '',
                      demo_date: '',
                      demo_time: '',
                      sales_poc: '',
                      attendee_names: ''
                    });
                  }}
                  className="flex-1 h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Demo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
