import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AnalyticsDashboard from '@/components/support/AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/support/login');
  }

  // Fetch user profile to check role
  const { data: profile } = await supabase
    .from('users')
    .select('role, username')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['Admin', 'Account Manager', 'Support'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // Fetch all trial organizations with related data
  const orgsQuery = supabase
    .from('trial_organizations')
    .select(`
      *,
      trial_users(user_id, name, email, current_stage, created_at, last_active),
      trial_support_queries(query_id, status, priority, created_at, resolved_at)
    `)
    .order('created_at', { ascending: false });

  // Filter by account manager if not Admin
  if (profile.role !== 'Admin') {
    orgsQuery.eq('account_manager', profile.username);
  }

  const { data: organizations } = await orgsQuery;

  // Fetch all users for team context
  const { data: teamMembers } = await supabase
    .from('users')
    .select('user_id, username, role')
    .in('role', ['Admin', 'Account Manager', 'Support'])
    .order('username');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Trial Analytics
          </h1>
          <p className="text-gray-600">
            Insights and metrics for trial organization performance
          </p>
        </div>

        <AnalyticsDashboard
          organizations={organizations || []}
          teamMembers={teamMembers || []}
          currentUser={profile}
        />
      </div>
    </div>
  );
}
