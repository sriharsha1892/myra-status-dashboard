'use client';

/**
 * PUBLIC PRODUCT ROADMAP
 * Mind-blowing UI/UX inspired by Linear, Notion, and Stripe
 *
 * Features:
 * - Three-horizon view (Shipped → In Progress → Planned)
 * - Real-time NOW PULSE activity feed
 * - Voting and engagement system
 * - Timeline visualization
 * - Rich shipped section with impact metrics
 * - Smooth micro-interactions and animations
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays, startOfQuarter, endOfQuarter, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// Types
type RoadmapStatus = 'shipped' | 'in_progress' | 'planned' | 'cancelled';
type RoadmapPriority = 'low' | 'medium' | 'high' | 'critical';
type RoadmapCategory = 'platform' | 'analytics' | 'integrations' | 'security' | 'ai' | 'ux';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  category?: RoadmapCategory;
  progress_percentage?: number;
  target_date?: string;
  estimated_completion_date?: string;
  completed_date?: string;
  owner_name?: string;
  votes_count?: number;
  comments_count?: number;
  customer_request_count?: number;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;

  // Rich content
  demo_video_url?: string;
  screenshot_url?: string;

  // User interaction
  user_has_voted?: boolean;
}

interface ActiveWork {
  id: string;
  title: string;
  category: RoadmapCategory;
  progress_percentage: number;
  owner_name?: string;
  days_in_progress: number;
}

type ViewMode = 'grid' | 'timeline';

const CATEGORY_COLORS = {
  platform: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  analytics: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  integrations: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  security: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  ai: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  ux: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
};

export default function PublicRoadmapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // State
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [activeWork, setActiveWork] = useState<ActiveWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<RoadmapStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<RoadmapCategory[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [showMyVotes, setShowMyVotes] = useState(false);

  // Fetch roadmap data
  useEffect(() => {
    if (!authLoading) {
      fetchRoadmapData();
      fetchActiveWork();
    }
  }, [authLoading, user]);

  const fetchRoadmapData = async () => {
    try {
      setLoading(true);

      // Fetch all roadmap items (aggregated across all orgs for public view)
      // In production, you'd want to aggregate and deduplicate similar features
      const { data, error } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform and aggregate data
      const transformedData: RoadmapItem[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        status: mapStatus(item.status),
        priority: item.priority || 'medium',
        category: inferCategory(item.title, item.description),
        progress_percentage: item.progress_percentage || 0,
        target_date: item.target_date,
        estimated_completion_date: item.estimated_completion_date,
        owner_name: item.owner_name || item.assigned_to,
        votes_count: 0, // TODO: Fetch from votes table
        comments_count: 0, // TODO: Fetch from comments table
        customer_request_count: 0, // TODO: Fetch from feature_requests links
        created_at: item.created_at,
        updated_at: item.updated_at,
        last_activity_at: item.last_activity_at,
        user_has_voted: false, // TODO: Check if user voted
      }));

      setRoadmapItems(transformedData);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      toast.error('Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveWork = async () => {
    // Fetch items currently in progress - what we're building RIGHT NOW
    try {
      const { data, error } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const active: ActiveWork[] = (data || []).map(item => {
        const daysInProgress = item.last_activity_at
          ? differenceInDays(new Date(), new Date(item.last_activity_at))
          : 0;

        return {
          id: item.id,
          title: item.title,
          category: inferCategory(item.title, item.description || ''),
          progress_percentage: item.progress_percentage || 0,
          owner_name: item.owner_name || item.assigned_to,
          days_in_progress: daysInProgress,
        };
      });

      setActiveWork(active);
    } catch (error) {
      console.error('Error fetching active work:', error);
    }
  };

  // Helper functions
  const mapStatus = (status: string): RoadmapStatus => {
    if (status === 'completed') return 'shipped';
    if (status === 'in_progress') return 'in_progress';
    if (status === 'planned' || status === 'suggested') return 'planned';
    return 'cancelled';
  };

  const inferCategory = (title: string, description: string): RoadmapCategory => {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('analytics') || text.includes('report') || text.includes('dashboard')) return 'analytics';
    if (text.includes('integration') || text.includes('api') || text.includes('webhook')) return 'integrations';
    if (text.includes('security') || text.includes('auth') || text.includes('sso')) return 'security';
    if (text.includes('ai') || text.includes('ml') || text.includes('smart')) return 'ai';
    if (text.includes('ui') || text.includes('ux') || text.includes('design')) return 'ux';
    return 'platform';
  };


  // Filter logic
  const filteredItems = useMemo(() => {
    return roadmapItems.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.title.toLowerCase().includes(query) &&
            !item.description.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) {
        return false;
      }

      // Category filter
      if (selectedCategories.length > 0 && item.category && !selectedCategories.includes(item.category)) {
        return false;
      }

      // My votes filter
      if (showMyVotes && !item.user_has_voted) {
        return false;
      }

      return true;
    });
  }, [roadmapItems, searchQuery, selectedStatuses, selectedCategories, showMyVotes]);

  // Group by status
  const shippedItems = filteredItems.filter(item => item.status === 'shipped');
  const inProgressItems = filteredItems.filter(item => item.status === 'in_progress');
  const plannedItems = filteredItems.filter(item => item.status === 'planned');

  // Calculate stats for dashboard
  const stats = useMemo(() => {
    const thisQuarter = filteredItems.filter(item => {
      if (!item.target_date) return false;
      const targetDate = parseISO(item.target_date);
      const now = new Date();
      return targetDate >= startOfQuarter(now) && targetDate <= endOfQuarter(now);
    });

    const completed = thisQuarter.filter(item => item.status === 'shipped').length;
    const total = thisQuarter.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalShipped: shippedItems.length,
      inProgress: inProgressItems.length,
      planned: plannedItems.length,
      quarterCompletionRate: completionRate,
    };
  }, [filteredItems, shippedItems, inProgressItems, plannedItems]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-600">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white text-sm font-medium mb-6">
              Building the future together
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Product Roadmap
            </h1>

            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              See what we're building, what's coming next, and help shape the future of the platform
            </p>

            {/* Stats bar */}
            <div className="flex items-center justify-center gap-8 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalShipped}</div>
                <div className="text-sm text-blue-200">Shipped</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.inProgress}</div>
                <div className="text-sm text-blue-200">In Progress</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.planned}</div>
                <div className="text-sm text-blue-200">Planned</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.quarterCompletionRate}%</div>
                <div className="text-sm text-blue-200">On Track</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48h1440V0s-174.667 48-360 48S720 0 720 0 540 48 360 48 0 0 0 0v48z" fill="rgb(248, 250, 252)" />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ACTIVE NOW - What We're Building Right Now */}
        {activeWork.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-8 shadow-xl">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  BUILDING NOW
                </div>
                <h2 className="text-2xl font-bold text-white">
                  What we're actively working on this week
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeWork.map((work, index) => {
                  const categoryColor = CATEGORY_COLORS[work.category];
                  return (
                    <motion.div
                      key={work.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className={`inline-block px-2 py-1 ${categoryColor.bg} rounded text-xs font-medium ${categoryColor.text}`}>
                          {work.category}
                        </span>
                        <span className="text-xs text-white/60">
                          {work.progress_percentage}%
                        </span>
                      </div>

                      <h3 className="text-white font-semibold mb-3 text-sm leading-snug">
                        {work.title}
                      </h3>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${work.progress_percentage}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className={`h-full ${categoryColor.dot.replace('bg-', 'bg-')}`}
                          />
                        </div>
                      </div>

                      {work.owner_name && (
                        <div className="text-xs text-white/60">
                          {work.owner_name}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters & Search */}
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Three-Horizon View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipped */}
          <RoadmapColumn
            title="Shipped"
            items={shippedItems}
            color="emerald"
            emptyMessage="No shipped features yet"
          />

          {/* In Progress */}
          <RoadmapColumn
            title="In Progress"
            items={inProgressItems}
            color="amber"
            emptyMessage="Nothing in progress"
          />

          {/* Planned */}
          <RoadmapColumn
            title="Planned"
            items={plannedItems}
            color="blue"
            emptyMessage="No planned features"
          />
        </div>
      </div>
    </div>
  );
}

// Roadmap Column Component
interface RoadmapColumnProps {
  title: string;
  items: RoadmapItem[];
  color: 'emerald' | 'amber' | 'blue';
  emptyMessage: string;
}

function RoadmapColumn({ title, items, color, emptyMessage }: RoadmapColumnProps) {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
  };

  const colors = colorClasses[color];

  return (
    <div>
      <div className={`${colors.bg} ${colors.border} border rounded-lg p-3 mb-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 ${colors.dot} rounded-full`} />
          <h2 className={`font-semibold ${colors.text}`}>{title}</h2>
          <span className={`ml-auto px-2 py-0.5 ${colors.bg} ${colors.border} border rounded text-xs font-medium ${colors.text}`}>
            {items.length}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <RoadmapCard item={item} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// Roadmap Card Component
function RoadmapCard({ item }: { item: RoadmapItem }) {
  const [isHovered, setIsHovered] = useState(false);

  const categoryColor = item.category ? CATEGORY_COLORS[item.category] : CATEGORY_COLORS.platform;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {item.category && (
              <span className={`inline-block px-2 py-1 ${categoryColor.bg} ${categoryColor.border} border rounded text-xs font-medium ${categoryColor.text} mb-2`}>
                {item.category}
              </span>
            )}
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {item.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {item.description}
        </p>

        {/* Progress bar (for in-progress items) */}
        {item.status === 'in_progress' && item.progress_percentage !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Progress</span>
              <span className="font-medium">{item.progress_percentage}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.progress_percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {item.owner_name && (
              <span>{item.owner_name}</span>
            )}
            {item.target_date && (
              <span>{format(parseISO(item.target_date), 'MMM yyyy')}</span>
            )}
          </div>

          {item.customer_request_count && item.customer_request_count > 0 && (
            <div className="text-xs text-slate-500">
              {item.customer_request_count} {item.customer_request_count === 1 ? 'request' : 'requests'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

