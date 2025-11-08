'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import QuickActivityLogger from '@/components/QuickActivityLogger';
import TrialActivityFeed from '@/components/TrialActivityFeed';
import TrialUsageDashboard from '@/components/TrialUsageDashboard';
import CustomFieldsEditor from '@/components/CustomFieldsEditor';
import DocumentLibrary from '@/components/DocumentLibrary';
export default function TestFeaturesPage() {
  const [trialOrgId, setTrialOrgId] = useState<string>('');
  const [trialOrgName, setTrialOrgName] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const supabase = createClient();

  useEffect(() => {
    fetchTrialOrg();
  }, []);

  const fetchTrialOrg = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name')
        .limit(1)
        .single();

      if (!error && data) {
        setTrialOrgId(data.org_id);
        setTrialOrgName(data.org_name);
      }
    } catch (error) {
      console.error('Error fetching trial org:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!trialOrgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">No Trial Organizations Found</h1>
          <p className="text-slate-600">Please create a trial organization first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🧪 Feature Testing Dashboard
              </h1>
              <p className="text-slate-600 mt-2">
                Testing Organization: <span className="font-semibold">{trialOrgName}</span>
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Trial Org ID: {trialOrgId}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 font-medium">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                Running on localhost:3004
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
          {/* Tab Headers */}
          <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'activities', label: '📝 Activities' },
              { id: 'resources', label: '📚 Resources' },
              { id: 'dashboard', label: '📈 Dashboard' },
              { id: 'fields', label: '🏷️ Custom Fields' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Activity Logger</h2>
                    <QuickActivityLogger
                      trialOrgId={trialOrgId}
                      onActivityLogged={() => setRefreshTrigger(prev => prev + 1)}
                    />
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-blue-50 border border-green-200">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Custom Fields</h2>
                    <CustomFieldsEditor trialOrgId={trialOrgId} />
                  </div>
                </div>

                {/* Right Column */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Activity Feed</h2>
                  <TrialActivityFeed
                    trialOrgId={trialOrgId}
                    refreshTrigger={refreshTrigger}
                  />
                </div>
              </div>
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <TrialActivityFeed
                    trialOrgId={trialOrgId}
                    refreshTrigger={refreshTrigger}
                  />
                </div>
                <div>
                  <QuickActivityLogger
                    trialOrgId={trialOrgId}
                    onActivityLogged={() => setRefreshTrigger(prev => prev + 1)}
                  />
                </div>
                </div>
              </div>
            )}

            {/* Resources Tab */}
            {activeTab === 'resources' && (
              <div>
                <DocumentLibrary
                trialOrgId={trialOrgId}
                viewMode="both"
              />
              </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                <TrialUsageDashboard
                trialOrgId={trialOrgId}
                trialOrgName={trialOrgName}
              />
              </div>
            )}

            {/* Custom Fields Tab */}
            {activeTab === 'fields' && (
              <div className="max-w-2xl mx-auto">
                <CustomFieldsEditor trialOrgId={trialOrgId} />
              </div>
            )}
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="bg-yellow-50 rounded-3xl p-6 border border-yellow-200">
          <h3 className="text-lg font-bold text-yellow-900 mb-3">🧪 Testing Instructions</h3>
          <div className="space-y-2 text-sm text-yellow-800">
            <p><strong>Overview Tab:</strong> Test quick activity logging and see the feed update in real-time</p>
            <p><strong>Activities Tab:</strong> View full activity timeline and log new activities</p>
            <p><strong>Resources Tab:</strong> Add documents, filter by category, add notes to resources</p>
            <p><strong>Dashboard Tab:</strong> View usage statistics and trends</p>
            <p><strong>Custom Fields Tab:</strong> Add/edit/delete custom key-value pairs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
