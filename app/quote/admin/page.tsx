'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { isQuoteAdminAuthenticated, setQuoteAdminAuthenticated } from '@/lib/quote/auth';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';

interface Quote {
  id: string;
  quote_reference: string;
  version: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_title: string | null;
  quote_date: string;
  valid_until: string;
  currency: string;
  total_value: string;
  line_items: Array<{
    term: string;
    users: string;
    consultingHours: string;
    investment: string;
  }>;
  prepared_by: string;
  deal_context: Record<string, string>;
  created_at: string;
}

interface QuoteStats {
  totalQuotes: number;
  byAM: Record<string, { count: number; totalValue: number }>;
  byCurrency: Record<string, number>;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

function formatCurrency(value: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  if (currency === 'INR') {
    return `${symbol}${value.toLocaleString('en-IN')}`;
  }
  return `${symbol}${value.toLocaleString('en-US')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function QuoteAdminPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Filters
  const [preparedBy, setPreparedBy] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Check auth on mount
  useEffect(() => {
    setIsAuthenticated(isQuoteAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = useCallback(() => {
    setQuoteAdminAuthenticated();
    setIsAuthenticated(true);
  }, []);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (preparedBy) params.set('preparedBy', preparedBy);
      if (companyName) params.set('companyName', companyName);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', pageSize.toString());
      params.set('offset', (currentPage * pageSize).toString());

      const response = await fetch(`/api/quote/admin?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setQuotes(data.quotes);
        setStats(data.stats);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch quotes');
      }
    } catch (err) {
      setError('Failed to load quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [preparedBy, companyName, startDate, endDate, currentPage]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleSearch = () => {
    setCurrentPage(0);
    fetchQuotes();
  };

  const handleClearFilters = () => {
    setPreparedBy('');
    setCompanyName('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(0);
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pageSize) : 0;

  // Show loading state while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return <QuoteAdminAuthModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-violet-50/30 to-neutral-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/quote"
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Back to Quote Generator"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-500" />
            </Link>
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-neutral-900">
                Quote Admin
              </h1>
              <p className="text-xs text-neutral-500">View all generated quotes</p>
            </div>
          </div>
          <button
            onClick={fetchQuotes}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-neutral-900">{stats.totalQuotes}</p>
                  <p className="text-sm text-neutral-500">Total Quotes</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {Object.keys(stats.byAM).length}
                  </p>
                  <p className="text-sm text-neutral-500">Account Managers</p>
                </div>
              </div>
            </div>

            {Object.entries(stats.byCurrency).slice(0, 2).map(([currency, total]) => (
              <div key={currency} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-neutral-900">
                      {formatCurrency(total, currency)}
                    </p>
                    <p className="text-sm text-neutral-500">Total ({currency})</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-neutral-500" />
            <h2 className="font-medium text-neutral-700">Filters</h2>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Account Manager</label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500"
                placeholder="Search AM..."
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500"
                placeholder="Search company..."
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* AM Stats */}
        {stats && Object.keys(stats.byAM).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-neutral-500" />
              <h2 className="font-medium text-neutral-700">Performance by Account Manager</h2>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {Object.entries(stats.byAM)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([am, data]) => (
                  <div
                    key={am}
                    className="p-3 bg-neutral-50 rounded-lg border border-neutral-100"
                  >
                    <p className="font-medium text-neutral-800 truncate">{am || 'Unknown'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-neutral-600">{data.count} quotes</span>
                      <span className="text-xs text-neutral-500">
                        ${data.totalValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quotes Table */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No quotes found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Reference</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Company</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Contact</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Value</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">AM</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote, index) => (
                      <tr
                        key={quote.id}
                        className={`border-b border-neutral-100 hover:bg-neutral-50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-violet-600">
                            {quote.quote_reference}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-800">{quote.company_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-neutral-700">{quote.contact_name}</p>
                          <p className="text-xs text-neutral-500">{quote.contact_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-neutral-700">{formatDate(quote.quote_date)}</p>
                          <p className="text-xs text-neutral-500">
                            Valid until {formatDate(quote.valid_until)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-neutral-800">
                            {formatCurrency(parseFloat(quote.total_value), quote.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-neutral-700">{quote.prepared_by}</span>
                        </td>
                        <td className="px-4 py-3">
                          {quote.version > 1 ? (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                              v{quote.version}
                            </span>
                          ) : (
                            <span className="text-neutral-400">v1</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
                  <p className="text-sm text-neutral-600">
                    Showing {pagination.offset + 1}-
                    {Math.min(pagination.offset + pageSize, pagination.total)} of{' '}
                    {pagination.total} quotes
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="p-2 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-neutral-600">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={!pagination.hasMore}
                      className="p-2 rounded-lg border border-neutral-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
