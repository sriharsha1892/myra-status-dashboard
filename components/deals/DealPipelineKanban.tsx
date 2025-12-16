'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DealCard from './DealCard';
import { DollarSign, TrendingUp, Target, CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Deal {
  org_id: string;
  org_name: string;
  org_domain?: string;
  deal_status: string;
  opportunity_value: number | null;
  deal_value: number | null;
  deal_currency: string;
  expected_close_date: string | null;
  win_probability: number | null;
  status_updated_at: string | null;
  account_manager?: string;
  primary_contact?: string;
  primary_contact_email?: string;
  parent_company?: string;
}

interface DealPipelineKanbanProps {
  deals: Deal[];
  onRefresh: () => void;
}

const STAGES = [
  { id: 'prospect', label: 'Prospect', icon: Target, color: 'bg-gray-100 border-gray-300', headerColor: 'bg-gray-50' },
  { id: 'negotiating', label: 'Negotiating', icon: TrendingUp, color: 'bg-blue-100 border-blue-300', headerColor: 'bg-blue-50' },
  { id: 'won', label: 'Won', icon: CheckCircle2, color: 'bg-green-100 border-green-300', headerColor: 'bg-green-50' },
  { id: 'lost', label: 'Lost', icon: XCircle, color: 'bg-red-100 border-red-300', headerColor: 'bg-red-50' },
  { id: 'deferred', label: 'Deferred', icon: Clock, color: 'bg-purple-100 border-purple-300', headerColor: 'bg-purple-50' },
];

export default function DealPipelineKanban({ deals, onRefresh }: DealPipelineKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const supabase = createClient();

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggingId(dealId);
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverStage(null);

    const deal = deals.find(d => d.org_id === dealId);
    if (!deal || deal.deal_status === newStage) return;

    try {
      const { error } = await supabase
        .from('org_deal_tracking')
        .update({
          deal_status: newStage,
          status_updated_at: new Date().toISOString(),
        })
        .eq('org_id', dealId);

      if (error) throw error;

      toast.success(`Moved to ${STAGES.find(s => s.id === newStage)?.label}`);
      onRefresh();
    } catch (error) {
      console.error('Error updating deal stage:', error);
      toast.error('Failed to update deal stage');
    }
  };

  const getStageDeals = (stageId: string) => {
    return deals.filter(d => d.deal_status === stageId);
  };

  const getStageValue = (stageId: string) => {
    const stageDeals = getStageDeals(stageId);
    return stageDeals.reduce((sum, deal) => {
      const value = deal.deal_status === 'won' ? deal.deal_value : deal.opportunity_value;
      return sum + (value || 0);
    }, 0);
  };

  const totalPipelineValue = deals.reduce((sum, deal) => {
    if (deal.deal_status === 'won') return sum + (deal.deal_value || 0);
    if (deal.deal_status !== 'lost' && deal.deal_status !== 'deferred') {
      return sum + (deal.opportunity_value || 0);
    }
    return sum;
  }, 0);

  const weightedPipelineValue = deals.reduce((sum, deal) => {
    if (deal.deal_status === 'won') return sum + (deal.deal_value || 0);
    if (deal.deal_status !== 'lost' && deal.deal_status !== 'deferred') {
      const probability = deal.win_probability || 50;
      return sum + ((deal.opportunity_value || 0) * probability / 100);
    }
    return sum;
  }, 0);

  const wonDeals = deals.filter(d => d.deal_status === 'won').length;
  const closedDeals = deals.filter(d => d.deal_status === 'won' || d.deal_status === 'lost').length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

  return (
    <div>
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pipeline Value</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPipelineValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Weighted Value</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(weightedPipelineValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Win Rate</p>
              <p className="text-lg font-bold text-gray-900">{winRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Deals</p>
              <p className="text-lg font-bold text-gray-900">{deals.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageDeals = getStageDeals(stage.id);
          const stageValue = getStageValue(stage.id);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`
                flex-shrink-0 w-72 rounded-xl border-2 transition-all
                ${dragOverStage === stage.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}
              `}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-gray-200 ${stage.headerColor} rounded-t-xl`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900">{stage.label}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-white rounded-full text-xs font-medium text-gray-600">
                    {stageDeals.length}
                  </span>
                </div>
                {stageValue > 0 && (
                  <p className="text-sm font-bold text-gray-700">
                    {formatCurrency(stageValue)}
                  </p>
                )}
              </div>

              {/* Cards */}
              <div className="p-3 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
                {stageDeals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No deals</p>
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      key={deal.org_id}
                      deal={deal}
                      onDragStart={handleDragStart}
                      isDragging={draggingId === deal.org_id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
