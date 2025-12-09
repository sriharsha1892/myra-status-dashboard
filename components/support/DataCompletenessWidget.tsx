/**
 * Data Completeness Widget
 *
 * Shows a summary of organizations and users with incomplete data.
 * Clicking takes users to a dedicated enrichment page or filtered view.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, ChevronRight, Database, AlertCircle } from 'lucide-react';

interface DataCompletenessWidgetProps {
  organizations: any[];
}

export default function DataCompletenessWidget({ organizations }: DataCompletenessWidgetProps) {
  const router = useRouter();
  const supabase = createClient();
  const [usersWithMissingData, setUsersWithMissingData] = useState(0);

  // Calculate orgs with missing critical fields
  const incompleteOrgs = useMemo(() => {
    return organizations.filter(org =>
      !org.health_status ||
      !org.deal_momentum ||
      !org.description
    );
  }, [organizations]);

  // Count specific missing fields
  const missingHealthStatus = useMemo(() =>
    organizations.filter(org => !org.health_status).length,
    [organizations]
  );

  const missingDealMomentum = useMemo(() =>
    organizations.filter(org => !org.deal_momentum).length,
    [organizations]
  );

  // Fetch users with missing data
  useEffect(() => {
    const fetchUsersWithMissingData = async () => {
      try {
        const { count, error } = await supabase
          .from('trial_users')
          .select('*', { count: 'exact', head: true })
          .or('influence.is.null,role.is.null');

        if (!error && count !== null) {
          setUsersWithMissingData(count);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsersWithMissingData();
  }, []);

  // Don't show if everything is complete
  if (incompleteOrgs.length === 0 && usersWithMissingData === 0) {
    return null;
  }

  const handleClick = () => {
    // Navigate to trials page with completeness filter for incomplete orgs
    router.push('/support/trials?completeness=incomplete');
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200/60 p-4 hover:shadow-lg hover:border-indigo-300 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Complete Your Data</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Stats */}
      <div className="space-y-2">
        {missingHealthStatus > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Missing health status
            </span>
            <span className="font-medium text-gray-900">{missingHealthStatus} orgs</span>
          </div>
        )}

        {missingDealMomentum > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Missing deal momentum
            </span>
            <span className="font-medium text-gray-900">{missingDealMomentum} orgs</span>
          </div>
        )}

        {usersWithMissingData > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Contacts missing role info
            </span>
            <span className="font-medium text-gray-900">{usersWithMissingData} users</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-3 pt-3 border-t border-indigo-200/60">
        <span className="text-xs text-indigo-600 font-medium group-hover:text-indigo-700">
          Click to complete data →
        </span>
      </div>
    </div>
  );
}
