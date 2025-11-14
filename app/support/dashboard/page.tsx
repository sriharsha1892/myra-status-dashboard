'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import {
  FileText, AlertTriangle, TrendingUp, Building2, Zap,
  Target, ArrowRight, Activity, Sparkles, ChevronRight, Calendar,
  Users, TrendingDown
} from 'lucide-react';
import AnnouncementsBulletin from '@/components/support/AnnouncementsBulletin';
import TodosWidget from '@/components/support/TodosWidget';
import PersonalImpactWidget from '@/components/support/PersonalImpactWidget';
import PasswordReminderBanner from '@/components/PasswordReminderBanner';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { MagneticCard } from '@/components/animations/MagneticCard';
import { HolographicOverlay } from '@/components/animations/HolographicOverlay';
import { ChromaticShift } from '@/components/animations/ChromaticShift';
import { StatusGlow } from '@/components/animations/StatusGlow';

type Ticket = Database['public']['Tables']['tickets']['Row'];

export default function EnterpriseCommandCenter() {
  const { user, loading: authLoading, role, parent_company, is_super_admin } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [upcomingDemos, setUpcomingDemos] = useState<any[]>([]);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [avgEngagementScore, setAvgEngagementScore] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }

    if (user && !authLoading) {
      fetchAllData();
    }
  }, [user, authLoading, role, router]);

  // Memoized calculations - MUST be before any conditional returns (Rules of Hooks)
  const activeTrials = useMemo(() =>
    organizations.filter(o => o.org_lifecycle_stage === 'trial_active').length,
    [organizations]
  );

  const criticalTickets = useMemo(() =>
    tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length,
    [tickets]
  );

  const openTickets = useMemo(() =>
    tickets.filter(t => t.status !== 'resolved').length,
    [tickets]
  );

  const atRiskTrials = useMemo(() =>
    organizations.filter(o => {
      if (!o.trial_end_date) return false;
      const daysLeft = differenceInDays(new Date(o.trial_end_date), new Date());
      return daysLeft <= 7 && daysLeft >= 0 && o.org_lifecycle_stage === 'trial_active';
    }).length,
    [organizations]
  );

  const recentActivity = useMemo(() =>
    tickets
      .filter(t => t.status !== 'resolved')
      .slice(0, 5)
      .map(t => ({
        id: t.ticket_id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        created: t.created_at,
      })),
    [tickets]
  );

  const fetchAllData = async () => {
    setLoading(true);
    const startTime = performance.now();
    try {
      // Fetch in parallel for maximum speed
      await Promise.all([
        fetchTickets(),
        fetchOrganizations(),
        fetchUpcomingDemos(),
        fetchActiveUsers(),
      ]);
      const endTime = performance.now();
      console.log(`✅ Dashboard data loaded in ${Math.round(endTime - startTime)}ms`);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      if (role?.toLowerCase() === 'account_manager') {
        const { data: userOrgs } = await supabase
          .from('trial_organizations')
          .select('org_id')
          .eq('account_manager_id', user?.id);

        const orgIds = (userOrgs || []).map((org: any) => org.org_id);
        if (orgIds.length === 0) {
          setTickets([]);
          return;
        }

        // Limit to 500 most recent tickets for performance - plenty for dashboard metrics
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .in('trial_org_id', orgIds)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;
        setTickets(data || []);
      } else {
        // Limit to 500 most recent tickets for performance - dashboard only needs recent data
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;
        setTickets(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      let query = supabase.from('trial_organizations').select('*').order('created_at', { ascending: false });

      if (role?.toLowerCase() === 'account_manager') {
        query = query.eq('account_manager_id', user?.id);
      }

      // If not super admin: filter by parent company
      if (!is_super_admin && parent_company) {
        query = query.eq('parent_company', parent_company);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchUpcomingDemos = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meeting_notes')
        .select(`
          *,
          trial_organizations(org_name)
        `)
        .eq('meeting_type', 'demo')
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setUpcomingDemos(data || []);
    } catch (error: any) {
      console.error('Error fetching demos:', error);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      // Count total trial users across all organizations
      const { count, error } = await supabase
        .from('trial_users')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setActiveUsersCount(count || 0);

      // Calculate average engagement score from all organizations with engagement_score
      const { data: orgsWithScores, error: scoreError } = await supabase
        .from('trial_organizations')
        .select('engagement_score')
        .not('engagement_score', 'is', null);

      if (scoreError) throw scoreError;

      if (orgsWithScores && orgsWithScores.length > 0) {
        const avgScore = orgsWithScores.reduce((sum, org) => sum + (org.engagement_score || 0), 0) / orgsWithScores.length;
        setAvgEngagementScore(Math.round(avgScore));
      }
    } catch (error: any) {
      console.error('Error fetching active users:', error);
      // Set defaults on error to prevent UI from breaking
      setActiveUsersCount(0);
      setAvgEngagementScore(0);
    }
  };

  if (authLoading || loading) {
    const loadingQuotes = [
      { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
      { text: "Seek wealth, not money or status.", author: "Naval Ravikant" },
      { text: "The future is going to be weird.", author: "Elon Musk" },
      { text: "Build something 100 people love, not something 1 million people kind of like.", author: "Peter Thiel" },
      { text: "Move fast with stable infrastructure.", author: "Steve Jobs" },
      { text: "Compound your advantages.", author: "Naval Ravikant" },
    ];
    const randomQuote = loadingQuotes[Math.floor(Math.random() * loadingQuotes.length)];

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-600 tracking-tight">Loading dashboard...</p>
          <div className="mt-4 px-6 py-3 bg-white rounded-lg border border-neutral-200">
            <p className="text-xs text-neutral-900 font-medium mb-1">"{randomQuote.text}"</p>
            <p className="text-[10px] text-neutral-500">— {randomQuote.author}</p>
          </div>
        </div>
      </div>
    );
  }

  // Non-hook calculations (safe after conditional returns)
  const userName = user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-emerald-50/50" />

        <div className="relative max-w-7xl mx-auto px-6 py-8">
          {/* Announcements Bulletin */}
          <div className="mb-8">
            <AnnouncementsBulletin role={role} />
          </div>

          {/* Password Reminder Banner */}
          {user?.email && (
            <PasswordReminderBanner userEmail={user.email} />
          )}

          {/* Greeting Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-1">
              {greeting}, {userName}
            </h1>
            <p className="text-sm text-neutral-600">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} · {format(new Date(), 'h:mm a')}
            </p>
          </div>

          {/* Primary Metrics Grid - 8-Column Compact Layout - ALWAYS SHOW ALL CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            {/* Active Trials Card */}
            <MagneticCard
              index={0}
              className="group relative overflow-hidden"
            >
              <StatusGlow color="#2563eb" intensity="low" pulse={true} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <button
                    onClick={() => router.push('/support/trials')}
                    className="relative w-full bg-white/95 backdrop-blur-sm rounded-lg border-2 border-blue-400/30 p-3 hover:border-blue-500/50 hover:shadow-lg transition-all duration-200 text-left shadow-[inset_0_0_20px_rgba(37,99,235,0.08),0_0_24px_rgba(37,99,235,0.06)]"
                  >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Active Trials</div>
                <div className="text-2xl font-semibold text-neutral-900">{activeTrials === 0 ? '—' : activeTrials}</div>
              </div>
                  </button>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>

            {/* Critical Tickets Card - ALWAYS SHOW */}
            <MagneticCard
              index={1}
              className="group relative overflow-hidden"
            >
              <StatusGlow color={criticalTickets > 0 ? '#f97316' : '#2563eb'} intensity={criticalTickets > 0 ? 'medium' : 'low'} pulse={criticalTickets > 0} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <button
                    onClick={() => router.push('/support/tickets?priority=critical')}
                    className={`relative w-full bg-white/95 backdrop-blur-sm rounded-lg border-2 p-3 hover:shadow-lg transition-all duration-200 text-left ${
                      criticalTickets > 0 ? 'border-orange-400/30 hover:border-orange-500/50 shadow-[inset_0_0_20px_rgba(249,115,22,0.12),0_0_24px_rgba(249,115,22,0.08)]' : 'border-blue-400/30 hover:border-blue-500/50 shadow-[inset_0_0_20px_rgba(37,99,235,0.08),0_0_24px_rgba(37,99,235,0.06)]'
                    }`}
                  >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  criticalTickets > 0 ? 'bg-amber-50' : 'bg-neutral-50'
                }`}>
                  <AlertTriangle className={`w-3.5 h-3.5 ${
                    criticalTickets > 0 ? 'text-amber-600' : 'text-neutral-400'
                  }`} strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-1.5">
                  {criticalTickets > 0 && (
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
                </div>
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Critical</div>
                <div className="text-2xl font-semibold text-neutral-900">{criticalTickets === 0 ? '—' : criticalTickets}</div>
              </div>
                  </button>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>

            {/* Open Tickets Card - ALWAYS SHOW */}
            <MagneticCard
              index={2}
              className="group relative overflow-hidden"
            >
              <StatusGlow color="#2563eb" intensity="low" pulse={false} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="relative w-full bg-white/95 backdrop-blur-sm rounded-lg border-2 border-blue-400/30 p-3 hover:border-blue-500/50 hover:shadow-lg transition-all duration-200 text-left shadow-[inset_0_0_20px_rgba(37,99,235,0.08),0_0_24px_rgba(37,99,235,0.06)]"
                  >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Open Tickets</div>
                <div className="text-2xl font-semibold text-neutral-900">{openTickets === 0 ? '—' : openTickets}</div>
              </div>
                  </button>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>

            {/* At Risk Trials Card - ALWAYS SHOW */}
            <MagneticCard
              index={3}
              className="group relative overflow-hidden"
            >
              <StatusGlow color={atRiskTrials > 0 ? '#f97316' : '#64748b'} intensity={atRiskTrials > 0 ? 'medium' : 'low'} pulse={atRiskTrials > 0} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <div className={`relative bg-white/95 backdrop-blur-sm rounded-lg border-2 p-3 ${
                    atRiskTrials > 0 ? 'border-orange-400/30 shadow-[inset_0_0_20px_rgba(249,115,22,0.12),0_0_24px_rgba(249,115,22,0.08)]' : 'border-slate-300/30 shadow-[inset_0_0_16px_rgba(100,116,139,0.08),0_0_20px_rgba(100,116,139,0.06)]'
                  }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  atRiskTrials > 0 ? 'bg-amber-50' : 'bg-neutral-50'
                }`}>
                  <Target className={`w-3.5 h-3.5 ${
                    atRiskTrials > 0 ? 'text-amber-600' : 'text-neutral-400'
                  }`} strokeWidth={1.5} />
                </div>
                {atRiskTrials > 0 && (
                  <div className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded">
                    <span className="text-[10px] text-amber-700 font-medium">7D</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Ending Soon</div>
                <div className="text-2xl font-semibold text-neutral-900">{atRiskTrials === 0 ? '—' : atRiskTrials}</div>
              </div>
                  </div>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>

            {/* Total Organizations Card - NEW */}
            <MagneticCard
              index={4}
              className="group relative overflow-hidden"
            >
              <StatusGlow color="#059669" intensity="low" pulse={false} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <button
                    onClick={() => router.push('/support/trials')}
                    className="relative w-full bg-white/95 backdrop-blur-sm rounded-lg border-2 border-emerald-400/30 p-3 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 text-left shadow-[inset_0_0_24px_rgba(5,150,105,0.10),0_0_28px_rgba(5,150,105,0.08)]"
                  >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Total Orgs</div>
                <div className="text-2xl font-semibold text-neutral-900">{organizations.length === 0 ? '—' : organizations.length}</div>
              </div>
                  </button>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>

            {/* Total Tickets Card - NEW */}
            <MagneticCard
              index={5}
              className="group relative overflow-hidden"
            >
              <StatusGlow color="#8b5cf6" intensity="low" pulse={false} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="relative w-full bg-white/95 backdrop-blur-sm rounded-lg border-2 border-purple-400/30 p-3 hover:border-purple-500/50 hover:shadow-lg transition-all duration-200 text-left shadow-[inset_0_0_20px_rgba(139,92,246,0.10),0_0_24px_rgba(139,92,246,0.08)]"
                  >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent-50 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-accent-600" strokeWidth={1.5} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-accent-600 group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Total Tickets</div>
                <div className="text-2xl font-semibold text-neutral-900">{tickets.length === 0 ? '—' : tickets.length}</div>
              </div>
                  </button>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>

            {/* Active Users Card - NEW */}
            <MagneticCard
              index={6}
              className="group relative overflow-hidden"
            >
              <StatusGlow color="#0ea5e9" intensity="low" pulse={false} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-lg border-2 border-sky-400/30 p-3 shadow-[inset_0_0_20px_rgba(14,165,233,0.10),0_0_24px_rgba(14,165,233,0.08)]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-sky-600" strokeWidth={1.5} />
                </div>
                <div className="px-1.5 py-0.5 bg-sky-50 border border-sky-200 rounded">
                  <TrendingUp className="w-3 h-3 text-sky-600" strokeWidth={1.5} />
                </div>
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Active Users</div>
                <div className="text-2xl font-semibold text-neutral-900">{activeUsersCount === 0 ? '—' : activeUsersCount}</div>
              </div>
                  </div>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>

            {/* Engagement Score Card - NEW */}
            <MagneticCard
              index={7}
              className="group relative overflow-hidden"
            >
              <StatusGlow color={avgEngagementScore >= 70 ? '#10b981' : avgEngagementScore >= 50 ? '#f59e0b' : '#ef4444'} intensity="low" pulse={avgEngagementScore < 50} />
              <HolographicOverlay intensity={0.3}>
                <ChromaticShift intensity={0.4}>
                  <div className={`relative bg-white/95 backdrop-blur-sm rounded-lg border-2 p-3 ${
                    avgEngagementScore >= 70 ? 'border-emerald-400/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.10),0_0_24px_rgba(16,185,129,0.08)]' : avgEngagementScore >= 50 ? 'border-amber-400/30 shadow-[inset_0_0_20px_rgba(245,158,11,0.10),0_0_24px_rgba(245,158,11,0.08)]' : 'border-red-400/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.10),0_0_24px_rgba(239,68,68,0.08)]'
                  }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  avgEngagementScore >= 70 ? 'bg-emerald-50' : avgEngagementScore >= 50 ? 'bg-amber-50' : 'bg-red-50'
                }`}>
                  {avgEngagementScore >= 50 ? (
                    <TrendingUp className={`w-3.5 h-3.5 ${avgEngagementScore >= 70 ? 'text-emerald-600' : 'text-amber-600'}`} strokeWidth={1.5} />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-600" strokeWidth={1.5} />
                  )}
                </div>
                <div className={`px-1.5 py-0.5 rounded ${
                  avgEngagementScore >= 70 ? 'bg-emerald-50 border border-emerald-200' : avgEngagementScore >= 50 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <span className={`text-[10px] font-medium ${
                    avgEngagementScore >= 70 ? 'text-emerald-700' : avgEngagementScore >= 50 ? 'text-amber-700' : 'text-red-700'
                  }`}>AVG</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-neutral-600 mb-1 uppercase font-medium tracking-wide">Engagement</div>
                <div className="text-2xl font-semibold text-neutral-900">{avgEngagementScore === 0 ? '—' : `${avgEngagementScore}%`}</div>
              </div>
                  </div>
                </ChromaticShift>
              </HolographicOverlay>
            </MagneticCard>
          </div>

          {/* Two-Column Layout - Compact Spacing */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Activity Feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Recent Activity - ALWAYS SHOW */}
              <div className="relative bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xs font-semibold text-neutral-900">Recent Activity</h2>
                  </div>
                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="text-[10px] text-neutral-600 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>

                {recentActivity.length > 0 ? (
                  <div className="space-y-1.5">
                    {recentActivity.map((activity, idx) => (
                      <button
                        key={activity.id}
                        onClick={() => router.push(`/support/tickets/${activity.id}`)}
                        className="group w-full text-left px-3 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-transparent hover:border-neutral-200 transition-all duration-200"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {activity.priority === 'critical' && (
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                              )}
                              <p className="text-xs text-neutral-900 font-medium truncate group-hover:text-blue-600 transition-colors duration-200">
                                {activity.title}
                              </p>
                            </div>
                            <p className="text-[10px] text-neutral-500">
                              {formatDistanceToNow(new Date(activity.created), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" strokeWidth={1.5} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-xs text-neutral-500 mb-1">No recent activity</p>
                    <p className="text-[10px] text-neutral-400 italic">"The calm before the storm"</p>
                  </div>
                )}
              </div>

              {/* Quick Actions - Compact */}
              <div className="relative bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xs font-semibold text-neutral-900">Quick Actions</h2>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => router.push('/support/trials')}
                    className="group relative bg-neutral-50 hover:bg-neutral-100 rounded-lg p-3 border border-transparent hover:border-neutral-200 transition-all duration-200 text-left"
                  >
                    <Building2 className="w-4 h-4 text-blue-600 mb-1.5" strokeWidth={1.5} />
                    <p className="text-xs text-neutral-900 font-medium mb-0.5">Trial Organizations</p>
                    <p className="text-[10px] text-neutral-600">Manage active trials</p>
                  </button>

                  <button
                    onClick={() => router.push('/support/tickets')}
                    className="group relative bg-neutral-50 hover:bg-neutral-100 rounded-lg p-3 border border-transparent hover:border-neutral-200 transition-all duration-200 text-left"
                  >
                    <FileText className="w-4 h-4 text-blue-600 mb-1.5" strokeWidth={1.5} />
                    <p className="text-xs text-neutral-900 font-medium mb-0.5">Support Tickets</p>
                    <p className="text-[10px] text-neutral-600">View all tickets</p>
                  </button>

                  <button
                    onClick={() => router.push('/support/analytics')}
                    className="group relative bg-neutral-50 hover:bg-neutral-100 rounded-lg p-3 border border-transparent hover:border-neutral-200 transition-all duration-200 text-left"
                  >
                    <TrendingUp className="w-4 h-4 text-blue-600 mb-1.5" strokeWidth={1.5} />
                    <p className="text-xs text-neutral-900 font-medium mb-0.5">Analytics</p>
                    <p className="text-[10px] text-neutral-600">Trial insights & metrics</p>
                  </button>

                  {role?.toLowerCase() === 'admin' && is_super_admin && (
                    <>
                      <button
                        onClick={() => router.push('/support/admin/roadmap')}
                        className="group relative bg-neutral-50 hover:bg-neutral-100 rounded-lg p-3 border border-transparent hover:border-neutral-200 transition-all duration-200 text-left"
                      >
                        <Target className="w-4 h-4 text-blue-600 mb-1.5" strokeWidth={1.5} />
                        <p className="text-xs text-neutral-900 font-medium mb-0.5">Roadmap</p>
                        <p className="text-[10px] text-neutral-600">Product planning</p>
                      </button>
                      <button
                        onClick={() => router.push('/support/resources')}
                        className="group relative bg-neutral-50 hover:bg-neutral-100 rounded-lg p-3 border border-transparent hover:border-neutral-200 transition-all duration-200 text-left"
                      >
                        <Sparkles className="w-4 h-4 text-accent-600 mb-1.5" strokeWidth={1.5} />
                        <p className="text-xs text-neutral-900 font-medium mb-0.5">Announcements</p>
                        <p className="text-[10px] text-neutral-600">Manage updates</p>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Impact, Todos, Demos & Insights */}
            <div className="lg:col-span-1 space-y-4">
              {/* Personal Impact & Activity Feed - Always visible */}
              <PersonalImpactWidget userId={user?.id} role={role} />

              {/* Onboarding Checklist */}
              <OnboardingChecklist />

              {/* Todos Widget - Always visible */}
              <TodosWidget userId={user?.id} />

              {/* Upcoming Demos */}
              {role?.toLowerCase() === 'admin' && upcomingDemos.length > 0 && (
                <div className="relative bg-white rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xs font-semibold text-neutral-900">Upcoming Demos</h2>
                  </div>

                  <div className="space-y-1.5">
                    {upcomingDemos.slice(0, 4).map((demo, idx) => {
                      const demoDate = new Date(demo.meeting_date);
                      const isToday = format(demoDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const isTomorrow = differenceInDays(demoDate, new Date()) === 1;

                      return (
                        <button
                          key={demo.meeting_id}
                          onClick={() => router.push(`/support/trials/${demo.org_id}`)}
                          className="group w-full text-left p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-transparent hover:border-neutral-200 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-xs text-neutral-900 font-medium group-hover:text-blue-600 transition-colors duration-200">
                              {(demo.trial_organizations as any)?.org_name || 'Unknown Org'}
                            </p>
                            {isToday && (
                              <span className="px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[10px] text-blue-700 font-medium">
                                TODAY
                              </span>
                            )}
                            {isTomorrow && (
                              <span className="px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded text-[10px] text-amber-700 font-medium">
                                TMR
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500">
                            {format(demoDate, 'MMM d, yyyy')} · {demo.conducted_by}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Insights - Compact */}
              <div className="relative bg-gradient-to-br from-accent-50 via-white to-pink-50 rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-accent-100 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-accent-600" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xs font-semibold text-neutral-900">Insights</h2>
                </div>

                <div className="space-y-1.5">
                  {criticalTickets > 0 && (
                    <button
                      onClick={() => router.push('/support/tickets?priority=critical')}
                      className="w-full text-left p-2 rounded-lg bg-white hover:bg-neutral-50 border border-slate-100 hover:border-amber-200 transition-all duration-200 group"
                    >
                      <p className="text-xs text-neutral-900 font-medium mb-0.5 group-hover:text-amber-700 transition-colors duration-200">
                        {criticalTickets} critical {criticalTickets === 1 ? 'issue' : 'issues'} need attention
                      </p>
                      <p className="text-[10px] text-neutral-600">Review critical tickets →</p>
                    </button>
                  )}

                  {atRiskTrials > 0 && (
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full text-left p-2 rounded-lg bg-white hover:bg-neutral-50 border border-slate-100 hover:border-amber-200 transition-all duration-200 group"
                    >
                      <p className="text-xs text-neutral-900 font-medium mb-0.5 group-hover:text-amber-700 transition-colors duration-200">
                        {atRiskTrials} {atRiskTrials === 1 ? 'trial ends' : 'trials end'} within 7 days
                      </p>
                      <p className="text-[10px] text-neutral-600">Check trial status →</p>
                    </button>
                  )}

                  {activeTrials > 0 && criticalTickets === 0 && atRiskTrials === 0 && (
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full text-left p-2 rounded-lg bg-white hover:bg-neutral-50 border border-slate-100 hover:border-emerald-200 transition-all duration-200 group"
                    >
                      <p className="text-xs text-neutral-900 font-medium mb-0.5 group-hover:text-emerald-700 transition-colors duration-200">
                        {activeTrials} active {activeTrials === 1 ? 'trial' : 'trials'} in progress
                      </p>
                      <p className="text-[10px] text-neutral-600">View all trials →</p>
                    </button>
                  )}

                  {criticalTickets === 0 && atRiskTrials === 0 && activeTrials === 0 && (
                    <div className="text-center py-4">
                      <p className="text-xs text-neutral-900 font-medium mb-1">All systems nominal</p>
                      <p className="text-[10px] text-neutral-500 italic">"Compounding works. Keep going."</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
