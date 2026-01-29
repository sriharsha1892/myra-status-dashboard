'use client';

import React, { useState } from 'react';
import {
  Download,
  Users,
  TrendingUp,
  ExternalLink,
  Plus,
  Loader2,
  Target,
} from 'lucide-react';
import { useInboundCampaigns, useCreateCampaign, type Campaign } from '@/hooks/useGtmCampaigns';

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const statusColors = {
    draft: 'bg-neutral-100 text-neutral-600',
    active: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Download className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-neutral-900">{campaign.name}</div>
            {campaign.description && (
              <div className="text-xs text-neutral-500 truncate max-w-[200px]">
                {campaign.description}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[campaign.status]}`}>
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
        {campaign.totalLeads}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
        {campaign.ongoingCases}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-semibold">
        {campaign.attributedOrgs}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-violet-600 font-semibold">
        ${(campaign.attributedValue / 1000).toFixed(0)}K
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {campaign.externalUrl && (
          <a
            href={campaign.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-600"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </td>
    </tr>
  );
}

export default function InboundCampaigns() {
  const { data, isLoading, error } = useInboundCampaigns();
  const createCampaign = useCreateCampaign();
  const [showAddModal, setShowAddModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load inbound campaigns
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Inbound Campaigns</h3>
            <p className="text-sm text-neutral-500">{campaigns.length} campaigns tracked</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Campaign
        </button>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-4 gap-4 p-6 bg-neutral-50 border-b border-neutral-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900">{data.summary.totalCampaigns}</div>
            <div className="text-xs text-neutral-500">Total Campaigns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{data.summary.activeCampaigns}</div>
            <div className="text-xs text-neutral-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900">{data.summary.totalLeads}</div>
            <div className="text-xs text-neutral-500">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-600">
              ${(data.summary.totalAttributedValue / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-neutral-500">Pipeline Value</div>
          </div>
        </div>
      )}

      {/* Table */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          No inbound campaigns yet. Add your first campaign to start tracking.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Ongoing
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Pipeline
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Link
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {campaigns.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
