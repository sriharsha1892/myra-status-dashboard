'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Mail,
  Globe,
} from 'lucide-react';
import { isQuoteAdminAuthenticated, setQuoteAdminAuthenticated } from '@/lib/quote/auth';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';
import { useSaveGTMMetrics, useGTMMetrics } from '@/hooks/useGTMMetrics';

interface MetricInput {
  hubspot: {
    sent: string;
    reached: string;
    followed: string;
    qualified: string;
  };
  apollo: {
    contacted: string;
    responses: string;
    qualified: string;
  };
  inbound: {
    visitors_en: string;
    visitors_non_en: string;
    leads: string;
    active: string;
  };
}

const defaultMetrics: MetricInput = {
  hubspot: { sent: '', reached: '', followed: '', qualified: '' },
  apollo: { contacted: '', responses: '', qualified: '' },
  inbound: { visitors_en: '', visitors_non_en: '', leads: '', active: '' },
};

function parseNumber(val: string): number {
  // Handle K/L suffixes (e.g., 10K = 10000, 5.4L = 540000)
  const cleaned = val.trim().toUpperCase();
  if (cleaned.endsWith('K')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000;
  }
  if (cleaned.endsWith('L')) {
    return parseFloat(cleaned.slice(0, -1)) * 100000;
  }
  return parseFloat(cleaned) || 0;
}

