'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays, parseISO, startOfWeek, format, subDays, eachDayOfInterval, subMonths, startOfDay } from 'date-fns';
import { ArrowLeft, Users, TrendingUp, TrendingDown, Building2, Activity, Filter, ChevronDown, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { createAccountManagerMap, resolveAccountManagerName } from '@/lib/utils/accountManagerUtils';
import { AnimatedNumber } from '@/components/animations/AnimatedNumber';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChartEmptyState } from '@/components/charts/ChartEmptyState';
import { useLoading } from '@/lib/loading';
import { LoadingOverlay } from '@/components/loading';

// Lazy load Recharts components (no individual loading states)
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => ({ default: mod.AreaChart })), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });

// Lazy load ResponsiveSankey (no loading state)
const ResponsiveSankey = dynamic(
  () => import('@nivo/sankey').then(mod => ({ default: mod.ResponsiveSankey })),
  { ssr: false }
);

// Types
interface OrgEngagement {
  org_id: string;
  org_name: string;
  domain: string;
  trial_status: string;
  org_lifecycle_stage: string;
  user_count: number;
  active_users: number;
  trial_start_date: string | null;
  trial_end_date: string | null;
  days_in_trial: number;
  days_remaining: number;
  account_manager: string;
  engagement_rate: number;
  last_activity?: string;
  ticket_count: number;
  critical_tickets: number;
  urgency_score: number;
}

interface Filters {
  lifecycleStages: string[];
  trialStatuses: string[];
  domains: string[];
  accountManagers: string[];
  engagementRange: [number, number];
  daysRemainingRange: [number, number];
}

const LIFECYCLE_STAGES = ['Prospect', 'Demo Scheduled', 'Trial Active', 'Converted', 'Churned'];
const TRIAL_STATUSES = ['Requested', 'Approved', 'In Progress', 'Active', 'Extended', 'Completed', 'Closed'];
const DOMAINS = ['TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD'];

// Vibrant, distinct color palette for charts
const COLORS = [
  '#FF6B9D', // Hot Pink
  '#06D6A0', // Turquoise
  '#7B68EE', // Medium Slate Blue
  '#FFB627', // Amber
  '#FF6F61', // Coral
  '#00BFFF', // Deep Sky Blue
  '#9D4EDD', // Purple
  '#F72585', // Rose
  '#4CC9F0', // Sky Blue
  '#F77F00', // Orange
  '#06FFA5', // Spring Green
  '#4361EE', // Royal Blue
];

