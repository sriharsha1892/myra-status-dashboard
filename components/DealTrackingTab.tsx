'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import UpdateDealStatusModal from './UpdateDealStatusModal';
import { format } from 'date-fns';

interface DealTracking {
  id: string;
  org_id: string;
  deal_status: string;
  opportunity_value?: number;
  deal_value?: number;
  deal_currency?: string;
  loss_reason?: string;
  deferred_reason?: string;
  expected_followup_date?: string;
  notes?: string;
  status_updated_at?: string;
  created_at: string;
  updated_at: string;
}

interface DealTrackingTabProps {
  orgId: string;
}

const DEAL_STATUS_CONFIG: { [key: string]: { icon: string; color: string; label: string; description: string } } = {
  prospect: {
    icon: '🎯',
    color: 'blue',
    label: 'Prospect',
    description: 'Initial stage, evaluating fit'
  },
  negotiating: {
    icon: '💼',
    color: 'yellow',
    label: 'Negotiating',
    description: 'Active negotiation in progress'
  },
  won: {
    icon: '🎉',
    color: 'green',
    label: 'Won',
    description: 'Deal closed successfully'
  },
  lost: {
    icon: '❌',
    color: 'red',
    label: 'Lost',
    description: 'Deal did not close'
  },
  deferred: {
    icon: '⏸️',
    color: 'purple',
    label: 'Deferred',
    description: 'Postponed for future follow-up'
  },
};

export default function DealTrackingTab({ orgId }: DealTrackingTabProps) {
  const [deal, setDeal] = useState<DealTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchDealData();
  }, [orgId]);

  const fetchDealData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_deal_tracking')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setDeal(data || null);
    } catch (error: any) {
      console.error('Error fetching deal data:', error);
      toast.error('Failed to load deal tracking');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const config = DEAL_STATUS_CONFIG[status];
    switch (config?.color) {
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'red':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'purple':
        return 'text-accent-600 bg-accent-50 border-accent-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading deal information...</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
        <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-600 font-medium">No deal information</p>
        <p className="text-sm text-gray-500 mt-1">Deal tracking data not found</p>
      </div>
    );
  }

  const statusConfig = DEAL_STATUS_CONFIG[deal.deal_status] || DEAL_STATUS_CONFIG.prospect;
  const colorClasses = getStatusColor(deal.deal_status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Deal Tracking</h3>
          <p className="text-sm text-gray-600 mt-1">Manage and track deal outcomes</p>
        </div>
        <button
          onClick={() => setShowUpdateModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Update Status</span>
        </button>
      </div>

      {/* Current Deal Status Card */}
      <div className={`rounded-xl border-2 p-6 ${colorClasses}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{statusConfig.icon}</span>
            <div>
              <h2 className="text-2xl font-bold">{statusConfig.label}</h2>
              <p className="text-sm opacity-75 mt-1">{statusConfig.description}</p>
            </div>
          </div>
        </div>

        {/* Opportunity Value and Deal Value */}
        {(deal.opportunity_value || (deal.deal_status === 'won' && deal.deal_value)) && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20 space-y-2">
            {deal.opportunity_value && (
              <div className="flex items-center justify-between">
                <span className="font-semibold">Opportunity Value:</span>
                <span className="text-lg font-bold">
                  {deal.deal_currency || 'USD'} {deal.opportunity_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {deal.deal_status === 'won' && deal.deal_value && (
              <div className="flex items-center justify-between">
                <span className="font-semibold">Final Deal Value:</span>
                <span className="text-2xl font-bold">
                  {deal.deal_currency || 'USD'} {deal.deal_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        {deal.status_updated_at && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20 text-sm opacity-75">
            <p>Status updated: {format(new Date(deal.status_updated_at), 'MMM dd, yyyy HH:mm')}</p>
          </div>
        )}
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loss Reason */}
        {deal.deal_status === 'lost' && deal.loss_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2">Loss Reason</h4>
            <p className="text-sm text-red-800">{deal.loss_reason}</p>
          </div>
        )}

        {/* Deferred Reason and Follow-up Date */}
        {deal.deal_status === 'deferred' && (deal.deferred_reason || deal.expected_followup_date) && (
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 space-y-2">
            {deal.deferred_reason && (
              <div>
                <h4 className="text-sm font-semibold text-purple-900 mb-1">Reason</h4>
                <p className="text-sm text-purple-800">{deal.deferred_reason}</p>
              </div>
            )}
            {deal.expected_followup_date && (
              <div>
                <h4 className="text-sm font-semibold text-purple-900 mb-1">Follow-up Date</h4>
                <p className="text-sm text-purple-800 font-medium">
                  {format(new Date(deal.expected_followup_date), 'MMMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Additional Notes */}
        {deal.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Notes</h4>
            <p className="text-sm text-blue-800">{deal.notes}</p>
          </div>
        )}

        {/* Created Date */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Created</h4>
          <p className="text-sm text-gray-700">{format(new Date(deal.created_at), 'MMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Deal Status History Summary */}
      <div className="bg-white/80 rounded-xl border border-gray-200/60 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Actions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(DEAL_STATUS_CONFIG).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setShowUpdateModal(true)}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
            >
              <span className="text-xl">{config.icon}</span>
              <span className="text-xs font-medium text-gray-700">{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Update Deal Status Modal */}
      <UpdateDealStatusModal
        orgId={orgId}
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onSuccess={fetchDealData}
        currentDealStatus={deal.deal_status}
      />
    </div>
  );
}
