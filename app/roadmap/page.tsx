'use client';

/**
 * Admin Roadmap Page
 * - Global admin roadmap for platform features
 * - Organization-specific roadmap view
 * - Master Roadmap (Strategic Timeline)
 * - Company filtering (MI/GMI)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import ProductRoadmapTab from '@/components/ProductRoadmapTab';
import GlobalRoadmapView from '@/components/GlobalRoadmapView';
import StrategicTimelineViewEnhanced from '@/components/strategic-timeline/StrategicTimelineViewEnhanced';
import RoadmapDetailPanel from '@/components/roadmap/RoadmapDetailPanel';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'global' | 'organizations' | 'master';

export default function GlobalRoadmapPage() {
  const { user, loading: authLoading, role, parent_company, is_super_admin } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    } else if (!authLoading && user && role?.toLowerCase() === 'account manager') {
      // Account Managers cannot access roadmap
      router.push('/support/dashboard');
    } else if (!authLoading && user && role?.toLowerCase() === 'admin' && !is_super_admin) {
      // Regular admins cannot access roadmap - only super admins
      router.push('/support/dashboard');
    }
  }, [user, authLoading, role, is_super_admin, router]);

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
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-700">
            {authLoading ? 'Verifying access...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user || !is_super_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600">Only super admins can access the roadmap.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">myRA AI Roadmap</h1>
                <p className="text-sm text-gray-600 mt-0.5">Product Planning & Execution</p>
              </div>
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
              <button
                onClick={() => setViewMode('master')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'master'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Master Roadmap
              </button>
            </div>
          </div>

          {/* Organization View Controls */}
          {viewMode === 'organizations' && (
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200 mt-4">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'global' ? (
          <GlobalRoadmapView />
        ) : viewMode === 'master' ? (
          <>
            <StrategicTimelineViewEnhanced onItemClick={setSelectedItemId} />
            {/* Detail Panel for Master Roadmap */}
            {selectedItemId && (
              <RoadmapDetailPanel
                itemId={selectedItemId}
                orgId="" // Global view - no specific org
                isOpen={!!selectedItemId}
                onClose={() => setSelectedItemId(null)}
                onUpdate={() => {}}
                allItems={[]}
                labels={[]}
                milestones={[]}
              />
            )}
          </>
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
