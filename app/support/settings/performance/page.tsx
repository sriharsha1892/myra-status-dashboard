'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePagePerformance } from '@/lib/hooks/usePagePerformance';
import Breadcrumbs from '@/components/Breadcrumbs';
import { PerformanceDashboard } from '@/components/admin/PerformanceDashboard';

export default function PerformanceSettingsPage() {
  usePagePerformance('settings-performance');

  const { user, loading: authLoading, is_super_admin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Only super admins can view performance metrics
  if (!is_super_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <h2 className="text-lg font-semibold text-yellow-800">Access Restricted</h2>
            <p className="text-yellow-700 mt-2">
              Performance monitoring is only available to super admins.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Settings', href: '/support/settings/users' },
            { label: 'Performance' },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Monitor Core Web Vitals and application performance metrics in real-time.
          </p>
        </div>

        {/* Dashboard */}
        <PerformanceDashboard />
      </main>
    </div>
  );
}
