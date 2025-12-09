'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, TrendingUp, Calendar, Target, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface DealData {
  deal_status: string;
  opportunity_value: number | null;
  deal_value: number | null;
  deal_currency: string;
  expected_close_date: string | null;
  win_probability: number | null;
  notes: string | null;
  status_updated_at: string | null;
}

interface DealSummaryCardProps {
  orgId: string;
  onEditDeal?: () => void;
}

const DEAL_STAGES: Record<string, { label: string; color: string; bg: string }> = {
  prospect: { label: 'Prospect', color: 'text-gray-700', bg: 'bg-gray-100' },
  negotiating: { label: 'Negotiating', color: 'text-blue-700', bg: 'bg-blue-100' },
  won: { label: 'Won', color: 'text-green-700', bg: 'bg-green-100' },
  lost: { label: 'Lost', color: 'text-red-700', bg: 'bg-red-100' },
  deferred: { label: 'Deferred', color: 'text-purple-700', bg: 'bg-purple-100' },
};

export default function DealSummaryCard({ orgId, onEditDeal }: DealSummaryCardProps) {
  const [deal, setDeal] = useState<DealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDeal();
  }, [orgId]);

  const fetchDeal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_deal_tracking')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching deal:', error);
      }
      setDeal(data || null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const daysInStage = deal?.status_updated_at
    ? differenceInDays(new Date(), new Date(deal.status_updated_at))
    : null;

  const stageConfig = deal?.deal_status ? DEAL_STAGES[deal.deal_status] : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Deal Info</h3>
        </div>
        <div className="flex items-center gap-2">
          {onEditDeal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditDeal();
              }}
              className="p-1 hover:bg-green-100 rounded-lg transition-colors"
              title="Edit deal"
            >
              <Edit3 className="w-4 h-4 text-green-600" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !deal ? (
            <div className="text-center py-4">
              <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No deal data yet</p>
              {onEditDeal && (
                <button
                  onClick={onEditDeal}
                  className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Add deal info
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Stage Badge */}
              {stageConfig && (
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${stageConfig.bg} ${stageConfig.color}`}>
                    {stageConfig.label}
                  </span>
                  {daysInStage !== null && (
                    <span className="text-xs text-gray-500">
                      {daysInStage} days in stage
                    </span>
                  )}
                </div>
              )}

              {/* Deal Value */}
              {(deal.opportunity_value || deal.deal_value) && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      {deal.deal_status === 'won' ? 'Deal Value' : 'Opportunity Value'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(
                        deal.deal_status === 'won' ? (deal.deal_value || 0) : (deal.opportunity_value || 0),
                        deal.deal_currency
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Probability & Close Date Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Win Probability */}
                {deal.win_probability !== null && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-xs text-gray-500 font-medium">Probability</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-gray-900">{deal.win_probability}%</p>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${deal.win_probability}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Expected Close */}
                {deal.expected_close_date && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <p className="text-xs text-gray-500 font-medium">Expected Close</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {format(new Date(deal.expected_close_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {deal.notes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs text-amber-700 font-medium mb-1">Notes</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{deal.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
