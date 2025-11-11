'use client';

import { motion } from 'framer-motion';
import { FilterX, Database, AlertCircle, LucideIcon } from 'lucide-react';

interface ChartEmptyStateProps {
  title: string;
  icon?: LucideIcon;
  hasUnfilteredData: boolean;
  hasFilteredData: boolean;
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
  noDataMessage?: string;
  filteredMessage?: string;
  className?: string;
}

export function ChartEmptyState({
  title,
  icon: Icon,
  hasUnfilteredData,
  hasFilteredData,
  hasActiveFilters,
  onClearFilters,
  noDataMessage = 'No data available yet',
  filteredMessage = 'No data matches your current filters',
  className = '',
}: ChartEmptyStateProps) {
  // Determine state
  const isFiltered = !hasFilteredData && hasActiveFilters && hasUnfilteredData;
  const isEmpty = !hasUnfilteredData;

  // Select appropriate icon
  const StateIcon = isFiltered ? FilterX : isEmpty ? Database : AlertCircle;
  const DisplayIcon = Icon || StateIcon;

  // Select appropriate message
  const message = isFiltered ? filteredMessage : noDataMessage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center py-16 ${className}`}
    >
      {/* Icon */}
      <div className={`mb-4 ${isFiltered ? 'text-amber-400' : 'text-gray-300'}`}>
        <DisplayIcon className="w-16 h-16" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {isFiltered ? `${title}: No Results` : title}
      </h3>

      {/* Message */}
      <p className="text-sm text-gray-500 text-center max-w-md mb-6">
        {message}
      </p>

      {/* Action button - only show for filtered state */}
      {isFiltered && onClearFilters && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClearFilters}
          className="px-6 py-2.5 bg-accent-500 text-white rounded-lg font-medium shadow-md hover:bg-accent-600 transition-colors flex items-center gap-2"
        >
          <FilterX className="w-4 h-4" />
          Clear all filters
        </motion.button>
      )}

      {/* Helper text for filtered state */}
      {isFiltered && (
        <p className="text-xs text-gray-400 mt-3">
          Try adjusting your filters to see more data
        </p>
      )}
    </motion.div>
  );
}
