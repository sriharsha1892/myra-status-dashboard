'use client';

import React, { useState, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import PipelineStageCard, { CompactOrgRow } from './PipelineStageCard';
import type { OrgSummary, GtmDashboardResponse } from '@/hooks/useGtmDashboard';

interface PipelineViewProps {
  pipeline: GtmDashboardResponse['pipeline'];
  onOrgClick?: (org: OrgSummary) => void;
}

const STAGE_CONFIG = [
  { key: 'paying', label: 'Customers', color: '#10B981' },
  { key: 'strongProspects', label: 'Negotiation', color: '#8B5CF6' },
  { key: 'active', label: 'Active Trials', color: '#F59E0B' },
  { key: 'prospects', label: 'Prospects', color: '#3B82F6' },
  { key: 'dormant', label: 'Dormant', color: '#6B7280' },
  { key: 'lost', label: 'Lost', color: '#EF4444' },
];

export default function PipelineView({ pipeline, onOrgClick }: PipelineViewProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Get all orgs or filtered by stage
  const displayOrgs = useMemo(() => {
    if (!selectedStage) {
      // Show all orgs grouped by priority
      return STAGE_CONFIG.flatMap(({ key }) => {
        const stageData = pipeline[key as keyof typeof pipeline];
        return stageData.orgs.map(org => ({ ...org, _stage: key }));
      });
    }
    const stageData = pipeline[selectedStage as keyof typeof pipeline];
    return stageData.orgs.map(org => ({ ...org, _stage: selectedStage }));
  }, [pipeline, selectedStage]);

  // Calculate totals
  const totals = useMemo(() => {
    const pipelineValue =
      pipeline.strongProspects.value +
      pipeline.prospects.value +
      pipeline.active.value;
    const payingValue = pipeline.paying.value;
    const totalOrgs = STAGE_CONFIG.reduce((sum, { key }) => {
      return sum + pipeline[key as keyof typeof pipeline].count;
    }, 0);
    return { pipelineValue, payingValue, totalOrgs };
  }, [pipeline]);

  const getStageColor = (stageKey: string) => {
    return STAGE_CONFIG.find(s => s.key === stageKey)?.color || '#6B7280';
  };

  return (
    <div className="space-y-4">
      {/* Stage filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStage(null)}
          className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            selectedStage === null
              ? 'bg-neutral-900 text-white'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          All
          <span className="font-bold">{totals.totalOrgs}</span>
        </button>
        {STAGE_CONFIG.map(({ key, label, color }) => {
          const stageData = pipeline[key as keyof typeof pipeline];
          return (
            <PipelineStageCard
              key={key}
              stage={key}
              label={label}
              count={stageData.count}
              value={stageData.value}
              color={color}
              isSelected={selectedStage === key}
              onClick={() => setSelectedStage(selectedStage === key ? null : key)}
            />
          );
        })}
      </div>

      {/* Summary stats bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-neutral-50 rounded-xl text-sm">
        <div>
          <span className="text-neutral-500">Pipeline Value: </span>
          <span className="font-semibold text-neutral-900">
            ${(totals.pipelineValue / 1000000).toFixed(2)}M
          </span>
        </div>
        <div className="w-px h-4 bg-neutral-300" />
        <div>
          <span className="text-neutral-500">Paying ARR: </span>
          <span className="font-semibold text-emerald-600">
            ${(totals.payingValue / 1000000).toFixed(2)}M
          </span>
        </div>
        <div className="w-px h-4 bg-neutral-300" />
        <div>
          <span className="text-neutral-500">Win Rate: </span>
          <span className="font-semibold text-neutral-900">
            {pipeline.paying.count + pipeline.lost.count > 0
              ? ((pipeline.paying.count / (pipeline.paying.count + pipeline.lost.count)) * 100).toFixed(0)
              : 0}%
          </span>
        </div>
      </div>

      {/* Compact org list */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {displayOrgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="w-10 h-10 text-neutral-300 mb-3" />
            <p className="text-neutral-500 text-sm">No organizations in this stage</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {displayOrgs.map((org) => (
              <CompactOrgRow
                key={org.id}
                org={org}
                stageColor={getStageColor(org._stage)}
                onClick={() => onOrgClick?.(org)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Showing count */}
      <div className="text-xs text-neutral-400 text-center">
        Showing {displayOrgs.length} organizations
        {selectedStage && ` in ${STAGE_CONFIG.find(s => s.key === selectedStage)?.label}`}
      </div>
    </div>
  );
}
