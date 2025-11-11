'use client';

/**
 * Admin Roadmap Page - Uses Enhanced ProductRoadmapTab Component
 * This replaces the previous "WorldClass" implementation with the component-based approach
 * that includes all the UX improvements (QuickStats, KeyboardShortcuts, etc.)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import ProductRoadmapTab from '@/components/ProductRoadmapTab';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function AdminRoadmapPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'team')) {
      fetchOrganizations();
    }
  }, [user, role]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, org_domain')
        .order('org_name');

      if (error) throw error;

      if (data && data.length > 0) {
        setOrganizations(data);
        // Default to first org
        setSelectedOrgId(data[0].org_id);
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role !== 'Admin' && role?.toLowerCase() !== 'team')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumbs items={[{ label: 'Admin', href: '/support/dashboard' }, { label: 'Roadmap' }]} />
          <div className="text-center py-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Organizations Found</h2>
            <p className="text-sm text-gray-600">Please create a trial organization first.</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedOrg = organizations.find(org => org.org_id === selectedOrgId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Admin', href: '/support/dashboard' }, { label: 'Roadmap' }]} />

        {/* Header with Org Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Roadmap</h1>
              <p className="text-sm text-gray-600 mt-1">
                Viewing roadmap for {selectedOrg?.org_name || 'organization'}
              </p>
            </div>

            {/* Organization Selector */}
            {organizations.length > 1 && (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {organizations.map((org) => (
                  <option key={org.org_id} value={org.org_id}>
                    {org.org_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Roadmap Component with UX Improvements */}
        {selectedOrgId && <ProductRoadmapTab orgId={selectedOrgId} />}
      </div>
    </div>
  );
}
