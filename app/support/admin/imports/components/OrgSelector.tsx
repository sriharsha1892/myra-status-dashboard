'use client';

/**
 * OrgSelector Component - Glassmorphism Edition
 *
 * A searchable dropdown for selecting organizations.
 * Used for assigning orgs to prospects during import.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Organization {
  org_id: string;
  org_name: string;
  is_prospect: boolean;
}

interface OrgSelectorProps {
  selectedOrgId?: string;
  selectedOrgName?: string;
  suggestedOrgName?: string; // Original org name from CSV for fuzzy matching
  onSelect: (org: { orgId: string; orgName: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

// ============================================================================
// OrgSelector Component
// ============================================================================

export function OrgSelector({
  selectedOrgId,
  selectedOrgName,
  suggestedOrgName,
  onSelect,
  placeholder = 'Search organizations...',
  disabled = false,
}: OrgSelectorProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(selectedOrgName || '');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Search Organizations
  // ============================================================================

  const searchOrgs = useCallback(async (query: string) => {
    if (query.length < 2) {
      setOrgs([]);
      return;
    }

    setIsLoading(true);
    try {
      // Direct Supabase search via API
      const res = await fetch('/api/admin/org-search?' + new URLSearchParams({ q: query }));
      const data = await res.json();
      setOrgs(data.organizations || []);
    } catch (error) {
      console.error('Org search error:', error);
      setOrgs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchOrgs(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchOrgs]);

  // Pre-fill search with suggested org name
  useEffect(() => {
    if (suggestedOrgName && !displayName && !selectedOrgId) {
      setSearchQuery(suggestedOrgName);
    }
  }, [suggestedOrgName, displayName, selectedOrgId]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSelect = (org: Organization) => {
    setDisplayName(org.org_name);
    setSearchQuery('');
    setIsOpen(false);
    onSelect({ orgId: org.org_id, orgName: org.org_name });
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchQuery && suggestedOrgName) {
      setSearchQuery(suggestedOrgName);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Display / Search Input */}
      {displayName && !isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setSearchQuery(displayName);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-1.5 text-left text-sm rounded-lg truncate transition-all',
            'bg-white/10 border border-white/20 text-white',
            'hover:bg-white/15 hover:border-white/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {displayName}
        </button>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-1.5 text-sm rounded-lg transition-all',
            'bg-white/10 border border-white/20 text-white placeholder-white/30',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 focus:bg-white/15',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-white/50 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching...
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="px-4 py-3 text-sm text-white/40">
              Type at least 2 characters...
            </div>
          ) : orgs.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/50">
              No organizations found
              <p className="text-xs text-white/30 mt-1">
                You may need to create the organization first
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {orgs.map((org) => (
                <li key={org.org_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(org)}
                    className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{org.org_name}</span>
                    {org.is_prospect && (
                      <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                        Prospect
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
