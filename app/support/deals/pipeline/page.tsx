'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import DealPipelineKanban from '@/components/deals/DealPipelineKanban';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Loader2, ArrowLeft, Filter, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

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

export default function DealPipelinePage() {
  const { user, loading: authLoading, is_super_admin, parent_company } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [amFilter, setAmFilter] = useState<string>('all');
  const [accountManagers, setAccountManagers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDeals();
      fetchAccountManagers();
    }
  }, [user, companyFilter, amFilter]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      // First get all deals with org info
      let query = supabase
        .from('org_deal_tracking')
        .select(`
          org_id,
          deal_status,
          opportunity_value,
          deal_value,
          deal_currency,
          expected_close_date,
          win_probability,
          status_updated_at,
          notes
        `);

      const { data: dealData, error: dealError } = await query;
      if (dealError) throw dealError;

      if (!dealData || dealData.length === 0) {
        setDeals([]);
        return;
      }

      // Get org info for each deal
      const orgIds = dealData.map(d => d.org_id);
      let orgQuery = supabase
        .from('trial_organizations')
        .select('org_id, org_name, org_domain, account_manager, account_manager_id, parent_company')
        .in('org_id', orgIds);

      // Apply company filter
      if (!is_super_admin && parent_company) {
        orgQuery = orgQuery.eq('parent_company', parent_company);
      } else if (is_super_admin && companyFilter !== 'all') {
        orgQuery = orgQuery.eq('parent_company', companyFilter);
      }

      const { data: orgData, error: orgError } = await orgQuery;
      if (orgError) throw orgError;

      // Get primary contacts
      const { data: contactsData } = await supabase
        .from('trial_users')
        .select('org_id, name, email')
        .in('org_id', orgIds)
        .eq('is_primary_contact', true);

      // Get account manager names
      const amIds = [...new Set(orgData?.map(o => o.account_manager_id).filter(Boolean))];
      let amNames: Record<string, string> = {};
      if (amIds.length > 0) {
        const { data: amData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', amIds);
        amNames = (amData || []).reduce((acc, am) => {
          acc[am.id] = am.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Merge data
      const mergedDeals: Deal[] = dealData
        .map(deal => {
          const org = orgData?.find(o => o.org_id === deal.org_id);
          if (!org) return null; // Skip if org not found (filtered out)

          const contact = contactsData?.find(c => c.org_id === deal.org_id);

          return {
            ...deal,
            org_name: org.org_name,
            org_domain: org.org_domain,
            account_manager: org.account_manager_id ? amNames[org.account_manager_id] : org.account_manager,
            parent_company: org.parent_company,
            primary_contact: contact?.name,
            primary_contact_email: contact?.email,
          };
        })
        .filter(Boolean) as Deal[];

      // Apply AM filter
      let filteredDeals = mergedDeals;
      if (amFilter !== 'all') {
        filteredDeals = mergedDeals.filter(d => d.account_manager === amFilter);
      }

      setDeals(filteredDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountManagers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'Account Manager')
        .order('full_name');

      setAccountManagers((data || []).map(am => ({ id: am.id, name: am.full_name })));
    } catch (error) {
      console.error('Error fetching account managers:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/support/dashboard' },
            { label: 'Deal Pipeline' }
          ]} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/support/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
              <p className="text-sm text-gray-500">Drag deals between stages to update status</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {is_super_admin && (
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Companies</option>
                <option value="Mordor Intelligence">MI</option>
                <option value="GMI">GMI</option>
              </select>
            )}

            <select
              value={amFilter}
              onChange={(e) => setAmFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Account Managers</option>
              {accountManagers.map(am => (
                <option key={am.id} value={am.name}>{am.name}</option>
              ))}
            </select>

            <button
              onClick={fetchDeals}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCcw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Pipeline */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading pipeline...</p>
            </div>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No deals found</h3>
            <p className="text-gray-500">
              {companyFilter !== 'all' || amFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by adding deal information to your organizations'}
            </p>
          </div>
        ) : (
          <DealPipelineKanban deals={deals} onRefresh={fetchDeals} />
        )}
      </div>
    </div>
  );
}
