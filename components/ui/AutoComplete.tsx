'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface AutoCompleteOption {
  value: string;
  label: string;
  subtitle?: string;
  tag?: string;
  metadata?: any;
}

interface AutoCompleteProps {
  options: AutoCompleteOption[];
  value: string;
  onChange: (value: string, option?: AutoCompleteOption) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  minChars?: number;
  maxResults?: number;
  loading?: boolean;
}

/**
 * AutoComplete component with fuzzy search
 *
 * Features:
 * - Fuzzy matching
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Shows subtitles and tags
 * - Clearable
 * - Loading state
 *
 * Usage:
 * <AutoComplete
 *   options={orgs}
 *   value={selectedOrg}
 *   onChange={(value, option) => setSelectedOrg(value)}
 *   placeholder="Search organizations..."
 *   label="Organization"
 * />
 */
export default function AutoComplete({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  label,
  required = false,
  className = '',
  disabled = false,
  allowClear = true,
  minChars = 1,
  maxResults = 10,
  loading = false
}: AutoCompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize display value from selected option
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(opt => opt.value === value);
      if (selectedOption) {
        setDisplayValue(selectedOption.label);
      }
    } else {
      setDisplayValue('');
    }
  }, [value, options]);

  // Fuzzy search function
  const fuzzyMatch = (text: string, search: string): boolean => {
    const searchLower = search.toLowerCase();
    const textLower = text.toLowerCase();

    // Exact match
    if (textLower.includes(searchLower)) return true;

    // Fuzzy match - all characters present in order
    let searchIndex = 0;
    for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
      if (textLower[i] === searchLower[searchIndex]) {
        searchIndex++;
      }
    }
    return searchIndex === searchLower.length;
  };

  // Filter and sort options
  const filteredOptions = searchTerm.length >= minChars
    ? options
        .filter(option =>
          fuzzyMatch(option.label, searchTerm) ||
          (option.subtitle && fuzzyMatch(option.subtitle, searchTerm)) ||
          (option.tag && fuzzyMatch(option.tag, searchTerm))
        )
        .slice(0, maxResults)
    : options.slice(0, maxResults);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setDisplayValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);

    // If cleared, reset selection
    if (!newValue) {
      onChange('');
    }
  };

  // Handle option selection
  const handleSelect = (option: AutoCompleteOption) => {
    setDisplayValue(option.label);
    setSearchTerm('');
    setIsOpen(false);
    onChange(option.value, option);
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayValue('');
    setSearchTerm('');
    onChange('');
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="w-full h-11 pl-10 pr-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {allowClear && displayValue && !disabled && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
              tabIndex={-1}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Loading...
              </div>
            ) : filteredOptions.length > 0 ? (
              <div className="py-1">
                {filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${
                      index === highlightedIndex
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {option.label}
                        </div>
                        {option.subtitle && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {option.subtitle}
                          </div>
                        )}
                      </div>
                      {option.tag && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded shrink-0">
                          {option.tag}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchTerm.length >= minChars ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No results found
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Type {minChars} or more characters to search
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
