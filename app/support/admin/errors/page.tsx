'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { BulkActionsToolbar } from '@/components/error-dashboard/BulkActionsToolbar';
import { ErrorTrendsChart } from '@/components/error-dashboard/ErrorTrendsChart';

interface ErrorReport {
  id: string;
  error_message: string;
  error_type: string;
  context: string;
  user_id: string | null;
  user_email: string | null;
  page_url: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'ignored' | 'duplicate';
  priority_score: number;
  occurrence_count: number;
  reported_at: string;
  last_occurrence_at: string;
  ticket_id: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface ErrorSummary {
  context: string;
  total_errors: number;
  affected_users: number;
  last_error_at: string;
  avg_priority: number;
  open_count: number;
  resolved_count: number;
}

export default function ErrorsPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [summaries, setSummaries] = useState<ErrorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [view, setView] = useState<'list' | 'summary' | 'trends'>('list');

  // Bulk selection
  const [selectedErrorIds, setSelectedErrorIds] = useState<Set<string>>(new Set());

  // Admin users for assignment
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7days');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    } else if (user) {
      // Check for is_super_admin flag
      const checkSuperAdmin = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from('users')
          .select('is_super_admin')
          .eq('id', user.id)
          .single();

        setIsSuperAdmin(data?.is_super_admin || false);

