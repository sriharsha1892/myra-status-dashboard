'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import StrategicTimelineViewEnhanced from '@/components/strategic-timeline/StrategicTimelineViewEnhanced';
import RoadmapDetailPanel from '@/components/roadmap/RoadmapDetailPanel';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

/**
 * Global Product Roadmap Page
 *
 * RESTRICTED ACCESS: Super Admins Only
 *
 * Displays the master roadmap for myRA AI across all organizations.
 * Organizations appear as tags/associations on roadmap items.
 * Strategic categories organize the roadmap (Datasets, Integrations, Features, etc.)
 */
export default function GlobalRoadmapPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/support/login');
      } else if (role?.toLowerCase() === 'account manager') {
        // Account Managers cannot access roadmap
        router.push('/support/dashboard');
      } else if (role?.toLowerCase() === 'admin' && !is_super_admin) {
        // Regular admins cannot access roadmap - only super admins
        router.push('/support/dashboard');
      }
    }
  }, [user, authLoading, role, is_super_admin, router]);

  // Show loading state while checking authentication
  if (authLoading || !user || !is_super_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-700">
            {authLoading ? 'Verifying access...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-lg">
        <div className="max-w-[1800px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:shadow-md"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
                  myRA AI Roadmap
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  Strategic Planning & Execution Timeline
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <StrategicTimelineViewEnhanced onItemClick={setSelectedItemId} />
      </div>

      {/* Detail Panel (when item is clicked) */}
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
    </div>
  );
}
