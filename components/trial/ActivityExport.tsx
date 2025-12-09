'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, Filter, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';
import { Skeleton } from '@/components/skeletons';

interface ActivityExportProps {
  organizationIds?: string[]; // Optional: filter by specific orgs
  onClose: () => void;
}

interface ActivityLogEntry {
  activity_id: string;
  org_id: string;
  org_name?: string;
  activity_type: string;
  description: string;
  created_at: string;
  logged_by: string;
  logged_by_role: string;
}

const ACTIVITY_TYPES = [
  'usage_observed',
  'user_logged_in',
  'follow_up_note',
  'demo_scheduled',
  'trial_extended',
  'milestone_achieved',
  'meeting_held',
  'contract_sent',
  'payment_received',
];

export default function ActivityExport({ organizationIds, onClose }: ActivityExportProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [includeOrgDetails, setIncludeOrgDetails] = useState(true);

  const supabase = createClient();

  // Close modal on Escape key (disabled during export)
  useEscapeKey(onClose, !exporting);

  useEffect(() => {
    fetchActivities();
  }, [dateFrom, dateTo, selectedActivityTypes]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trial_engagement_log')
        .select(`
          activity_id,
          org_id,
          activity_type,
          description,
          created_at,
          logged_by,
          logged_by_role,
          trial_organizations!inner (
            org_name
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by organization IDs if provided
      if (organizationIds && organizationIds.length > 0) {
        query = query.in('org_id', organizationIds);
      }

      // Date range filters
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
      }

      // Activity type filter
      if (selectedActivityTypes.size > 0) {
        query = query.in('activity_type', Array.from(selectedActivityTypes));
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include org_name
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        org_name: item.trial_organizations?.org_name,
        trial_organizations: undefined, // Remove nested object
      }));

      setActivities(transformedData);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (activities.length === 0) {
      toast.error('No activities to export');
      return;
    }

    setExporting(true);
    try {
      if (exportFormat === 'csv') {
        exportAsCSV();
      } else {
        exportAsJSON();
      }

      toast.success(`Successfully exported ${activities.length} activities as ${exportFormat.toUpperCase()}`, {
        icon: '✅',
        duration: 4000,
      });
    } catch (error: any) {
      console.error('Error exporting activities:', error);
      toast.error('Failed to export activities');
    } finally {
      setExporting(false);
    }
  };

  const exportAsCSV = () => {
    const csvData = activities.map((activity) => {
      const baseData: any = {
        'Activity ID': activity.activity_id,
        'Activity Type': activity.activity_type,
        'Description': activity.description,
        'Created At': format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Logged By': activity.logged_by,
        'Logged By Role': activity.logged_by_role,
      };

      if (includeOrgDetails) {
        baseData['Organization ID'] = activity.org_id;
        baseData['Organization Name'] = activity.org_name || 'Unknown';
      }

      return baseData;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `activity-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
  };

  const exportAsJSON = () => {
    const jsonData = activities.map((activity) => {
      const baseData: any = {
        activity_id: activity.activity_id,
        activity_type: activity.activity_type,
        description: activity.description,
        created_at: activity.created_at,
        logged_by: activity.logged_by,
        logged_by_role: activity.logged_by_role,
      };

      if (includeOrgDetails) {
        baseData.org_id = activity.org_id;
        baseData.org_name = activity.org_name || 'Unknown';
      }

      return baseData;
    });

    const json = JSON.stringify(
      {
        export_date: new Date().toISOString(),
        total_records: jsonData.length,
        filters: {
          date_from: dateFrom || null,
          date_to: dateTo || null,
          activity_types: Array.from(selectedActivityTypes),
          organization_count: organizationIds?.length || 'all',
        },
        activities: jsonData,
      },
      null,
      2
    );

    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    downloadFile(blob, `activity-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleActivityType = (type: string) => {
    const newSet = new Set(selectedActivityTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedActivityTypes(newSet);
  };

  const handleSelectAllActivityTypes = () => {
    if (selectedActivityTypes.size === ACTIVITY_TYPES.length) {
      setSelectedActivityTypes(new Set());
    } else {
      setSelectedActivityTypes(new Set(ACTIVITY_TYPES));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-export-title"
      aria-describedby="activity-export-description"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h3 id="activity-export-title" className="text-lg sm:text-xl font-bold text-gray-900">Export Activity Report</h3>
                {loading ? (
                  <Skeleton className="h-4 w-32" ariaLabel="Loading activity count" />
                ) : (
                  <p id="activity-export-description" className="text-xs sm:text-sm text-gray-600">
                    {`${activities.length} activities found`}
                    {organizationIds && ` (${organizationIds.length} org${organizationIds.length !== 1 ? 's' : ''})`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close activity export modal"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Date Range Filter */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-600" aria-hidden="true" />
              <h4 id="date-range-label" className="text-sm font-semibold text-gray-900">Date Range</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-labelledby="date-range-label">
              <div>
                <label htmlFor="date-from-input" className="block text-xs font-medium text-gray-700 mb-1">From</label>
                <input
                  id="date-from-input"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Start date for activity filter"
                />
              </div>
              <div>
                <label htmlFor="date-to-input" className="block text-xs font-medium text-gray-700 mb-1">To</label>
                <input
                  id="date-to-input"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="End date for activity filter"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                aria-label="Clear date range filters"
              >
                Clear date filters
              </button>
            )}
          </div>

          {/* Activity Type Filter */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" aria-hidden="true" />
                <h4 id="activity-types-label" className="text-sm font-semibold text-gray-900">Activity Types</h4>
              </div>
              <button
                onClick={handleSelectAllActivityTypes}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                aria-label={selectedActivityTypes.size === ACTIVITY_TYPES.length ? 'Deselect all activity types' : 'Select all activity types'}
              >
                {selectedActivityTypes.size === ACTIVITY_TYPES.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2" role="group" aria-labelledby="activity-types-label">
              {ACTIVITY_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedActivityTypes.has(type)}
                    onChange={() => handleToggleActivityType(type)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-label={type.replace(/_/g, ' ')}
                  />
                  <span className="text-xs text-gray-700 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
            {selectedActivityTypes.size > 0 && selectedActivityTypes.size < ACTIVITY_TYPES.length && (
              <div className="mt-2 text-xs text-gray-600" role="status" aria-live="polite">
                {selectedActivityTypes.size} of {ACTIVITY_TYPES.length} types selected
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 id="export-options-label" className="text-sm font-semibold text-gray-900 mb-3">Export Options</h4>
            <div className="space-y-3">
              {/* Format Selection */}
              <div>
                <label id="export-format-label" className="block text-xs font-medium text-gray-700 mb-2">Export Format</label>
                <div className="flex gap-2" role="radiogroup" aria-labelledby="export-format-label">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                      exportFormat === 'csv'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                    role="radio"
                    aria-checked={exportFormat === 'csv'}
                    aria-label="CSV format"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                      exportFormat === 'json'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                    role="radio"
                    aria-checked={exportFormat === 'json'}
                    aria-label="JSON format"
                  >
                    JSON
                  </button>
                </div>
              </div>

              {/* Include Options */}
              <label htmlFor="include-org-details" className="flex items-center gap-2 cursor-pointer">
                <input
                  id="include-org-details"
                  type="checkbox"
                  checked={includeOrgDetails}
                  onChange={(e) => setIncludeOrgDetails(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  aria-label="Include organization details in export"
                />
                <span className="text-sm text-gray-700">Include organization details</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {!loading && activities.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" role="status" aria-live="polite">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Export Preview</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p>
                  <strong>{activities.length}</strong> activities will be exported
                </p>
                {dateFrom && (
                  <p>
                    From: <strong>{format(new Date(dateFrom), 'MMM dd, yyyy')}</strong>
                  </p>
                )}
                {dateTo && (
                  <p>
                    To: <strong>{format(new Date(dateTo), 'MMM dd, yyyy')}</strong>
                  </p>
                )}
                {selectedActivityTypes.size > 0 && (
                  <p>
                    Activity types: <strong>{selectedActivityTypes.size} selected</strong>
                  </p>
                )}
                <p>
                  Format: <strong>{exportFormat.toUpperCase()}</strong>
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3" role="status" aria-label="Loading export preview">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-24" ariaLabel="Loading preview title" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {!loading && activities.length === 0 && (
            <div className="text-center py-8" role="status" aria-live="polite">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-600 text-sm">No activities found with current filters</p>
              <p className="text-gray-500 text-xs mt-1">Try adjusting your date range or activity type filters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={exporting}
              className="w-full sm:flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cancel and close export modal"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || loading || activities.length === 0}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={exporting ? `Exporting ${activities.length} activities` : `Export ${activities.length} activities as ${exportFormat.toUpperCase()}`}
            >
              {exporting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Export {activities.length} Activities
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
