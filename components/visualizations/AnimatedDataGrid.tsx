'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { MiniSparkline } from './SparklineCluster';

type SortDirection = 'asc' | 'desc' | null;

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface AnimatedDataGridProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  highlightRow?: (row: any) => boolean;
  maxHeight?: string;
}

export default function AnimatedDataGrid({
  columns,
  data,
  onRowClick,
  highlightRow,
  maxHeight = '600px',
}: AnimatedDataGridProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDirection) return 0;

    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (typeof aVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'linear',
          repeatDelay: 5,
        }}
        style={{ transform: 'skewX(-20deg)', zIndex: 10 }}
      />

      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full">
          {/* Header */}
          <thead className="sticky top-0 z-20 bg-gradient-to-r from-gray-50/95 to-gray-100/95 backdrop-blur-xl">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-${column.align || 'left'} ${
                    column.sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <motion.div
                    className="flex items-center gap-2 font-semibold text-sm text-gray-700"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="ml-auto">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    )}
                  </motion.div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((row, rowIndex) => {
              const isHighlighted = highlightRow ? highlightRow(row) : false;
              const isHovered = hoveredRow === rowIndex;

              return (
                <motion.tr
                  key={rowIndex}
                  className={`transition-all ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    isHighlighted
                      ? 'bg-blue-50/50'
                      : isHovered
                      ? 'bg-gray-50'
                      : 'bg-white/50'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIndex * 0.03, duration: 0.3 }}
                  onClick={() => onRowClick && onRowClick(row)}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                  whileHover={{
                    scale: 1.005,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    transition: { duration: 0.2 },
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 text-${column.align || 'left'}`}
                    >
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: rowIndex * 0.03 + colIndex * 0.01 }}
                        className="text-sm text-gray-900"
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </motion.div>
                    </td>
                  ))}

                  {/* Row highlight bar */}
                  {isHighlighted && (
                    <td className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-accent-600" />
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {data.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-16 text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="font-medium">No data to display</p>
          </motion.div>
        )}
      </div>

      {/* Gradient borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
    </motion.div>
  );
}

// Helper component for status badges with animations
export function AnimatedBadge({
  label,
  variant = 'default',
}: {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <motion.span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.05 }}
    >
      {label}
    </motion.span>
  );
}
