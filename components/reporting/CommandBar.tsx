'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, X, Sparkles, History, ArrowRight } from 'lucide-react';

interface QueryResult {
  type: 'quotes' | 'msas' | 'organizations' | 'mixed';
  count: number;
  totalValue?: number;
  data: Array<Record<string, unknown>>;
  interpretation: string;
  filters: Record<string, unknown>;
}

interface CommandBarProps {
  onResults?: (results: QueryResult) => void;
  onClear?: () => void;
}

const SUGGESTIONS = [
  'Show deals over $50K this month',
  'Quotes expiring this week',
  'Top 10 MSAs by value',
  'Stalled deals in pipeline',
  'Recent quotes by Sarah',
];

export default function CommandBar({ onResults, onClear }: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [results, setResults] = useState<QueryResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent queries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('reporting-recent-queries');
    if (saved) {
      try {
        setRecentQueries(JSON.parse(saved).slice(0, 5));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const saveRecentQuery = useCallback((q: string) => {
    setRecentQueries((prev) => {
      const updated = [q, ...prev.filter((item) => item !== q)].slice(0, 5);
      localStorage.setItem('reporting-recent-queries', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const executeQuery = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) return;

      setIsSearching(true);
      setShowSuggestions(false);

      try {
        const response = await fetch('/api/reporting/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        });

        if (!response.ok) {
          throw new Error('Query failed');
        }

        const data: QueryResult = await response.json();
        setResults(data);
        saveRecentQuery(searchQuery);

        if (onResults) {
          onResults(data);
        }
      } catch (err) {
        console.error('Query error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [onResults, saveRecentQuery]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      executeQuery(query);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    if (onClear) {
      onClear();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    executeQuery(suggestion);
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-neutral-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder='Ask anything... "Show deals over $50K stalled this month"'
          className="w-full pl-12 pr-20 py-3.5 bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {query && (
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
          {query && (
            <button
              onClick={() => executeQuery(query)}
              disabled={isSearching}
              className="px-3 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && !results && (
        <div className="absolute z-20 w-full mt-2 bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden">
          {recentQueries.length > 0 && (
            <div className="p-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <History className="w-3.5 h-3.5" />
                Recent
              </div>
              <div className="flex flex-wrap gap-2">
                {recentQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(q)}
                    className="px-3 py-1.5 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors truncate max-w-full"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Try asking
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-sm bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div className="mt-3 px-4 py-3 bg-violet-50 rounded-xl border border-violet-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm text-violet-900">
                {results.interpretation}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-violet-800">
                {results.count} result{results.count !== 1 ? 's' : ''}
                {results.totalValue
                  ? ` · ${formatCurrency(results.totalValue)}`
                  : ''}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-violet-600 hover:text-violet-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}
