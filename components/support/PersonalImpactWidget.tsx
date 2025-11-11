'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import {
  TrendingUp, Zap, Target, Clock, Award, ArrowRight,
  CheckCircle2, AlertCircle, Activity, Sparkles
} from 'lucide-react';

interface PersonalImpactWidgetProps {
  userId?: string;
  role?: string;
}

// Naval & Elon inspired quotes
const insights = [
  { author: 'Naval', text: 'Specific knowledge is found by pursuing your genuine curiosity.' },
  { author: 'Elon', text: 'The best part is no part. The best process is no process.' },
  { author: 'Naval', text: 'Leverage is a force multiplier for your judgment.' },
  { author: 'Elon', text: 'If you need inspiring words, don\'t start a startup.' },
  { author: 'Naval', text: 'Clear thinker → Better decisions → Better outcomes' },
];

export default function PersonalImpactWidget({ userId, role }: PersonalImpactWidgetProps) {
  const [stats, setStats] = useState({
    activeTrials: 0,
    closedDeals: 0,
    pendingActions: 0,
    recentActivity: [] as any[],
  });
  const [contextualFeed, setContextualFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [randomInsight, setRandomInsight] = useState(insights[0]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      fetchPersonalData();
      setRandomInsight(insights[Math.floor(Math.random() * insights.length)]);
    }
  }, [userId]);

  const fetchPersonalData = async () => {
    try {
      // Fetch organizations managed by this user
      let orgsQuery = supabase
        .from('trial_organizations')
        .select('*');

      if (role?.toLowerCase() === 'account_manager') {
        orgsQuery = orgsQuery.eq('account_manager_id', userId);
      }

      const { data: orgs, error: orgsError } = await orgsQuery;
      if (orgsError) throw orgsError;

      // Build contextual feed
      const feed: any[] = [];
      const now = new Date();

      orgs?.forEach(org => {
        const daysLeft = org.trial_end_date
          ? differenceInDays(new Date(org.trial_end_date), now)
          : null;

        // Urgent: Expiring soon
        if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 3) {
          feed.push({
            type: 'urgent',
            priority: 1,
            icon: AlertCircle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            border: 'border-red-200',
            title: `${org.org_name} trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            action: 'Send extension offer',
            actionLink: `/support/trials/${org.org_id}`,
            context: 'Critical window to convert',
          });
        }

        // Important: Expiring this week
        else if (daysLeft !== null && daysLeft > 3 && daysLeft <= 7) {
          feed.push({
            type: 'important',
            priority: 2,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            title: `${org.org_name} trial ends ${format(new Date(org.trial_end_date!), 'MMM d')}`,
            action: 'Schedule follow-up',
            actionLink: `/support/trials/${org.org_id}`,
            context: `${daysLeft} days to demonstrate value`,
          });
        }

        // Good: High engagement
        if (org.engagement_score >= 75) {
          feed.push({
            type: 'positive',
            priority: 3,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-200',
            title: `${org.org_name} showing strong engagement (${org.engagement_score}%)`,
            action: 'Capitalize momentum',
            actionLink: `/support/trials/${org.org_id}`,
            context: 'High conversion probability',
          });
        }

        // Warning: Low engagement
        else if (org.engagement_score < 30 && org.trial_end_date) {
          feed.push({
            type: 'warning',
            priority: 2,
            icon: Target,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            title: `${org.org_name} needs activation (${org.engagement_score}% engaged)`,
            action: 'Identify blockers',
            actionLink: `/support/trials/${org.org_id}`,
            context: 'Risk of churn without intervention',
          });
        }
      });

      // Sort by priority
      feed.sort((a, b) => a.priority - b.priority);

      // Calculate stats
      const activeCount = orgs?.filter(o =>
        o.org_lifecycle_stage === 'trial_active'
      ).length || 0;

      const closedCount = orgs?.filter(o =>
        o.org_lifecycle_stage === 'converted'
      ).length || 0;

      const pendingCount = feed.filter(f => f.type === 'urgent' || f.type === 'important').length;

      setStats({
        activeTrials: activeCount,
        closedDeals: closedCount,
        pendingActions: pendingCount,
        recentActivity: [],
      });

      setContextualFeed(feed.slice(0, 8)); // Top 8 most important
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching personal data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center justify-center py-8">
          <Activity className="w-5 h-5 text-neutral-400 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Impact Summary - Minimal, Focused */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-neutral-900">Your Impact</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900">{stats.activeTrials === 0 ? '—' : stats.activeTrials}</div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide mt-1">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.closedDeals === 0 ? '—' : stats.closedDeals}</div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide mt-1">Closed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pendingActions === 0 ? '—' : stats.pendingActions}</div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide mt-1">Urgent</div>
          </div>
        </div>

        {/* Insight Quote */}
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-neutral-700 leading-relaxed italic">
                "{randomInsight.text}"
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">— {randomInsight.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Activity Feed */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-neutral-900">What Needs Attention</h2>
          </div>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
            Priority Focus
          </span>
        </div>

        {contextualFeed.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-xs text-neutral-600 mb-1">All caught up!</p>
            <p className="text-[10px] text-neutral-500 italic">"The best work happens in the margins"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contextualFeed.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => router.push(item.actionLink)}
                  className={`w-full text-left p-3 rounded-lg border-2 ${item.border} ${item.bg} hover:shadow-md transition-all duration-200 group`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${item.color}`}>
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-900 mb-1 leading-tight">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-neutral-600">
                          {item.context}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {item.action}
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Action Principle */}
        {contextualFeed.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <p className="text-[10px] text-neutral-500 text-center italic">
              "Focus is more about saying no to the good ideas than saying yes to the great ones"
            </p>
          </div>
        )}
      </div>

      {/* Achievement Recognition */}
      {stats.closedDeals > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-900">
                {stats.closedDeals} Deal{stats.closedDeals !== 1 ? 's' : ''} Closed
              </p>
              <p className="text-[10px] text-green-700">
                Building leverage through specific knowledge
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
