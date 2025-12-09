'use client';

/**
 * Global Search Component with Cmd+K Keyboard Shortcut
 * Unified search across timeline events, trials, users, and resources
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, User, Users, MessageSquare, FileText, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'timeline_event' | 'trial' | 'user' | 'resource_discussion' | 'resource_question';
  title: string;
  description?: string;
  url: string;
  relevance_score: number;
  match_reasons: string[];
  metadata?: Record<string, any>;
}

interface CategorizedResults {
  timeline: SearchResult[];
  trials: SearchResult[];
  users: SearchResult[];
  resources: SearchResult[];
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [categorized, setCategorized] = useState<CategorizedResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('globalSearchRecent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        // Ignore invalid data
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) return;

    const updated = [
      trimmed,
      ...recentSearches.filter(s => s !== trimmed)
    ].slice(0, 5); // Keep only 5 recent

    setRecentSearches(updated);
    localStorage.setItem('globalSearchRecent', JSON.stringify(updated));
  };

  // Keyboard shortcut: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Perform search with debouncing
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setCategorized(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/search/global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          categories: ['all'],
          limit: 30,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        setCategorized(data.categorized || null);
      } else {
        console.error('Search failed:', data.error);
        setResults([]);
        setCategorized(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setCategorized(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle query change with debouncing
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);

    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search by 300ms
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle result selection
  const selectResult = (result: SearchResult) => {
    saveRecentSearch(query);
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setCategorized(null);
  };

  // Handle recent search click
  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    performSearch(recentQuery);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    }
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'timeline_event':
        return <Clock className="w-4 h-4" />;
      case 'trial':
        return <Users className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'resource_discussion':
      case 'resource_question':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Get label for result type
  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'timeline_event':
        return 'Timeline';
      case 'trial':
        return 'Trial';
      case 'user':
        return 'User';
      case 'resource_discussion':
        return 'Discussion';
      case 'resource_question':
        return 'Q&A';
      default:
        return 'Result';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 top-0 z-[101] flex items-start justify-center p-4 sm:p-20">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[600px] flex flex-col">
          {/* Search Input */}
          <div className="relative flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search timeline, trials, users, resources..."
              className="flex-1 text-base outline-none"
            />
            {isLoading && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {!query.trim() && recentSearches.length > 0 && (
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-600 uppercase mb-2 px-2">
                  Recent Searches
                </div>
                <div className="space-y-1">
                  {recentSearches.map((recent, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentSearchClick(recent)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{recent}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!query.trim() && recentSearches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-600">
                  Search across timeline events, trials, users, and resources
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Try: "integration issues", "Acme Corp", or "John Doe"
                </p>
              </div>
            )}

            {query.trim() && !isLoading && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-600">No results found for "{query}"</p>
                <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
              </div>
            )}

            {results.length > 0 && categorized && (
              <div className="py-2">
                {/* Timeline Events */}
                {categorized.timeline.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2 px-5">
                      Timeline Events ({categorized.timeline.length})
                    </div>
                    <div className="space-y-1 px-2">
                      {categorized.timeline.map((result, idx) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={results.indexOf(result) === selectedIndex}
                          onSelect={() => selectResult(result)}
                          getIcon={getResultIcon}
                          getLabel={getResultTypeLabel}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trials */}
                {categorized.trials.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2 px-5">
                      Trial Organizations ({categorized.trials.length})
                    </div>
                    <div className="space-y-1 px-2">
                      {categorized.trials.map((result, idx) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={results.indexOf(result) === selectedIndex}
                          onSelect={() => selectResult(result)}
                          getIcon={getResultIcon}
                          getLabel={getResultTypeLabel}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Users */}
                {categorized.users.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2 px-5">
                      Users ({categorized.users.length})
                    </div>
                    <div className="space-y-1 px-2">
                      {categorized.users.map((result, idx) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={results.indexOf(result) === selectedIndex}
                          onSelect={() => selectResult(result)}
                          getIcon={getResultIcon}
                          getLabel={getResultTypeLabel}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {categorized.resources.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2 px-5">
                      Resources ({categorized.resources.length})
                    </div>
                    <div className="space-y-1 px-2">
                      {categorized.resources.map((result, idx) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={results.indexOf(result) === selectedIndex}
                          onSelect={() => selectResult(result)}
                          getIcon={getResultIcon}
                          getLabel={getResultTypeLabel}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd>
                Close
              </span>
            </div>
            {results.length > 0 && (
              <span>{results.length} results</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  getIcon: (type: string) => React.ReactNode;
  getLabel: (type: string) => string;
}

function ResultItem({ result, isSelected, onSelect, getIcon, getLabel }: ResultItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
        {getIcon(result.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
            {result.title}
          </span>
          <span className="text-xs text-gray-600 px-1.5 py-0.5 bg-gray-100 rounded">
            {getLabel(result.type)}
          </span>
        </div>
        {result.description && (
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
            {result.description}
          </p>
        )}
        {result.match_reasons.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {result.match_reasons.slice(0, 2).map((reason, idx) => (
              <span key={idx} className="text-xs text-gray-600">
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>
      {isSelected && (
        <kbd className="text-xs text-gray-600 px-1.5 py-0.5 bg-white border border-gray-300 rounded">
          ↵
        </kbd>
      )}
    </button>
  );
}
