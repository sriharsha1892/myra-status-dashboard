'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, isAfter, isBefore, subDays, isPast } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AddMeetingNoteModal from '@/components/AddMeetingNoteModal';

interface MeetingNote {
  meeting_id: string;
  org_id: string;
  org_name?: string;
  meeting_type: string;
  meeting_date: string;
  duration_minutes: number | null;
  conducted_by: string;
  attendees: string[] | null;
  meeting_summary: string | null;
  action_items: Array<{
    description: string;
    assigned_to: string;
    due_date: string;
    status: 'pending' | 'completed';
  }>;
}

const MEETING_TYPE_ICONS: Record<string, string> = {
  demo: '🎯',
  follow_up_call: '📞',
  check_in: '✅',
  technical_review: '🔧',
  executive_briefing: '💼',
  other: '📝',
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  demo: 'Demo',
  follow_up_call: 'Follow-up Call',
  check_in: 'Check-in',
  technical_review: 'Technical Review',
  executive_briefing: 'Executive Briefing',
  other: 'Other',
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedConductedBy, setSelectedConductedBy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // For filter dropdowns
  const [allConductedBy, setAllConductedBy] = useState<string[]>([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);

  // Expanded summaries state
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [meetings, dateRange, selectedType, selectedConductedBy, searchQuery]);

  // Keyboard shortcut for quick add (Shift+N)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'N' && !showAddModal) {
        e.preventDefault();
        setShowAddModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAddModal]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const { data: meetingsData, error } = await supabase
        .from('meeting_notes')
        .select('*, trial_organizations(org_name)')
        .order('meeting_date', { ascending: false });

      if (error) throw error;

      // Format the data
      const formattedMeetings = meetingsData.map((meeting: any) => ({
        ...meeting,
        org_name: meeting.trial_organizations?.org_name || 'Unknown Org',
        action_items: typeof meeting.action_items === 'string'
          ? JSON.parse(meeting.action_items)
          : meeting.action_items || [],
      }));

      setMeetings(formattedMeetings);

      // Extract unique conducted_by values
      const uniqueConductedBy = Array.from(
        new Set(formattedMeetings.map((m) => m.conducted_by))
      ).sort();
      setAllConductedBy(uniqueConductedBy);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...meetings];

    // Date range filter
    if (dateRange !== 'all') {
      const daysAgo = parseInt(dateRange);
      const cutoffDate = subDays(new Date(), daysAgo);
      filtered = filtered.filter((meeting) =>
        isAfter(new Date(meeting.meeting_date), cutoffDate)
      );
    }

    // Meeting type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((meeting) => meeting.meeting_type === selectedType);
    }

    // Conducted by filter
    if (selectedConductedBy !== 'all') {
      filtered = filtered.filter((meeting) => meeting.conducted_by === selectedConductedBy);
    }

    // Search filter (org name or summary)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (meeting) =>
          meeting.org_name?.toLowerCase().includes(query) ||
          meeting.meeting_summary?.toLowerCase().includes(query)
      );
    }

    setFilteredMeetings(filtered);
  };

  const getActionItemsStatus = (actionItems: any[]) => {
    const completed = actionItems.filter((item) => item.status === 'completed').length;
    const total = actionItems.length;
    return { completed, total };
  };

  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate color from name
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  // Toggle summary expansion
  const toggleSummaryExpansion = (meetingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSummaries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId);
      } else {
        newSet.add(meetingId);
      }
      return newSet;
    });
  };

  // Calculate meeting statistics
  const calculateStats = () => {
    const totalMeetings = filteredMeetings.length;
    const uniqueOrgs = new Set(filteredMeetings.map((m) => m.org_id)).size;

    let totalActionItems = 0;
    let completedActionItems = 0;
    let overdueActionItems = 0;

    filteredMeetings.forEach((meeting) => {
      const items = meeting.action_items || [];
      totalActionItems += items.length;
      completedActionItems += items.filter((item: any) => item.status === 'completed').length;

      items.forEach((item: any) => {
        if (item.status !== 'completed' && item.due_date) {
          const dueDate = new Date(item.due_date);
          if (isPast(dueDate)) {
            overdueActionItems++;
          }
        }
      });
    });

    const completionRate = totalActionItems > 0 ? (completedActionItems / totalActionItems) * 100 : 0;

    return {
      totalMeetings,
      uniqueOrgs,
      totalActionItems,
      completedActionItems,
      overdueActionItems,
      completionRate,
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Meeting Timeline</h1>
            <p className="text-gray-600">Track all touchpoints with trial organizations</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
            aria-label="Add new meeting note"
          >
            + Add Meeting Note
          </button>
        </header>

        {/* Stats Dashboard */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8" aria-label="Meeting statistics overview">
          {/* Total Meetings */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:-translate-y-1" role="status" aria-label={`Total meetings: ${stats.totalMeetings}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalMeetings}</div>
            <div className="text-blue-100 text-sm font-medium">Total Meetings</div>
          </div>

          {/* Unique Organizations */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.uniqueOrgs}</div>
            <div className="text-purple-100 text-sm font-medium">Organizations</div>
          </div>

          {/* Action Items */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              <span className="text-green-200">{stats.completedActionItems}</span>
              <span className="text-xl text-indigo-200"> / {stats.totalActionItems}</span>
            </div>
            <div className="text-indigo-100 text-sm font-medium">Action Items</div>
          </div>

          {/* Completion Rate */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.completionRate.toFixed(1)}%</div>
            <div className="text-green-100 text-sm font-medium">Completion Rate</div>
          </div>

          {/* Overdue Items */}
          <div className={`bg-gradient-to-br ${stats.overdueActionItems > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'} rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:-translate-y-1`}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.overdueActionItems}</div>
            <div className={`${stats.overdueActionItems > 0 ? 'text-red-100' : 'text-gray-100'} text-sm font-medium`}>
              {stats.overdueActionItems > 0 ? 'Overdue Items' : 'No Overdue Items'}
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white rounded-xl shadow-md p-6 mb-8" aria-label="Meeting filters">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Date Range */}
            <div>
              <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                id="date-range-filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter meetings by date range"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {/* Meeting Type */}
            <div>
              <label htmlFor="meeting-type-filter" className="block text-sm font-medium text-gray-700 mb-2">Meeting Type</label>
              <select
                id="meeting-type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter meetings by type"
              >
                <option value="all">All Types</option>
                {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conducted By */}
            <div>
              <label htmlFor="conducted-by-filter" className="block text-sm font-medium text-gray-700 mb-2">Conducted By</label>
              <select
                id="conducted-by-filter"
                value={selectedConductedBy}
                onChange={(e) => setSelectedConductedBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter meetings by who conducted them"
              >
                <option value="all">All</option>
                {allConductedBy.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label htmlFor="search-meetings" className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                id="search-meetings"
                type="text"
                placeholder="Org name or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Search meetings by organization name or notes"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600" role="status" aria-live="polite" aria-atomic="true">
            Showing {filteredMeetings.length} of {meetings.length} meetings
          </div>
        </section>

        {/* Timeline */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading meetings...</p>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            {meetings.length === 0 ? (
              // No meetings at all - First time user
              <>
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Start Tracking Meetings</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Keep track of all your trial organization touchpoints. Document meetings, capture action items, and monitor follow-ups in one place.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-lg hover:shadow-xl"
                  >
                    Add Your First Meeting
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
                  >
                    Learn More
                  </button>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 font-semibold mb-2">📝 Document Meetings</div>
                    <p className="text-sm text-gray-600">Record meeting details, attendees, and key discussion points</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-purple-600 font-semibold mb-2">✅ Track Action Items</div>
                    <p className="text-sm text-gray-600">Create and monitor action items with due dates and assignees</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-green-600 font-semibold mb-2">🔔 Stay Updated</div>
                    <p className="text-sm text-gray-600">Get notifications for overdue items and upcoming tasks</p>
                  </div>
                </div>
              </>
            ) : (
              // Has meetings but filters resulted in no results
              <>
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Meetings Match Your Filters</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {dateRange !== 'all' && `No meetings found in the last ${dateRange} days${selectedType !== 'all' || selectedConductedBy !== 'all' || searchQuery ? ' with your selected filters' : ''}.`}
                  {dateRange === 'all' && (selectedType !== 'all' || selectedConductedBy !== 'all' || searchQuery) && 'Try adjusting your filters to see more results.'}
                </p>
                <div className="flex gap-3 justify-center mb-6">
                  <button
                    onClick={() => {
                      setDateRange('all');
                      setSelectedType('all');
                      setSelectedConductedBy('all');
                      setSearchQuery('');
                    }}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    Clear All Filters
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Add New Meeting
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Currently showing meetings with:</p>
                  <div className="flex gap-2 justify-center mt-2 flex-wrap">
                    {dateRange !== 'all' && (
                      <span className="px-3 py-1 bg-gray-100 rounded-full">Last {dateRange} days</span>
                    )}
                    {selectedType !== 'all' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">{MEETING_TYPE_LABELS[selectedType]}</span>
                    )}
                    {selectedConductedBy !== 'all' && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">{selectedConductedBy}</span>
                    )}
                    {searchQuery && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">Search: "{searchQuery}"</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <nav className="space-y-6" aria-label="Meeting list" role="list">
            {filteredMeetings.map((meeting) => {
              const { completed, total } = getActionItemsStatus(meeting.action_items);
              const icon = MEETING_TYPE_ICONS[meeting.meeting_type] || '📝';
              const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] || 'Meeting';

              return (
                <Link
                  key={meeting.meeting_id}
                  href={`/support/trials/meetings/${meeting.meeting_id}`}
                  className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 p-6 border-l-4 border-blue-500"
                  role="listitem"
                  aria-label={`${typeLabel} with ${meeting.org_name} on ${format(new Date(meeting.meeting_date), 'PPP')}. ${total > 0 ? `${completed} of ${total} action items completed.` : 'No action items.'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {typeLabel}
                            </span>
                            <Link
                              href={`/support/trials/${meeting.org_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-lg font-semibold text-blue-600 hover:underline"
                            >
                              {meeting.org_name}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-600 mt-1 flex items-center gap-3 flex-wrap">
                            <span>{format(new Date(meeting.meeting_date), 'PPpp')}</span>
                            {meeting.duration_minutes && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-medium">{meeting.duration_minutes ?? 0} min</span>
                                  {/* Duration indicator bar */}
                                  <div className="flex items-center gap-0.5 ml-1">
                                    {Array.from({ length: Math.min(Math.ceil((meeting.duration_minutes ?? 0) / 15), 8) }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-1 h-3 rounded-full ${
                                          (meeting.duration_minutes ?? 0) <= 30
                                            ? 'bg-green-400'
                                            : (meeting.duration_minutes ?? 0) <= 60
                                            ? 'bg-blue-400'
                                            : (meeting.duration_minutes ?? 0) <= 90
                                            ? 'bg-yellow-400'
                                            : 'bg-orange-400'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500 ml-1">
                                    {(meeting.duration_minutes ?? 0) <= 30 && '(Quick)'}
                                    {(meeting.duration_minutes ?? 0) > 30 && (meeting.duration_minutes ?? 0) <= 60 && '(Standard)'}
                                    {(meeting.duration_minutes ?? 0) > 60 && (meeting.duration_minutes ?? 0) <= 90 && '(Extended)'}
                                    {(meeting.duration_minutes ?? 0) > 90 && '(Long)'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conducted By & Attendees */}
                      <div className="flex flex-wrap items-center gap-4 mb-3">
                        {/* Conducted by badge */}
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${getColorFromName(meeting.conducted_by)} flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white shadow`}>
                            {getInitials(meeting.conducted_by)}
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500 text-xs">Conducted by</span>
                            <div className="font-medium text-gray-700">{meeting.conducted_by}</div>
                          </div>
                        </div>

                        {/* Attendees avatars */}
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Attendees:</span>
                            <div className="flex -space-x-2">
                              {meeting.attendees.slice(0, 4).map((attendee, idx) => (
                                <div
                                  key={idx}
                                  className={`w-8 h-8 rounded-full ${getColorFromName(attendee)} flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white shadow hover:z-10 hover:scale-110 transition-transform cursor-pointer`}
                                  title={attendee}
                                >
                                  {getInitials(attendee)}
                                </div>
                              ))}
                              {meeting.attendees.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-semibold ring-2 ring-white shadow">
                                  +{meeting.attendees.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      {meeting.meeting_summary && (
                        <div className="text-gray-700 mb-3">
                          <div className={`${!expandedSummaries.has(meeting.meeting_id) && meeting.meeting_summary.length > 200 ? 'line-clamp-3' : ''}`}>
                            {meeting.meeting_summary}
                          </div>
                          {meeting.meeting_summary.length > 200 && (
                            <button
                              onClick={(e) => toggleSummaryExpansion(meeting.meeting_id, e)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-flex items-center gap-1 transition-colors"
                            >
                              {expandedSummaries.has(meeting.meeting_id) ? (
                                <>
                                  <span>Show Less</span>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>Read More</span>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Action Items */}
                      {total > 0 && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm">
                          <span className="font-medium">Action Items:</span>
                          <span className="text-green-600 font-semibold">{completed}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-600 font-semibold">{total}</span>
                        </div>
                      )}
                    </div>

                    {/* Arrow (desktop) */}
                    <div className="ml-4 hidden md:block">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>

                    {/* Mobile Quick Actions */}
                    <div className="ml-4 flex gap-2 md:hidden">
                      <Link
                        href={`/support/trials/${meeting.org_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        aria-label="View organization details"
                        title="View Organization"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Copy meeting link to clipboard
                          navigator.clipboard.writeText(`${window.location.origin}/support/trials/meetings/${meeting.meeting_id}`);
                          toast.success('Link copied to clipboard');
                        }}
                        className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Copy meeting link"
                        title="Copy Link"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Add Meeting Modal */}
      <AddMeetingNoteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => fetchMeetings()}
      />

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-200 flex items-center justify-center z-50 group"
        title="Quick Add Meeting (Shift+N)"
        aria-label="Add new meeting"
      >
        <svg
          className="w-8 h-8 transition-transform duration-200 group-hover:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <div className="absolute -top-12 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          Quick Add Meeting
          <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
        </div>
      </button>
    </div>
  );
}
