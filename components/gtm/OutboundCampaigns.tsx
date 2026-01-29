'use client';

import React, { useState } from 'react';
import {
  Mail,
  Rocket,
  Users,
  CheckCircle,
  TrendingUp,
  ExternalLink,
  Plus,
  Loader2,
} from 'lucide-react';
import { useOutboundCampaigns, useCreateCampaign, type Campaign } from '@/hooks/useGtmCampaigns';

function CampaignCard({
  campaign,
  color,
}: {
  campaign: Campaign;
  color: 'blue' | 'violet';
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
    violet: {
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-600',
      badge: 'bg-violet-100 text-violet-700',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-xl p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${colors.iconBg} p-2 rounded-lg`}>
            {campaign.campaignType === 'hubspot' ? (
              <Mail className={`w-4 h-4 ${colors.iconText}`} />
            ) : (
              <Rocket className={`w-4 h-4 ${colors.iconText}`} />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-neutral-900">{campaign.name}</h4>
            <p className="text-xs text-neutral-500">{campaign.status}</p>
          </div>
        </div>
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
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white/80 rounded-lg p-2">
          <div className="text-lg font-bold text-neutral-900">{campaign.totalOutreach}</div>
          <div className="text-xs text-neutral-500">Outreach</div>
        </div>
        <div className="bg-white/80 rounded-lg p-2">
          <div className="text-lg font-bold text-neutral-900">{campaign.totalResponses}</div>
          <div className="text-xs text-neutral-500">Responses</div>
        </div>
        <div className="bg-white/80 rounded-lg p-2">
          <div className="text-lg font-bold text-neutral-900">{campaign.qualifiedLeads}</div>
          <div className="text-xs text-neutral-500">Qualified</div>
        </div>
        <div className="bg-white/80 rounded-lg p-2">
          <div className="text-lg font-bold text-emerald-600">{campaign.attributedOrgs}</div>
          <div className="text-xs text-neutral-500">Pipeline</div>
        </div>
      </div>

      {campaign.attributedValue > 0 && (
        <div className={`mt-3 flex items-center justify-between px-3 py-2 ${colors.badge} rounded-lg`}>
          <span className="text-xs font-medium">Attributed Pipeline</span>
          <span className="font-semibold">
            ${(campaign.attributedValue / 1000).toFixed(0)}K
          </span>
        </div>
      )}
    </div>
  );
}

export default function OutboundCampaigns() {
  const { hubspot, apollo, isLoading, error, refetch } = useOutboundCampaigns();
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
        Failed to load campaigns
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HubSpot Section */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">HubSpot Campaigns</h3>
              <p className="text-sm text-neutral-500">{hubspot.length} active campaigns</p>
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

        {hubspot.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            No HubSpot campaigns yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hubspot.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} color="blue" />
            ))}
          </div>
        )}
      </div>

      {/* Apollo Section */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <Rocket className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Apollo Campaigns</h3>
              <p className="text-sm text-neutral-500">{apollo.length} active campaigns</p>
            </div>
          </div>
        </div>

        {apollo.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            No Apollo campaigns yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apollo.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} color="violet" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
