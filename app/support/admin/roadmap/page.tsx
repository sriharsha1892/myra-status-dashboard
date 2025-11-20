'use client';

/**
 * Admin Roadmap Page
 * Redirects to the global roadmap view at /roadmap
 * Both routes now show the same Strategic Timeline
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AdminRoadmapPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();

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
      } else if (user) {
        // Redirect authenticated super admins to the global roadmap
        router.push('/roadmap');
      }
    }
  }, [user, authLoading, role, is_super_admin, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-white">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-700">Redirecting to Global Roadmap...</p>
      </div>
    </div>
  );
}
