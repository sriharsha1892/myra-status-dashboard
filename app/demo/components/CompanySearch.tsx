'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KnownCompany,
  searchCompanies,
  getRevenueDisplay,
  INDUSTRY_CONFIG,
} from '../data/companies';
import { createUnknownCompany, getIndustryName } from '../data/industry-patterns';
import { cn } from '@/lib/utils';

export interface SelectedCompany {
  name: string;
  industry: string;
  industryName: string;
  ticker?: string;
  revenueTier: string;
  headquarters: string;
  employeeRange: string;
  isKnown: boolean;
}

interface CompanySearchProps {
  onCompanySelect: (company: SelectedCompany) => void;
  onSkipToDemo: () => void;
}

export default function CompanySearch({
  onCompanySelect,
  onSkipToDemo,
}: CompanySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnownCompany[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search as user types
  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = searchCompanies(query, 6);
      setResults(searchResults);
      setShowResults(true);
      setHighlightedIndex(-1);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === results.length) {
        // "Use this name" option
        handleCustomCompany();
      } else if (highlightedIndex >= 0 && results[highlightedIndex]) {
        handleSelectKnownCompany(results[highlightedIndex]);
      } else if (query.length >= 2) {
        handleCustomCompany();
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleSelectKnownCompany = (company: KnownCompany) => {
    const industryConfig = INDUSTRY_CONFIG[company.industry];
    onCompanySelect({
      name: company.name,
      industry: company.industry,
      industryName: industryConfig?.name || company.industry,
      ticker: company.ticker,
      revenueTier: company.revenueTier,
      headquarters: company.headquarters,
      employeeRange: company.employeeRange,
      isKnown: true,
    });
  };

  const handleCustomCompany = () => {
    if (query.length < 2) return;

    const inferredCompany = createUnknownCompany(query);
    const industryName = getIndustryName(inferredCompany.industry);

    onCompanySelect({
      name: inferredCompany.name,
      industry: inferredCompany.industry,
      industryName,
      revenueTier: inferredCompany.revenueTier,
      headquarters: '',
      employeeRange: '',
      isKnown: false,
    });
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Who are we presenting to today?
          </h1>
          <p className="text-lg text-white/60">
            Start typing to find your prospect
          </p>
        </motion.div>

        {/* Search Input */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && setShowResults(true)}
              placeholder="e.g., Pfizer, Goldman Sachs, Microsoft..."
              className={cn(
                'w-full px-6 py-5 text-xl rounded-2xl',
                'bg-white/[0.05] border-2 border-white/20',
                'text-white placeholder-white/30',
                'focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.08]',
                'transition-all duration-300'
              )}
              autoFocus
            />

            {/* Search icon */}
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && (query.length >= 2) && (
              <motion.div
                ref={resultsRef}
                className="absolute top-full left-0 right-0 mt-2 z-50"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Known companies */}
                  {results.map((company, index) => (
                    <motion.button
                      key={company.name}
                      className={cn(
                        'w-full px-5 py-4 text-left',
                        'border-b border-white/10 last:border-b-0',
                        'transition-colors duration-150',
                        highlightedIndex === index
                          ? 'bg-violet-500/20'
                          : 'hover:bg-white/[0.05]'
                      )}
                      onClick={() => handleSelectKnownCompany(company)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Company Initial */}
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          'text-xl font-bold text-white',
                          `bg-gradient-to-br ${INDUSTRY_CONFIG[company.industry]?.accent || 'from-violet-500 to-purple-500'}`
                        )}>
                          {company.name.charAt(0)}
                        </div>

                        {/* Company Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-semibold text-white truncate">
                              {company.name}
                            </span>
                            {company.ticker && (
                              <span className="text-xs font-medium text-white/40 bg-white/10 px-2 py-0.5 rounded">
                                {company.ticker}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-white/50">
                            <span>{INDUSTRY_CONFIG[company.industry]?.name}</span>
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            <span>{getRevenueDisplay(company.revenueTier)}</span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="text-white/30 self-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </motion.button>
                  ))}

                  {/* Custom company option */}
                  <motion.button
                    className={cn(
                      'w-full px-5 py-4 text-left',
                      'transition-colors duration-150',
                      highlightedIndex === results.length
                        ? 'bg-violet-500/20'
                        : 'hover:bg-white/[0.05]',
                      results.length > 0 && 'border-t border-white/20'
                    )}
                    onClick={handleCustomCompany}
                    onMouseEnter={() => setHighlightedIndex(results.length)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 text-white/60">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-medium text-white">
                          Use &ldquo;{query}&rdquo;
                        </div>
                        <div className="text-sm text-white/50">
                          Continue with this company name
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Skip Option */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button
            onClick={onSkipToDemo}
            className="text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            Skip to Product Demo
          </button>
        </motion.div>
      </div>
    </div>
  );
}