function formatDisplayNumber(num: number): string {
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function ReportingContent() {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [metrics, setMetrics] = useState<MetricInput>(defaultMetrics);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const saveMutation = useSaveGTMMetrics();
  const { data: existingMetrics } = useGTMMetrics(30);

  // Pre-fill with existing data if available
  useEffect(() => {
    if (existingMetrics) {
      setMetrics({
        hubspot: {
          sent: existingMetrics.hubspot?.sent?.toString() || '',
          reached: existingMetrics.hubspot?.reached?.toString() || '',
          followed: existingMetrics.hubspot?.followed?.toString() || '',
          qualified: existingMetrics.hubspot?.qualified?.toString() || '',
        },
        apollo: {
          contacted: existingMetrics.apollo?.contacted?.toString() || '',
          responses: existingMetrics.apollo?.responses?.toString() || '',
          qualified: existingMetrics.apollo?.qualified?.toString() || '',
        },
        inbound: {
          visitors_en: existingMetrics.inbound?.visitors_en?.toString() || '',
          visitors_non_en: existingMetrics.inbound?.visitors_non_en?.toString() || '',
          leads: existingMetrics.inbound?.leads?.toString() || '',
          active: existingMetrics.inbound?.active?.toString() || '',
        },
      });
    }
  }, [existingMetrics]);

  const handleInputChange = (
    category: keyof MetricInput,
    field: string,
    value: string
  ) => {
    setMetrics((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const metricsData: Record<string, Record<string, number>> = {};

      // Only include categories that have at least one non-empty value
      if (Object.values(metrics.hubspot).some((v) => v !== '')) {
        metricsData.hubspot = {
          sent: parseNumber(metrics.hubspot.sent),
          reached: parseNumber(metrics.hubspot.reached),
          followed: parseNumber(metrics.hubspot.followed),
          qualified: parseNumber(metrics.hubspot.qualified),
        };
      }

      if (Object.values(metrics.apollo).some((v) => v !== '')) {
        metricsData.apollo = {
          contacted: parseNumber(metrics.apollo.contacted),
          responses: parseNumber(metrics.apollo.responses),
          qualified: parseNumber(metrics.apollo.qualified),
        };
      }

      if (Object.values(metrics.inbound).some((v) => v !== '')) {
        metricsData.inbound = {
          visitors_en: parseNumber(metrics.inbound.visitors_en),
          visitors_non_en: parseNumber(metrics.inbound.visitors_non_en),
          leads: parseNumber(metrics.inbound.leads),
          active: parseNumber(metrics.inbound.active),
        };
      }

      if (Object.keys(metricsData).length === 0) {
        throw new Error('Please enter at least one metric');
      }

      await saveMutation.mutateAsync({
        entry_date: entryDate,
        metrics: metricsData,
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/quote/admin/dashboard')}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">GTM Data Entry</h1>
                <p className="text-xs text-slate-500">Enter campaign metrics</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-700 border-none outline-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  saveStatus === 'success'
                    ? 'bg-emerald-500 text-white'
                    : saveStatus === 'error'
                    ? 'bg-rose-500 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : saveStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : saveStatus === 'success'
                  ? 'Saved!'
                  : saveStatus === 'error'
                  ? 'Error'
                  : 'Save All'}
              </button>
            </div>
          </div>
          {errorMessage && (
            <p className="mt-2 text-sm text-rose-600">{errorMessage}</p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* HubSpot Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <img
                src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png"
                alt="HubSpot"
                className="w-8 h-8 rounded-lg"
              />
              <div>
                <h2 className="text-base font-semibold text-slate-900">HubSpot</h2>
                <p className="text-xs text-slate-500">Email outreach metrics</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Sent
                </label>
                <input
                  type="text"
                  value={metrics.hubspot.sent}
                  onChange={(e) =>
                    handleInputChange('hubspot', 'sent', e.target.value)
                  }
                  placeholder="10K"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Reached
                </label>
                <input
                  type="text"
                  value={metrics.hubspot.reached}
                  onChange={(e) =>
                    handleInputChange('hubspot', 'reached', e.target.value)
                  }
                  placeholder="8.1K"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Followed
                </label>
                <input
                  type="text"
                  value={metrics.hubspot.followed}
                  onChange={(e) =>
                    handleInputChange('hubspot', 'followed', e.target.value)
                  }
                  placeholder="3.5K"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Qualified
                </label>
                <input
                  type="text"
                  value={metrics.hubspot.qualified}
                  onChange={(e) =>
                    handleInputChange('hubspot', 'qualified', e.target.value)
                  }
                  placeholder="4"
                  className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-semibold text-emerald-600 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Apollo Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <img
                src="https://www.apollo.io/favicon.ico"
                alt="Apollo"
                className="w-8 h-8 rounded-lg"
              />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Apollo</h2>
                <p className="text-xs text-slate-500">Consulting firm outreach</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Contacted
                </label>
                <input
                  type="text"
                  value={metrics.apollo.contacted}
                  onChange={(e) =>
                    handleInputChange('apollo', 'contacted', e.target.value)
                  }
                  placeholder="1.4K"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Responses
                </label>
                <input
                  type="text"
                  value={metrics.apollo.responses}
                  onChange={(e) =>
                    handleInputChange('apollo', 'responses', e.target.value)
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Qualified
                </label>
                <input
                  type="text"
                  value={metrics.apollo.qualified}
                  onChange={(e) =>
                    handleInputChange('apollo', 'qualified', e.target.value)
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-semibold text-emerald-600 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Inbound Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Inbound</h2>
                <p className="text-xs text-slate-500">mordorintelligence.com</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Visitors (EN)
                </label>
                <input
                  type="text"
                  value={metrics.inbound.visitors_en}
                  onChange={(e) =>
                    handleInputChange('inbound', 'visitors_en', e.target.value)
                  }
                  placeholder="4.8L"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Visitors (Non-EN)
                </label>
                <input
                  type="text"
                  value={metrics.inbound.visitors_non_en}
                  onChange={(e) =>
                    handleInputChange('inbound', 'visitors_non_en', e.target.value)
                  }
                  placeholder="60K"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Leads
                </label>
                <input
                  type="text"
                  value={metrics.inbound.leads}
                  onChange={(e) =>
                    handleInputChange('inbound', 'leads', e.target.value)
                  }
                  placeholder="23"
                  className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-lg font-semibold text-indigo-600 placeholder:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Active
                </label>
                <input
                  type="text"
                  value={metrics.inbound.active}
                  onChange={(e) =>
                    handleInputChange('inbound', 'active', e.target.value)
                  }
                  placeholder="2"
                  className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-semibold text-emerald-600 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-slate-100 rounded-xl p-4">
            <p className="text-sm text-slate-600">
              <strong>Tip:</strong> You can use K for thousands (e.g., 10K = 10,000) and L
              for lakhs (e.g., 5.4L = 540,000)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setIsAuthenticated(isQuoteAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setQuoteAdminAuthenticated();
    setIsAuthenticated(true);
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <QuoteAdminAuthModal onSuccess={handleAuthSuccess} />;
  }

  return <ReportingContent />;
}
