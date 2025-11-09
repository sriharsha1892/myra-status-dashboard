'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import AddTrialExtensionModal from './AddTrialExtensionModal';

interface TrialExtension {
  id: string;
  org_id: string;
  extended_from_date: string;
  extended_to_date: string;
  reason: string | null;
  approved_by: string;
  approved_by_role: string;
  created_at: string;
}

interface TrialExtensionsTabProps {
  orgId: string;
  currentTrialExpiry?: string | null;
}

export default function TrialExtensionsTab({ orgId, currentTrialExpiry }: TrialExtensionsTabProps) {
  const [extensions, setExtensions] = useState<TrialExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchExtensions();
  }, [orgId]);

  const fetchExtensions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_extensions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExtensions(data || []);
    } catch (error: any) {
      console.error('Error fetching trial extensions:', error);
      toast.error('Failed to load trial extensions');
    } finally {
      setLoading(false);
    }
  };

  const calculateExtensionDays = (fromDate: string, toDate: string) => {
    return differenceInDays(new Date(toDate), new Date(fromDate));
  };

  const getTotalExtensionDays = () => {
    return extensions.reduce((total, ext) => {
      return total + calculateExtensionDays(ext.extended_from_date, ext.extended_to_date);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading trial extensions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Trial Extensions</h3>
          <p className="text-sm text-gray-600 mt-1">Track trial period extensions and history</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Extend Trial</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Total Extensions</p>
              <p className="text-2xl font-bold text-blue-900">{extensions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Extra Days Added</p>
              <p className="text-2xl font-bold text-green-900">{getTotalExtensionDays()}</p>
            </div>
          </div>
        </div>

        {currentTrialExpiry && (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-700 font-medium">Current Expiry</p>
                <p className="text-sm font-bold text-purple-900">
                  {format(new Date(currentTrialExpiry), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extensions List */}
      {extensions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 font-medium">No trial extensions</p>
          <p className="text-sm text-gray-500 mt-1">This trial has not been extended yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {extensions.map((extension, index) => {
            const extensionDays = calculateExtensionDays(extension.extended_from_date, extension.extended_to_date);

            return (
              <div
                key={extension.id}
                className="bg-white/80 rounded-xl border border-gray-200/60 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Extension Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        #{extensions.length - index}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          Trial Extended by {extensionDays} {extensionDays === 1 ? 'day' : 'days'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Extended on {format(new Date(extension.created_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {format(new Date(extension.extended_from_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                        <Calendar className="w-4 h-4 text-green-700" />
                        <span className="text-sm font-medium text-green-900">
                          {format(new Date(extension.extended_to_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    {extension.reason && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Reason for Extension:</p>
                        <p className="text-sm text-blue-800">{extension.reason}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                      <span>
                        Approved by <span className="font-medium text-gray-700">{extension.approved_by_role}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Extension Modal */}
      <AddTrialExtensionModal
        orgId={orgId}
        currentExpiryDate={currentTrialExpiry}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchExtensions}
      />
    </div>
  );
}
