'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import FollowupSchedulingTab from '@/components/FollowupSchedulingTab';

export default function FollowUpsPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgId, setOrgId] = useState<string>('');
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'team' || role?.toLowerCase() === 'admin')) {
      fetchOrganizations();
    }
  }, [user, role]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setOrganizations(data);

        // Get org from URL parameter, localStorage, or default to first org
        const orgParam = searchParams?.get('org');
        const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('selectedFollowupsOrgId') : null;
        const defaultOrgId = orgParam || savedOrgId || (data as any)[0].org_id;

        setOrgId(defaultOrgId);
        const selected = (data as any).find((org: any) => org.org_id === defaultOrgId);
        setSelectedOrg(selected || data[0]);

        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedFollowupsOrgId', defaultOrgId);
        }
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgChange = (newOrgId: string) => {
    setOrgId(newOrgId);
    const selected = organizations.find(org => org.org_id === newOrgId);
    setSelectedOrg(selected);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedFollowupsOrgId', newOrgId);
    }
    router.push(`?org=${newOrgId}`);
  };

  const handleBackToOrg = () => {
    if (orgId) {
      router.push(`/support/trials/${orgId}?tab=Follow-ups`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role?.toLowerCase() !== 'team' && role?.toLowerCase() !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <main className="flex-1 overflow-y-auto">
        {/* Enhanced Header with Org Selector */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between border-b border-gray-200/40">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Follow-ups</h2>
              <p className="text-xs text-gray-500 mt-0.5">Schedule and track follow-up activities</p>
            </div>
            {orgId && (
              <button
                onClick={handleBackToOrg}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Organization
              </button>
            )}
          </div>

          {/* Organization Selector and Info */}
          {selectedOrg && (
            <div className="px-8 py-3 border-b border-gray-200/40 flex items-center gap-4">
              <div className="flex-1 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{selectedOrg.org_name || selectedOrg.name}</p>
                  <p className="text-xs text-gray-500">{selectedOrg.stage || 'Trial'} • {selectedOrg.org_domain || ''}</p>
                </div>
              </div>

              {organizations.length > 1 && (
                <select
                  value={orgId}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name || org.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </header>

        <div className="p-8">
          {orgId ? (
            <FollowupSchedulingTab orgId={orgId} />
          ) : (
            <div className="text-center py-20">
              <p className="text-sm text-gray-600">No organizations found. Please create a trial organization first.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
