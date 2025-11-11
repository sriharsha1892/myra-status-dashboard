'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface InsightsViewProps {
  orgId: string;
}

interface PainPoint {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reported_count: number;
  affected_orgs: string[];
  status: 'open' | 'in_progress' | 'resolved';
  first_reported_at: string;
  last_reported_at: string;
}

interface Learning {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
  reported_count: number;
  source_orgs: string[];
  actionable: boolean;
  implemented: boolean;
  created_at: string;
}

export default function InsightsView({ orgId }: InsightsViewProps) {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pain_points' | 'learnings'>('pain_points');

  useEffect(() => {
    fetchInsights();
  }, [orgId]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const [painPointsRes, learningsRes] = await Promise.all([
        fetch(`/api/pain-points?limit=50`),
        fetch(`/api/learnings?limit=50`),
      ]);

      const painPointsData = await painPointsRes.json();
      const learningsData = await learningsRes.json();

      if (painPointsData.success) {
        setPainPoints(painPointsData.data);
      }
      if (learningsData.success) {
        setLearnings(learningsData.data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const painPointStats = {
    total: painPoints.length,
    open: painPoints.filter(pp => pp.status === 'open').length,
    critical: painPoints.filter(pp => pp.severity === 'critical').length,
    avgReports: painPoints.length > 0
      ? Math.round(painPoints.reduce((sum, pp) => sum + pp.reported_count, 0) / painPoints.length)
      : 0,
  };

  const learningStats = {
    total: learnings.length,
    actionable: learnings.filter(l => l.actionable).length,
    implemented: learnings.filter(l => l.implemented).length,
    highImpact: learnings.filter(l => l.impact === 'high').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Tab Selector */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pain_points')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'pain_points'
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Pain Points
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              {painPointStats.total}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('learnings')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'learnings'
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Learnings
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              {learningStats.total}
            </span>
          </div>
        </button>
      </div>

      {/* Pain Points Tab */}
      {activeTab === 'pain_points' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Pain Points</span>
                <BarChart3 className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{painPointStats.total}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Open Issues</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{painPointStats.open}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Critical</span>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">{painPointStats.critical}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Reports</span>
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{painPointStats.avgReports}</p>
            </div>
          </div>

          {/* Pain Points List */}
          <div className="space-y-3">
            {painPoints.map((painPoint, index) => (
              <motion.div
                key={painPoint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(painPoint.severity)}`}>
                        {painPoint.severity}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(painPoint.status)}`}>
                        {painPoint.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {painPoint.category}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{painPoint.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{painPoint.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Reported {painPoint.reported_count} time{painPoint.reported_count !== 1 ? 's' : ''}</span>
                      <span>Affects {painPoint.affected_orgs.length} org{painPoint.affected_orgs.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.div>
            ))}
          </div>

          {painPoints.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No pain points yet</p>
              <p className="text-sm mt-1">Pain points will appear here as you import CRM notes</p>
            </div>
          )}
        </div>
      )}

      {/* Learnings Tab */}
      {activeTab === 'learnings' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Learnings</span>
                <Lightbulb className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{learningStats.total}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Actionable</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{learningStats.actionable}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Implemented</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{learningStats.implemented}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">High Impact</span>
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-accent-600">{learningStats.highImpact}</p>
            </div>
          </div>

          {/* Learnings List */}
          <div className="space-y-3">
            {learnings.map((learning, index) => (
              <motion.div
                key={learning.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(learning.impact)}`}>
                        {learning.impact} impact
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {learning.category}
                      </span>
                      {learning.actionable && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Actionable
                        </span>
                      )}
                      {learning.implemented && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Implemented
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{learning.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{learning.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Reported {learning.reported_count} time{learning.reported_count !== 1 ? 's' : ''}</span>
                      <span>From {learning.source_orgs.length} org{learning.source_orgs.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.div>
            ))}
          </div>

          {learnings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No learnings yet</p>
              <p className="text-sm mt-1">Learnings will appear here as you import CRM notes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'medium':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'high':
      return 'bg-accent-100 text-accent-700';
    case 'medium':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
