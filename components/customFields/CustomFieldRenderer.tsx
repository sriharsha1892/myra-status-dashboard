'use client';

import { format } from 'date-fns';
import { Check, X, ExternalLink, Mail } from 'lucide-react';
import type { CustomFieldDefinition, FieldConfig, CustomFieldValue } from '@/lib/customFields/types';

interface CustomFieldRendererProps {
  definition: CustomFieldDefinition;
  value: CustomFieldValue;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export default function CustomFieldRenderer({
  definition,
  value,
  showLabel = false,
  compact = false,
  className = '',
}: CustomFieldRendererProps) {
  const config = definition.field_config as FieldConfig;

  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    return (
      <div className={className}>
        {showLabel && (
          <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            {definition.field_label}
          </div>
        )}
        <span className="text-sm text-gray-400 dark:text-slate-500 italic">
          Not set
        </span>
      </div>
    );
  }

  const renderValue = () => {
    switch (definition.field_type) {
      case 'text':
        return (
          <span className="text-sm text-gray-900 dark:text-white">
            {String(value)}
          </span>
        );

      case 'number':
        const numberConfig = config as { unit?: string };
        return (
          <span className="text-sm text-gray-900 dark:text-white font-medium">
            {String(value)}
            {numberConfig.unit && (
              <span className="text-gray-500 dark:text-slate-400 ml-1">
                {numberConfig.unit}
              </span>
            )}
          </span>
        );

      case 'boolean':
        return value ? (
          <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            {compact ? '' : 'Yes'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-gray-400 dark:text-slate-500">
            <X className="w-4 h-4" />
            {compact ? '' : 'No'}
          </span>
        );

      case 'date':
        const dateValue = value instanceof Date ? value : new Date(String(value));
        return (
          <span className="text-sm text-gray-900 dark:text-white">
            {format(dateValue, 'MMM d, yyyy')}
          </span>
        );

      case 'enum':
        const enumConfig = config as { options: { value: string; label: string; color?: string }[] };
        const selectedOption = enumConfig.options?.find((o) => o.value === value);
        if (!selectedOption) {
          return <span className="text-sm text-gray-900 dark:text-white">{String(value)}</span>;
        }
        return (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={
              selectedOption.color
                ? {
                    backgroundColor: `${selectedOption.color}20`,
                    color: selectedOption.color,
                  }
                : {
                    backgroundColor: 'rgb(239, 246, 255)',
                    color: 'rgb(29, 78, 216)',
                  }
            }
          >
            {selectedOption.label}
          </span>
        );

      case 'multi_select':
        const multiConfig = config as { options: { value: string; label: string; color?: string }[] };
        const selectedValues = Array.isArray(value) ? value : [];
        if (selectedValues.length === 0) {
          return <span className="text-sm text-gray-400 dark:text-slate-500 italic">None selected</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {selectedValues.map((val) => {
              const option = multiConfig.options?.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={
                    option?.color
                      ? {
                          backgroundColor: `${option.color}20`,
                          color: option.color,
                        }
                      : {
                          backgroundColor: 'rgb(243, 244, 246)',
                          color: 'rgb(75, 85, 99)',
                        }
                  }
                >
                  {option?.label || val}
                </span>
              );
            })}
          </div>
        );

      case 'url':
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {compact ? (
              <ExternalLink className="w-4 h-4" />
            ) : (
              <>
                {String(value).replace(/^https?:\/\//, '').substring(0, 30)}
                {String(value).length > 30 && '...'}
                <ExternalLink className="w-3 h-3" />
              </>
            )}
          </a>
        );

      case 'email':
        return (
          <a
            href={`mailto:${String(value)}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {compact ? (
              <Mail className="w-4 h-4" />
            ) : (
              <>
                {String(value)}
                <Mail className="w-3 h-3" />
              </>
            )}
          </a>
        );

      default:
        return (
          <span className="text-sm text-gray-900 dark:text-white">
            {String(value)}
          </span>
        );
    }
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
          {definition.field_label}
        </div>
      )}
      {renderValue()}
    </div>
  );
}