export default function EngagementReportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgEngagement[]>([]);
  const [allOrgs, setAllOrgs] = useState<OrgEngagement[]>([]);
  const [accessControl, setAccessControl] = useState<'all' | 'portfolio'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [period, setPeriod] = useState<'7d' | '14d' | '30d'>('14d');
  const [currentPage, setCurrentPage] = useState(1);
  const [focusedChart, setFocusedChart] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 20;

  const [filters, setFilters] = useState<Filters>({
    lifecycleStages: [],
    trialStatuses: [],
    domains: [],
    accountManagers: [],
    engagementRange: [0, 100],
    daysRemainingRange: [0, 365],
  });

  const [accountManagers, setAccountManagers] = useState<string[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [ticketActivityData, setTicketActivityData] = useState<any[]>([]);
  const [atRiskTrials, setAtRiskTrials] = useState<OrgEngagement[]>([]);

  // Use the centralized loading service
  const { isLoading: pageLoading, startLoading, stopLoading } = useLoading('page', 'reports');

  useEffect(() => {
    if (!authLoading && user) {
      fetchEngagementData();
    }
  }, [user, accessControl, authLoading]);

  useEffect(() => {
    applyFilters();
  }, [filters, allOrgs]);

  const fetchEngagementData = async () => {
    setLoading(true);
    startLoading();
    try {
      // Fetch account managers via API (bypasses RLS)
      const response = await fetch('/api/account-managers');
      const { managers } = await response.json();

      // Filter for Account Manager role (note: API returns "Account Manager" with space, not underscore)
      const accountManagers = (managers || []).filter((m: any) =>
        m.role === 'Account Manager' || m.role === 'account_manager' || m.role === 'Account_Manager'
      );

      const accountManagerMap = createAccountManagerMap(accountManagers);

      // Build org query with access control
      let orgsQuery = supabase
        .from('trial_organizations')
        .select('*');

      if (accessControl === 'portfolio' && user?.id) {
        orgsQuery = orgsQuery.eq('account_manager_id', user.id);
      }

      const { data: orgsData, error: orgsError } = await orgsQuery;
      if (orgsError) throw orgsError;

      // Fetch all trial users
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('*');
      if (usersError) throw usersError;

      // Fetch tickets for support volume analysis
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('trial_org_id, priority, status, created_at');

      // Create ticket lookup by org_id
      const ticketsByOrg = (ticketsData || []).reduce((acc: any, ticket) => {
        if (!ticket.trial_org_id) return acc;
        if (!acc[ticket.trial_org_id]) {
          acc[ticket.trial_org_id] = { total: 0, critical: 0, high: 0, open: 0 };
        }
        acc[ticket.trial_org_id].total++;
        if (ticket.priority === 'Critical') acc[ticket.trial_org_id].critical++;
        if (ticket.priority === 'High') acc[ticket.trial_org_id].high++;
        if (['New', 'Open', 'In Progress'].includes(ticket.status)) acc[ticket.trial_org_id].open++;
        return acc;
      }, {});

      // Process org engagement
      const orgEngagement: OrgEngagement[] = (orgsData || []).map(org => {
        const orgUsers = (usersData || []).filter(u => u.org_id === org.org_id);
        const activeUsers = orgUsers.filter(u =>
          u.current_stage === 'active' || u.current_stage === 'power_user'
        ).length;

        let daysInTrial = 0;
        let daysRemaining = 0;
        if (org.trial_start_date) {
          const start = parseISO(org.trial_start_date);
          const today = new Date();
          daysInTrial = Math.max(0, differenceInDays(today, start));
        }
        if (org.trial_end_date) {
          const end = parseISO(org.trial_end_date);
          const today = new Date();
          daysRemaining = Math.max(0, differenceInDays(end, today));
        }

        const engagementRate = orgUsers.length > 0 ? (activeUsers / orgUsers.length) * 100 : 0;

        // Check account_manager_id first (preferred), fallback to account_manager
        const accountManagerValue = org.account_manager_id || org.account_manager;
        const accountManagerName = resolveAccountManagerName(
          accountManagerValue,
          accountManagerMap
        );

        // Get ticket data for this org
        const orgTickets = ticketsByOrg[org.org_id] || { total: 0, critical: 0, high: 0, open: 0 };

        // Calculate composite urgency score (0-100, higher = more urgent)
        // Factors: days remaining, engagement, tickets, user activity
        const timeUrgency = daysRemaining > 0 ? Math.min(100, (30 / (daysRemaining + 1)) * 20) : 100;
        const engagementUrgency = (100 - engagementRate) * 0.4;
        const ticketUrgency = (orgTickets.critical * 15) + (orgTickets.high * 8) + (orgTickets.open * 2);
        const activityUrgency = orgUsers.length > 0 && activeUsers === 0 ? 20 : 0;

        const urgencyScore = Math.min(100, timeUrgency + engagementUrgency + ticketUrgency + activityUrgency);

        return {
          org_id: org.org_id,
          org_name: org.org_name,
          domain: org.org_domain || org.domain || 'N/A',
          trial_status: org.trial_status || 'unknown',
          org_lifecycle_stage: org.org_lifecycle_stage || 'unknown',
          user_count: orgUsers.length,
          active_users: activeUsers,
          trial_start_date: org.trial_start_date,
          trial_end_date: org.trial_end_date,
          days_in_trial: daysInTrial,
          days_remaining: daysRemaining,
          account_manager: accountManagerName,
          engagement_rate: engagementRate,
          ticket_count: orgTickets.total,
          critical_tickets: orgTickets.critical,
          urgency_score: urgencyScore,
        };
      });

      // Get all active trial organizations (not expired, not converted)
      // Filter: Active/In Progress trials OR trials with days remaining > 0
      const activeTrial = orgEngagement
        .filter(org =>
          // Include if trial is explicitly active
          (org.trial_status === 'Active' || org.trial_status === 'In Progress') ||
          // Or if trial has time remaining and not converted/cancelled
          (org.days_remaining > 0 && org.trial_status !== 'Converted' && org.trial_status !== 'Cancelled')
        )
        .sort((a, b) => b.urgency_score - a.urgency_score) // Sort by urgency (highest first)
        .slice(0, 10); // Top 10 most urgent active trials
      setAtRiskTrials(activeTrial);

      setAllOrgs(orgEngagement);
      setOrgs(orgEngagement);

      // Extract unique account managers
      const uniqueManagers = Array.from(new Set(orgEngagement.map(o => o.account_manager).filter(m => m !== 'Unassigned')));
      setAccountManagers(uniqueManagers);

      // Build time series data
      generateTimeSeriesData(orgsData || [], usersData || []);

      // Process ticket activity data
      if (ticketsData) {
        generateTicketActivityData(ticketsData);
      }
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const generateTimeSeriesData = (orgsData: any[], usersData: any[]) => {
    const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
    const startDate = startOfDay(subDays(new Date(), days));
    const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });

    const data = dateRange.map(date => {
      const dateStr = format(date, 'MMM dd');

      // Count trials created by this date
      const trialsCreated = orgsData.filter(o =>
        o.created_at && parseISO(o.created_at) <= date
      ).length;

      // Count users invited by this date
      const usersInvited = usersData.filter(u =>
        u.invited_at && parseISO(u.invited_at) <= date
      ).length;

      // Count active users by this date
      const activeUsers = usersData.filter(u =>
        (u.current_stage === 'active' || u.current_stage === 'power_user') &&
        u.invited_at && parseISO(u.invited_at) <= date
      ).length;

      return {
        date: dateStr,
        trials: trialsCreated,
        users: usersInvited,
        active: activeUsers,
      };
    });

    setTimeSeriesData(data);
  };

  const generateTicketActivityData = (tickets: any[]) => {
    const days = 30;
    const startDate = startOfDay(subDays(new Date(), days));
    const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });

    const data = dateRange.map(date => {
      const dayTickets = tickets.filter(t => {
        if (!t.created_at) return false;
        const ticketDate = startOfDay(parseISO(t.created_at));
        return ticketDate.getTime() === date.getTime();
      });

      return {
        date: format(date, 'MMM dd'),
        critical: dayTickets.filter(t => t.priority === 'Critical').length,
        high: dayTickets.filter(t => t.priority === 'High').length,
        medium: dayTickets.filter(t => t.priority === 'Medium').length,
        low: dayTickets.filter(t => t.priority === 'Low').length,
      };
    });

    setTicketActivityData(data);
  };

  const applyFilters = () => {
    let filtered = [...allOrgs];

    if (filters.lifecycleStages.length > 0) {
      filtered = filtered.filter(o => {
        const stage = o.org_lifecycle_stage
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        return filters.lifecycleStages.includes(stage);
      });
    }

    if (filters.trialStatuses.length > 0) {
      filtered = filtered.filter(o => {
        const status = o.trial_status
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        return filters.trialStatuses.includes(status);
      });
    }

    if (filters.domains.length > 0) {
      filtered = filtered.filter(o => filters.domains.includes(o.domain));
    }

    if (filters.accountManagers.length > 0) {
      filtered = filtered.filter(o => filters.accountManagers.includes(o.account_manager));
    }

    filtered = filtered.filter(o =>
      o.engagement_rate >= filters.engagementRange[0] &&
      o.engagement_rate <= filters.engagementRange[1]
    );

    filtered = filtered.filter(o =>
      o.days_remaining >= filters.daysRemainingRange[0] &&
      o.days_remaining <= filters.daysRemainingRange[1]
    );

    setOrgs(filtered);
    setCurrentPage(1);
  };

  const toggleFilter = (filterType: keyof Filters, value: string) => {
    setFilters(prev => {
      const currentArray = prev[filterType] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      return { ...prev, [filterType]: newArray };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      lifecycleStages: [],
      trialStatuses: [],
      domains: [],
      accountManagers: [],
      engagementRange: [0, 100],
      daysRemainingRange: [0, 365],
    });
  };

  // Calculate metrics
  const activeTrials = orgs.filter(o => o.org_lifecycle_stage === 'trial_active').length;
  const totalUsers = orgs.reduce((sum, org) => sum + org.user_count, 0);
  const totalActiveUsers = orgs.reduce((sum, org) => sum + org.active_users, 0);
  const avgEngagement = orgs.length > 0
    ? orgs.reduce((sum, org) => sum + org.engagement_rate, 0) / orgs.length
    : 0;
  const conversionRate = allOrgs.length > 0
    ? (allOrgs.filter(o => o.org_lifecycle_stage === 'converted').length / allOrgs.length) * 100
    : 0;

  // Prepare chart data with memoization
  const engagementDistribution = useMemo(() => [
    { range: '0-20%', count: orgs.filter(o => o.engagement_rate < 20).length },
    { range: '20-40%', count: orgs.filter(o => o.engagement_rate >= 20 && o.engagement_rate < 40).length },
    { range: '40-60%', count: orgs.filter(o => o.engagement_rate >= 40 && o.engagement_rate < 60).length },
    { range: '60-80%', count: orgs.filter(o => o.engagement_rate >= 60 && o.engagement_rate < 80).length },
    { range: '80-100%', count: orgs.filter(o => o.engagement_rate >= 80).length },
  ], [orgs]);

  const lifecycleFunnel = useMemo(() => [
    { stage: 'Prospect', count: allOrgs.filter(o => o.org_lifecycle_stage === 'prospect').length },
    { stage: 'Demo', count: allOrgs.filter(o => o.org_lifecycle_stage === 'demo_scheduled').length },
    { stage: 'Trial', count: allOrgs.filter(o => o.org_lifecycle_stage === 'trial_active').length },
    { stage: 'Converted', count: allOrgs.filter(o => o.org_lifecycle_stage === 'converted').length },
  ], [allOrgs]);

  const domainData = useMemo(() =>
    DOMAINS.map(domain => ({
      name: domain,
      value: orgs.filter(o => o.domain === domain).length,
    })).filter(d => d.value > 0)
  , [orgs]);

  // Sankey data: Account Manager → Trial Status → Outcome
  // 4-Layer Sankey: Domain → Engagement → Manager → Outcome
  // Memoize expensive Sankey data generation
  const sankeyData = useMemo(() => {
    const nodes: { id: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];

    // Layer 1: Domains
    const domains = Array.from(new Set(orgs.map(o => o.domain).filter(Boolean)));
    domains.forEach(d => nodes.push({ id: d }));

    // Layer 2: Engagement levels
    const engagementLevels = ['High Engagement (>60%)', 'Medium Engagement (30-60%)', 'Low Engagement (<30%)'];
    engagementLevels.forEach(e => nodes.push({ id: e }));

    // Layer 3: Account Managers
    const managers = Array.from(new Set(orgs.map(o => o.account_manager).filter(Boolean)));
    managers.forEach(m => nodes.push({ id: m }));

    // Layer 4: Outcomes
    const outcomes = ['Converted', 'At Risk', 'Active & Healthy', 'Lost'];
    outcomes.forEach(o => nodes.push({ id: o }));

    // Links: Domain → Engagement
    domains.forEach(domain => {
      const domainOrgs = orgs.filter(o => o.domain === domain);

      const high = domainOrgs.filter(o => o.engagement_rate >= 60).length;
      if (high > 0) {
        links.push({ source: domain, target: 'High Engagement (>60%)', value: high });
      }

      const medium = domainOrgs.filter(o => o.engagement_rate >= 30 && o.engagement_rate < 60).length;
      if (medium > 0) {
        links.push({ source: domain, target: 'Medium Engagement (30-60%)', value: medium });
      }

      const low = domainOrgs.filter(o => o.engagement_rate < 30).length;
      if (low > 0) {
        links.push({ source: domain, target: 'Low Engagement (<30%)', value: low });
      }
    });

    // Links: Engagement → Manager
    engagementLevels.forEach(level => {
      const getEngagementFilter = (org: any) => {
        if (level.includes('High')) return org.engagement_rate >= 60;
        if (level.includes('Medium')) return org.engagement_rate >= 30 && org.engagement_rate < 60;
        return org.engagement_rate < 30;
      };

      managers.forEach(manager => {
        const count = orgs.filter(o =>
          o.account_manager === manager && getEngagementFilter(o)
        ).length;
        if (count > 0) {
          links.push({ source: level, target: manager, value: count });
        }
      });
    });

    // Links: Manager → Outcome
    managers.forEach(manager => {
      const managerOrgs = orgs.filter(o => o.account_manager === manager);

      // Converted
      const converted = managerOrgs.filter(o => o.org_lifecycle_stage === 'converted').length;
      if (converted > 0) {
        links.push({ source: manager, target: 'Converted', value: converted });
      }

      // At Risk (low engagement OR low days remaining OR high urgency)
      const atRisk = managerOrgs.filter(o =>
        o.org_lifecycle_stage !== 'converted' &&
        o.org_lifecycle_stage !== 'churned' &&
        (o.engagement_rate < 40 || o.days_remaining < 14 || o.urgency_score > 60)
      ).length;
      if (atRisk > 0) {
        links.push({ source: manager, target: 'At Risk', value: atRisk });
      }

      // Active & Healthy
      const active = managerOrgs.filter(o =>
        o.org_lifecycle_stage === 'trial_active' &&
        o.engagement_rate >= 40 &&
        o.days_remaining >= 14 &&
        o.urgency_score <= 60
      ).length;
      if (active > 0) {
        links.push({ source: manager, target: 'Active & Healthy', value: active });
      }

      // Lost
      const lost = managerOrgs.filter(o => o.org_lifecycle_stage === 'churned').length;
      if (lost > 0) {
        links.push({ source: manager, target: 'Lost', value: lost });
      }
    });

    return { nodes, links };
  }, [orgs]);

  // Unfiltered versions for filter-aware empty states
  const unfilteredEngagementDistribution = useMemo(() => [
    { range: '0-20%', count: allOrgs.filter(o => o.engagement_rate < 20).length },
    { range: '20-40%', count: allOrgs.filter(o => o.engagement_rate >= 20 && o.engagement_rate < 40).length },
    { range: '40-60%', count: allOrgs.filter(o => o.engagement_rate >= 40 && o.engagement_rate < 60).length },
    { range: '60-80%', count: allOrgs.filter(o => o.engagement_rate >= 60 && o.engagement_rate < 80).length },
    { range: '80-100%', count: allOrgs.filter(o => o.engagement_rate >= 80).length },
  ], [allOrgs]);

  const unfilteredDomainData = useMemo(() =>
    DOMAINS.map(domain => ({
      name: domain,
      value: allOrgs.filter(o => o.domain === domain).length,
    })).filter(d => d.value > 0)
  , [allOrgs]);

  const unfilteredSankeyData = useMemo(() => {
    const nodes: { id: string }[] = [];
    const links: { source: string; target: string; value: number }[] = [];

    // Layer 1: Domains
    const domains = Array.from(new Set(allOrgs.map(o => o.domain).filter(Boolean)));
    domains.forEach(d => nodes.push({ id: d }));

    // Layer 2: Engagement levels
    const engagementLevels = ['High Engagement (>60%)', 'Medium Engagement (30-60%)', 'Low Engagement (<30%)'];
    engagementLevels.forEach(e => nodes.push({ id: e }));

    // Layer 3: Account Managers
    const managers = Array.from(new Set(allOrgs.map(o => o.account_manager).filter(Boolean)));
    managers.forEach(m => nodes.push({ id: m }));

    // Layer 4: Outcomes
    const outcomes = ['Converted', 'At Risk', 'Active & Healthy', 'Lost'];
    outcomes.forEach(o => nodes.push({ id: o }));

    // Links: Domain → Engagement
    domains.forEach(domain => {
      const domainOrgs = allOrgs.filter(o => o.domain === domain);

      const high = domainOrgs.filter(o => o.engagement_rate >= 60).length;
      if (high > 0) {
        links.push({ source: domain, target: 'High Engagement (>60%)', value: high });
      }

      const medium = domainOrgs.filter(o => o.engagement_rate >= 30 && o.engagement_rate < 60).length;
      if (medium > 0) {
        links.push({ source: domain, target: 'Medium Engagement (30-60%)', value: medium });
      }

      const low = domainOrgs.filter(o => o.engagement_rate < 30).length;
      if (low > 0) {
        links.push({ source: domain, target: 'Low Engagement (<30%)', value: low });
      }
    });

    // Links: Engagement → Manager
    engagementLevels.forEach(level => {
      const getEngagementFilter = (org: any) => {
        if (level.includes('High')) return org.engagement_rate >= 60;
        if (level.includes('Medium')) return org.engagement_rate >= 30 && org.engagement_rate < 60;
        return org.engagement_rate < 30;
      };

      managers.forEach(manager => {
        const count = allOrgs.filter(o =>
          o.account_manager === manager && getEngagementFilter(o)
        ).length;
        if (count > 0) {
          links.push({ source: level, target: manager, value: count });
        }
      });
    });

    // Links: Manager → Outcome
    managers.forEach(manager => {
      const managerOrgs = allOrgs.filter(o => o.account_manager === manager);

      // Converted
      const converted = managerOrgs.filter(o => o.org_lifecycle_stage === 'converted').length;
      if (converted > 0) {
        links.push({ source: manager, target: 'Converted', value: converted });
      }

      // At Risk
      const atRisk = managerOrgs.filter(o =>
        o.org_lifecycle_stage !== 'converted' &&
        o.org_lifecycle_stage !== 'churned' &&
        (o.engagement_rate < 40 || o.days_remaining < 14 || o.urgency_score > 60)
      ).length;
      if (atRisk > 0) {
        links.push({ source: manager, target: 'At Risk', value: atRisk });
      }

      // Active & Healthy
      const active = managerOrgs.filter(o =>
        o.org_lifecycle_stage === 'trial_active' &&
        o.engagement_rate >= 40 &&
        o.days_remaining >= 14 &&
        o.urgency_score <= 60
      ).length;
      if (active > 0) {
        links.push({ source: manager, target: 'Active & Healthy', value: active });
      }

      // Lost
      const lost = managerOrgs.filter(o => o.org_lifecycle_stage === 'churned').length;
      if (lost > 0) {
        links.push({ source: manager, target: 'Lost', value: lost });
      }
    });

    return { nodes, links };
  }, [allOrgs]);

  // Pagination
  const totalPages = Math.ceil(orgs.length / ITEMS_PER_PAGE);
  const paginatedOrgs = orgs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading || authLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-accent-50/10 to-success-50/10 overflow-x-hidden">
      {/* Main Content - Professional Layout */}
      <div className="relative pt-6 px-6 max-w-7xl mx-auto pb-12 space-y-6">
        {/* Filter Bar - Inline Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {/* Left side - Portfolio toggle or Active Filters heading */}
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {accessControl === 'portfolio' ? 'My Portfolio' : 'Active Filters'}
              </h3>
              {(filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length) === 0 && accessControl === 'all' && (
                <span className="text-xs text-neutral-400 italic">No filters applied - showing all trials</span>
              )}
            </div>

            {/* Right side - Filter button and All/Portfolio toggle */}
            <div className="flex items-center gap-2">
              {/* Clear All Button */}
              {(filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length) > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-accent-600 hover:text-accent-700 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-accent-50"
                >
                  Clear all
                </button>
              )}

              {/* View Toggle */}
              <div className="glass-card flex overflow-hidden p-1">
                <button
                  onClick={() => setAccessControl('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    accessControl === 'all'
                      ? 'bg-accent-500 text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setAccessControl('portfolio')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    accessControl === 'portfolio'
                      ? 'bg-accent-500 text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  My Portfolio
                </button>
              </div>

              {/* Filter Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  showFilters
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'glass-card hover:shadow-glass-lg'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {(filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length) > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-white text-accent-600 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
                  >
                    {filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>

          {/* Active Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Lifecycle Stage Chips */}
            {filters.lifecycleStages.map(stage => (
              <motion.button
                key={`stage-${stage}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => toggleFilter('lifecycleStages', stage)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-700 hover:bg-accent-200 transition-colors cursor-pointer"
              >
                <span>Stage: {stage}</span>
                <X className="w-3 h-3" />
              </motion.button>
            ))}

            {/* Trial Status Chips */}
            {filters.trialStatuses.map(status => (
              <motion.button
                key={`status-${status}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => toggleFilter('trialStatuses', status)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success-100 text-success-700 hover:bg-success-200 transition-colors cursor-pointer"
              >
                <span>Status: {status}</span>
                <X className="w-3 h-3" />
              </motion.button>
            ))}

            {/* Domain Chips */}
            {filters.domains.map(domain => (
              <motion.button
                key={`domain-${domain}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => toggleFilter('domains', domain)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
              >
                <span>{domain}</span>
                <X className="w-3 h-3" />
              </motion.button>
            ))}

            {/* Account Manager Chips */}
            {filters.accountManagers.map(manager => (
              <motion.button
                key={`manager-${manager}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => toggleFilter('accountManagers', manager)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
              >
                <span>AM: {manager}</span>
                <X className="w-3 h-3" />
              </motion.button>
            ))}

            {/* Show "No filters" message if empty */}
            {(filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length) === 0 && (
              <span className="text-xs text-neutral-400 italic">No filters applied - showing all trials</span>
            )}
          </div>

          {/* Expandable Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="glass-card p-4">
                  <div className="grid grid-cols-4 gap-3">
                    {/* Quick add filters */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Add Stage</label>
                      <div className="flex flex-wrap gap-1">
                        {LIFECYCLE_STAGES.filter(s => !filters.lifecycleStages.includes(s)).map(stage => (
                          <button
                            key={stage}
                            onClick={() => toggleFilter('lifecycleStages', stage)}
                            className="px-2 py-1 text-xs rounded-md bg-neutral-100 text-neutral-600 hover:bg-accent-100 hover:text-accent-700 transition-colors"
                          >
                            + {stage}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Add Status</label>
                      <div className="flex flex-wrap gap-1">
                        {TRIAL_STATUSES.filter(s => !filters.trialStatuses.includes(s)).slice(0, 4).map(status => (
                          <button
                            key={status}
                            onClick={() => toggleFilter('trialStatuses', status)}
                            className="px-2 py-1 text-xs rounded-md bg-neutral-100 text-neutral-600 hover:bg-success-100 hover:text-success-700 transition-colors"
                          >
                            + {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Add Domain</label>
                      <div className="flex flex-wrap gap-1">
                        {DOMAINS.filter(d => !filters.domains.includes(d)).map(domain => (
                          <button
                            key={domain}
                            onClick={() => toggleFilter('domains', domain)}
                            className="px-2 py-1 text-xs rounded-md bg-neutral-100 text-neutral-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          >
                            + {domain}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Add Manager</label>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {accountManagers.filter(m => !filters.accountManagers.includes(m)).slice(0, 6).map(manager => (
                          <button
                            key={manager}
                            onClick={() => toggleFilter('accountManagers', manager)}
                            className="px-2 py-1 text-xs rounded-md bg-neutral-100 text-neutral-600 hover:bg-purple-100 hover:text-purple-700 transition-colors"
                          >
                            + {manager}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hero Metrics Row - Material Design Elevation */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Card 1 - Trials */}
          <motion.div
            whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl p-7 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-accent-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-accent-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Trials</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-neutral-900 mb-2 tracking-tight">
              <AnimatedNumber value={orgs.length} duration={1.5} />
            </div>
            <div className="text-sm text-neutral-600 font-medium mb-4">
              <AnimatedNumber value={activeTrials} duration={1.5} />
              <span> active trials</span>
            </div>
            <div className="pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-success-600" />
                <span className="font-bold text-success-600">+12%</span>
                <span className="text-neutral-500">vs last week</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2 - Users */}
          <motion.div
            whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl p-7 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-success-50 rounded-lg">
                  <Users className="w-5 h-5 text-success-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Users</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-neutral-900 mb-2 tracking-tight">
              <AnimatedNumber value={totalUsers} duration={1.5} />
            </div>
            <div className="text-sm text-neutral-600 font-medium mb-4">
              <AnimatedNumber value={totalActiveUsers} duration={1.5} />
              <span> active users</span>
            </div>
            <div className="pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-success-600" />
                <span className="font-bold text-success-600">+8%</span>
                <span className="text-neutral-500">vs last week</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3 - Engagement */}
          <motion.div
            whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl p-7 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-50 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Engagement</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-neutral-900 mb-2 tracking-tight">
              <AnimatedNumber value={avgEngagement} decimals={1} duration={1.5} suffix="%" />
            </div>
            <div className="text-sm text-neutral-600 font-medium mb-4">
              Avg across trials
            </div>
            <div className="pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingDown className="w-3.5 h-3.5 text-accent-600" />
                <span className="font-bold text-accent-600">-3%</span>
                <span className="text-neutral-500">vs last week</span>
              </div>
            </div>
          </motion.div>

          {/* Card 4 - Conversion */}
          <motion.div
            whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl p-7 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Conversion</span>
              </div>
            </div>
            <div className="text-4xl font-bold text-neutral-900 mb-2 tracking-tight">
              <AnimatedNumber value={conversionRate} decimals={1} duration={1.5} suffix="%" />
            </div>
            <div className="text-sm text-neutral-600 font-medium mb-4">
              Trial to customer
            </div>
            <div className="pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-success-600" />
                <span className="font-bold text-success-600">+5%</span>
                <span className="text-neutral-500">vs last week</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Section - Material Design */}
        <div className="space-y-6">
          {/* Trial Activity Timeline - Hero Chart */}
          {timeSeriesData.length > 0 && timeSeriesData.some(d => d.trials > 0 || d.users > 0 || d.active > 0) ? (
            <div className="p-6 rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl" style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">Platform Growth Timeline</h3>
                  <p className="text-xs text-neutral-500 mt-1">Track platform growth with key metrics over time</p>
                </div>
                <div className="flex border border-neutral-200 rounded-lg overflow-hidden">
                  {(['7d', '14d', '30d'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        period === p
                          ? 'bg-gray-900 text-white'
                          : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                    labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: 4 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
                  <Line type="monotone" dataKey="trials" stroke="#00BFFF" strokeWidth={3} name="Trials" dot={false} />
                  <Line type="monotone" dataKey="users" stroke="#7B68EE" strokeWidth={3} name="Users" dot={false} />
                  <Line type="monotone" dataKey="active" stroke="#06D6A0" strokeWidth={3} name="Active Users" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white shadow-lg" style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-neutral-900">Platform Growth Timeline</h3>
                <p className="text-xs text-neutral-500 mt-1">Track platform growth with key metrics over time</p>
              </div>
              <div className="flex flex-col items-center justify-center py-16">
                <Activity className="w-12 h-12 text-blue-300 mb-3" />
                <p className="text-lg font-medium text-gray-900 mb-2">Timeline warming up...</p>
                <p className="text-sm text-gray-500">Activity data will appear as trials progress over time</p>
              </div>
            </div>
          )}

          {/* Two Column Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Engagement Distribution */}
            {engagementDistribution.some(d => d.count > 0) ? (
              <div className="p-6 rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Engagement Levels</h3>
                  <p className="text-xs text-neutral-500 mt-1">Organizations by engagement range</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={engagementDistribution} layout="vertical">
                    <defs>
                      <linearGradient id="engagementGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00BFFF" />
                        <stop offset="100%" stopColor="#7B68EE" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                    <YAxis dataKey="range" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" width={70} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                      cursor={{ fill: '#f3f4f6' }}
                    />
                    <Bar dataKey="count" fill="url(#engagementGradient)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white shadow-lg" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Engagement Levels</h3>
                  <p className="text-xs text-neutral-500 mt-1">Organizations by engagement range</p>
                </div>
                <ChartEmptyState
                  title="Engagement Levels"
                  hasUnfilteredData={unfilteredEngagementDistribution.some(d => d.count > 0)}
                  hasFilteredData={engagementDistribution.some(d => d.count > 0)}
                  hasActiveFilters={(filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length) > 0}
                  onClearFilters={clearAllFilters}
                  noDataMessage="No trial organizations yet"
                  filteredMessage="No organizations match your current filter criteria"
                />
              </div>
            )}

            {/* Lifecycle Funnel */}
            {lifecycleFunnel.some(d => d.count > 0) ? (
              <div className="p-6 rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Conversion Funnel</h3>
                  <p className="text-xs text-neutral-500 mt-1">Pipeline stage progression</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={lifecycleFunnel}>
                    <defs>
                      <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7B68EE" />
                        <stop offset="100%" stopColor="#FF6B9D" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                      cursor={{ fill: '#f3f4f6' }}
                    />
                    <Bar dataKey="count" fill="url(#funnelGradient)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white shadow-lg" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Conversion Funnel</h3>
                  <p className="text-xs text-neutral-500 mt-1">Pipeline stage progression</p>
                </div>
                <ChartEmptyState
                  title="Conversion Funnel"
                  icon={TrendingUp}
                  hasUnfilteredData={false}
                  hasFilteredData={false}
                  hasActiveFilters={false}
                  noDataMessage="No organizations in the pipeline yet"
                />
              </div>
            )}
          </div>

          {/* Two Column Charts Row 2 */}
          <div className="grid grid-cols-2 gap-6">
            {/* Domain Distribution */}
            {domainData.length > 0 ? (
              <div className="p-6 rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Domain Split</h3>
                  <p className="text-xs text-neutral-500 mt-1">Trials by industry vertical</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={domainData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {domainData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white shadow-lg" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Domain Split</h3>
                  <p className="text-xs text-neutral-500 mt-1">Trials by industry vertical</p>
                </div>
                <ChartEmptyState
                  title="Domain Split"
                  icon={Building2}
                  hasUnfilteredData={unfilteredDomainData.length > 0}
                  hasFilteredData={domainData.length > 0}
                  hasActiveFilters={(filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length) > 0}
                  onClearFilters={clearAllFilters}
                  noDataMessage="No domains assigned to trials yet"
                  filteredMessage="No trials match your current filter criteria"
                />
              </div>
            )}

            {/* Ticket Activity Timeline */}
            {ticketActivityData.some(d => d.critical > 0 || d.high > 0 || d.medium > 0 || d.low > 0) ? (
              <div className="p-6 rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Support Activity Timeline</h3>
                  <p className="text-xs text-neutral-500 mt-1">Daily ticket creation by priority over last 30 days</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={ticketActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="critical" stackId="1" stroke="#FF6F61" fill="#FF6F61" fillOpacity={0.8} name="Critical" />
                    <Area type="monotone" dataKey="high" stackId="1" stroke="#FFB627" fill="#FFB627" fillOpacity={0.8} name="High" />
                    <Area type="monotone" dataKey="medium" stackId="1" stroke="#06D6A0" fill="#06D6A0" fillOpacity={0.8} name="Medium" />
                    <Area type="monotone" dataKey="low" stackId="1" stroke="#00BFFF" fill="#00BFFF" fillOpacity={0.8} name="Low" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white shadow-lg" style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-neutral-900">Support Activity Timeline</h3>
                  <p className="text-xs text-neutral-500 mt-1">Daily ticket creation by priority over last 30 days</p>
                </div>
                <ChartEmptyState
                  title="Support Activity Timeline"
                  icon={Activity}
                  hasUnfilteredData={false}
                  hasFilteredData={false}
                  hasActiveFilters={false}
                  noDataMessage="No support tickets created in the last 30 days"
                />
              </div>
            )}
          </div>

          {/* Sankey Diagram - Account Manager Flow */}
          {sankeyData.links.length > 0 ? (
            <div className="p-6 rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl" style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-neutral-900">Trial Success Journey</h3>
                <p className="text-xs text-neutral-500 mt-1">Domain → Engagement Level → Account Manager → Outcome</p>
              </div>
              <div style={{ height: 500 }}>
                <ResponsiveSankey
                  data={sankeyData}
                  margin={{ top: 30, right: 180, bottom: 30, left: 180 }}
                  align="justify"
                  colors={{ scheme: 'category10' }}
                  nodeOpacity={1}
                  nodeHoverOthersOpacity={0.35}
                  nodeThickness={20}
                  nodeSpacing={32}
                  nodeBorderWidth={0}
                  nodeBorderColor={{
                    from: 'color',
                    modifiers: [['darker', 0.8]]
                  }}
                  nodeBorderRadius={3}
                  linkOpacity={0.5}
                  linkHoverOthersOpacity={0.1}
                  linkContract={3}
                  enableLinkGradient={true}
                  labelPosition="outside"
                  labelOrientation="horizontal"
                  labelPadding={20}
                  labelTextColor="#374151"
                  legends={[
                    {
                      anchor: 'bottom-right',
                      direction: 'column',
                      translateX: 130,
                      itemWidth: 100,
                      itemHeight: 14,
                      itemDirection: 'right-to-left',
                      itemsSpacing: 2,
                      itemTextColor: '#6b7280',
                      symbolSize: 14,
                      effects: [
                        {
                          on: 'hover',
                          style: {
                            itemTextColor: '#111827'
                          }
                        }
                      ]
                    }
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white shadow-lg" style={{
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-neutral-900">Trial Success Journey</h3>
                <p className="text-xs text-neutral-500 mt-1">Domain → Engagement Level → Account Manager → Outcome</p>
              </div>
              <ChartEmptyState
                title="Trial Success Journey"
                icon={TrendingUp}
                hasUnfilteredData={unfilteredSankeyData.links.length > 0}
                hasFilteredData={sankeyData.links.length > 0}
                hasActiveFilters={(filters.lifecycleStages.length + filters.trialStatuses.length + filters.domains.length + filters.accountManagers.length) > 0}
                onClearFilters={clearAllFilters}
                noDataMessage="Flow analysis requires multiple trials across domains"
                filteredMessage="No trial flow matches your current filter criteria"
              />
            </div>
          )}
        </div>

      </div>

      {/* Full-Screen Chart Focus Mode */}
      <AnimatePresence>
        {focusedChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-8"
            onClick={() => setFocusedChart(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="glass-card w-full max-w-6xl p-8"
              style={{
                backdropFilter: 'blur(40px) saturate(180%)',
                background: 'rgba(255, 255, 255, 0.95)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-900">
                  {focusedChart === 'timeline' && 'Activity Timeline'}
                  {focusedChart === 'engagement' && 'Engagement Levels'}
                  {focusedChart === 'funnel' && 'Conversion Funnel'}
                  {focusedChart === 'domain' && 'Domain Split'}
                  {focusedChart === 'events' && 'Event Activity'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setFocusedChart(null)}
                  className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-6 h-6 text-neutral-600" />
                </motion.button>
              </div>
              <div className="text-sm text-neutral-600 mb-4">
                Full-screen view for detailed analysis
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
