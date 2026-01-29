'use client';

import React, { useState } from 'react';
import OutboundCampaigns from './OutboundCampaigns';
import InboundCampaigns from './InboundCampaigns';

export default function CampaignsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'outbound' | 'inbound'>('outbound');

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('outbound')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSubTab === 'outbound'
              ? 'bg-violet-600 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Outbound
        </button>
        <button
          onClick={() => setActiveSubTab('inbound')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSubTab === 'inbound'
              ? 'bg-violet-600 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Inbound
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'outbound' ? <OutboundCampaigns /> : <InboundCampaigns />}
    </div>
  );
}