        // Redirect if not admin and not super admin
        if (!authLoading && role?.toLowerCase() !== 'admin' && !data?.is_super_admin) {
          router.push('/support/dashboard');
          toast.error('Admin access required');
        }
      };

      checkSuperAdmin();
    }
  }, [user, authLoading, role, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'admin' || isSuperAdmin)) {
      fetchAdminUsers();
      if (view === 'list') {
        fetchErrors();
      } else {
        fetchSummaries();
      }
    }
  }, [user, role, isSuperAdmin, view, statusFilter, typeFilter, contextFilter, dateFilter, assignmentFilter]);

  const fetchAdminUsers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'admin')
        .order('email');

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
    }
  };

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from('error_reports')
        .select('*')
        .is('deleted_at', null)
        .order('reported_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('error_type', typeFilter);
      }
      if (contextFilter !== 'all') {
        query = query.eq('context', contextFilter);
      }
      if (assignmentFilter !== 'all') {
        if (assignmentFilter === 'assigned-to-me') {
          query = query.eq('assigned_to', user?.id);
        } else if (assignmentFilter === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          // Specific user ID
          query = query.eq('assigned_to', assignmentFilter);
        }
      }

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('reported_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setErrors(data || []);
    } catch (error: any) {
      console.error('Error fetching errors:', error);
      toast.error('Failed to load error reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('error_summary_by_context')
        .select('*')
        .order('total_errors', { ascending: false });

      if (error) throw error;

      setSummaries(data || []);
    } catch (error: any) {
      console.error('Error fetching summaries:', error);
      toast.error('Failed to load error summaries');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (errorId: string, newStatus: string) => {
    try {
      const supabase = createClient();

      const updates: any = {
        status: newStatus,
      };

      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('error_reports')
        .update(updates)
        .eq('id', errorId);

      if (error) throw error;

      toast.success(`Error marked as ${newStatus}`);
      fetchErrors();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update error status');
    }
  };

  const handleAssignment = async (errorId: string, assignedTo: string | null) => {
    try {
      const supabase = createClient();

      const updates: any = {
        assigned_to: assignedTo,
        assigned_at: assignedTo ? new Date().toISOString() : null,
        assigned_by: assignedTo ? user?.id : null, // Track who assigned
      };

      const { error } = await supabase
        .from('error_reports')
        .update(updates)
        .eq('id', errorId);

      if (error) throw error;

      if (assignedTo) {
        const assignee = adminUsers.find((u) => u.id === assignedTo);
        toast.success(`Error assigned to ${assignee?.email || 'user'}`);
      } else {
        toast.success('Error unassigned');
      }
      fetchErrors();
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update error assignment');
    }
  };

  // Bulk selection handlers
  const handleSelectError = (errorId: string, checked: boolean) => {
    setSelectedErrorIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(errorId);
      } else {
        newSet.delete(errorId);
      }
      return newSet;
    });
  };

  const handleSelectAllOnPage = (checked: boolean) => {
    setSelectedErrorIds((prev) => {
      const newSet = new Set(prev);
      currentErrors.forEach((error) => {
        if (checked) {
          newSet.add(error.id);
        } else {
          newSet.delete(error.id);
        }
      });
      return newSet;
    });
  };

  const handleSelectAllMatchingFilters = (checked: boolean) => {
    if (checked) {
      // Select all errors matching current filters
      setSelectedErrorIds(new Set(errors.map((e) => e.id)));
    } else {
      // Deselect all
      setSelectedErrorIds(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedErrorIds(new Set());
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 80) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Critical</span>;
    } else if (score >= 60) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">High</span>;
    } else if (score >= 40) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Medium</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800',
      investigating: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      ignored: 'bg-gray-100 text-gray-800',
      duplicate: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      network: 'bg-blue-100 text-blue-800',
      auth: 'bg-red-100 text-red-800',
      database: 'bg-purple-100 text-purple-800',
      validation: 'bg-yellow-100 text-yellow-800',
      permission: 'bg-orange-100 text-orange-800',
      timeout: 'bg-pink-100 text-pink-800',
      unknown: 'bg-gray-100 text-gray-800',
      duplicate: 'bg-green-100 text-green-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  // Pagination
  const totalPages = Math.ceil(errors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentErrors = errors.slice(startIndex, endIndex);

  // Check if all errors on current page are selected
  const allOnPageSelected = currentErrors.length > 0 && currentErrors.every((error) => selectedErrorIds.has(error.id));
  const someOnPageSelected = currentErrors.some((error) => selectedErrorIds.has(error.id)) && !allOnPageSelected;

  // Get unique values for filters
  const uniqueTypes = Array.from(new Set(errors.map(e => e.error_type).filter(Boolean)));
  const uniqueContexts = Array.from(new Set(errors.map(e => e.context).filter(Boolean)));

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading error reports...</p>
        </div>
      </div>
    );
  }

  if (!user || (role?.toLowerCase() !== 'admin' && !isSuperAdmin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Error Reports</h1>
          <p className="mt-2 text-gray-600">Monitor and manage application errors</p>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Error List
          </button>
          <button
            onClick={() => setView('trends')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'trends'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Summary by Context
          </button>
        </div>

        {/* Filters */}
        {view === 'list' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Assignment Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment</label>
                <select
                  value={assignmentFilter}
                  onChange={(e) => {
                    setAssignmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Errors</option>
                  <option value="assigned-to-me">Assigned to Me</option>
                  <option value="unassigned">Unassigned</option>
                  {adminUsers.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name || admin.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="ignored">Ignored</option>
                  <option value="duplicate">Duplicate</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Error Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Context Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Context</label>
                <select
                  value={contextFilter}
                  onChange={(e) => {
                    setContextFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Contexts</option>
                  {uniqueContexts.map((context) => (
                    <option key={context} value={context}>
                      {context}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Trends View */}
        {view === 'trends' && <ErrorTrendsChart />}

        {/* Summary View */}
        {view === 'summary' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Context
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Errors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Affected Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open / Resolved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaries.map((summary) => (
                  <tr key={summary.context} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{summary.context}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{summary.total_errors}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{summary.affected_users}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(Math.round(summary.avg_priority))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className="text-red-600 font-medium">{summary.open_count}</span>
                        {' / '}
                        <span className="text-green-600 font-medium">{summary.resolved_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(summary.last_error_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {summaries.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No error summaries found</p>
              </div>
            )}
          </div>
        )}

        {/* Error List View */}
        {view === 'list' && (
          <>
            {/* Bulk Actions Toolbar */}
            {selectedErrorIds.size > 0 && (
              <BulkActionsToolbar
                selectedErrorIds={selectedErrorIds}
                onActionComplete={fetchErrors}
                onClearSelection={clearSelection}
                currentUserId={user?.id}
              />
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm font-medium text-gray-500">Total Errors</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{errors.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm font-medium text-gray-500">Open</div>
                <div className="mt-1 text-2xl font-semibold text-red-600">
                  {errors.filter((e) => e.status === 'open').length}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm font-medium text-gray-500">Investigating</div>
                <div className="mt-1 text-2xl font-semibold text-purple-600">
                  {errors.filter((e) => e.status === 'investigating').length}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm font-medium text-gray-500">Resolved</div>
                <div className="mt-1 text-2xl font-semibold text-green-600">
                  {errors.filter((e) => e.status === 'resolved').length}
                </div>
              </div>
            </div>

            {/* Selection Banner */}
            {selectedErrorIds.size > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedErrorIds.size} error{selectedErrorIds.size !== 1 ? 's' : ''} selected
                    </span>
                    {selectedErrorIds.size < errors.length && (
                      <button
                        onClick={() => handleSelectAllMatchingFilters(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Select all {errors.length} matching filters
                      </button>
                    )}
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            )}

            {/* Error Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = someOnPageSelected;
                          }
                        }}
                        onChange={(e) => handleSelectAllOnPage(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type / Context
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Occurrences
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reported
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentErrors.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedErrorIds.has(error.id)}
                          onChange={(e) => handleSelectError(error.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 truncate" title={error.error_message}>
                            {error.error_message}
                          </div>
                          {error.user_email && (
                            <div className="text-xs text-gray-500 mt-1">{error.user_email}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getTypeBadge(error.error_type)}
                          <div className="text-xs text-gray-500">{error.context}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(error.priority_score)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(error.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {error.occurrence_count > 1 ? (
                            <span className="font-medium text-red-600">{error.occurrence_count}x</span>
                          ) : (
                            <span>1x</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {format(new Date(error.reported_at), 'MMM d, HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={error.assigned_to || ''}
                          onChange={(e) => handleAssignment(error.id, e.target.value || null)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs max-w-[150px]"
                        >
                          <option value="">Unassigned</option>
                          {adminUsers.map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.full_name || admin.email}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={error.status}
                          onChange={(e) => handleStatusChange(error.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="open">Open</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="ignored">Ignored</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {errors.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No errors found with current filters</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, errors.length)} of {errors.length} errors
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
