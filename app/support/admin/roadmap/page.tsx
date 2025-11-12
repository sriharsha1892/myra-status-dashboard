'use client';

/**
 * Admin Roadmap Page
 * - Global admin roadmap for platform features
 * - Organization-specific roadmap view
 * - Company filtering (MI/GMI)
 * - Enhanced UX with QuickStats, KeyboardShortcuts, etc.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import ProductRoadmapTab from '@/components/ProductRoadmapTab';
import GlobalRoadmapView from '@/components/GlobalRoadmapView';
import Breadcrumbs from '@/components/Breadcrumbs';

type ViewMode = 'global' | 'organizations';

export default function AdminRoadmapPage() {
  const { user, loading: authLoading, role, parent_company, is_super_admin } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    } else if (!authLoading && user && role?.toLowerCase() === 'account manager') {
      // Account Managers cannot access roadmap
      router.push('/support/dashboard');
    }
  }, [user, authLoading, role, router]);

  useEffect(() => {
    if (user && role?.toLowerCase() === 'admin') {
      fetchOrganizations();
    }
  }, [user, role, companyFilter]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trial_organizations')
        .select('org_id, org_name, org_domain, parent_company')
        .order('org_name');

      // Apply company filter for non-super-admins
      if (!is_super_admin && parent_company) {
        query = query.eq('parent_company', parent_company);
      } else if (is_super_admin && companyFilter !== 'all') {
        query = query.eq('parent_company', companyFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setOrganizations(data);
        // Default to first org if none selected
        if (!selectedOrgId) {
          setSelectedOrgId(data[0].org_id);
        }
      } else {
        setOrganizations([]);
        setSelectedOrgId('');
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

  const selectedOrg = organizations.find(org => org.org_id === selectedOrgId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Admin', href: '/support/dashboard' }, { label: 'Roadmap' }]} />

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Title and View Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product Roadmap</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {viewMode === 'global'
                    ? 'Global platform roadmap for admin planning'
                    : `Viewing ${selectedOrg?.org_name || 'organization'} roadmap`
                  }
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('global')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'global'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Global Roadmap
                </button>
                <button
                  onClick={() => setViewMode('organizations')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'organizations'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Organizations
                </button>
              </div>
            </div>

            {/* Organization View Controls */}
            {viewMode === 'organizations' && (
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                {/* Company Filter - Only for super admins */}
                {is_super_admin && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Company:</label>
                    <select
                      value={companyFilter}
                      onChange={(e) => {
                        setCompanyFilter(e.target.value);
                        setSelectedOrgId(''); // Reset org selection when changing company
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="all">All Companies</option>
                      <option value="Mordor Intelligence">MI - Mordor Intelligence</option>
                      <option value="GMI">GMI</option>
                    </select>
                  </div>
                )}

                {/* Organization Selector */}
                {organizations.length > 0 && (
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-sm font-medium text-gray-700">Organization:</label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {organizations.map((org) => (
                        <option key={org.org_id} value={org.org_id}>
                          {org.org_name} {org.parent_company ? `(${org.parent_company === 'Mordor Intelligence' ? 'MI' : org.parent_company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Organization count */}
                <div className="text-sm text-gray-600">
                  {organizations.length} org{organizations.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {viewMode === 'global' ? (
          <GlobalRoadmapView />
        ) : (
          <>
            {organizations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Organizations Found</h3>
                  <p className="text-sm text-gray-600">
                    {companyFilter !== 'all'
                      ? `No organizations found for ${companyFilter}.`
                      : 'No trial organizations found. Please create one first.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              selectedOrgId && <ProductRoadmapTab orgId={selectedOrgId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
