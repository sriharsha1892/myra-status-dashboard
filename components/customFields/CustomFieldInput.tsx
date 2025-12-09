'use client';

import { useState } from 'react';
import type { CustomFieldDefinition, FieldConfig, CustomFieldValue } from '@/lib/customFields/types';

interface CustomFieldInputProps {
  definition: CustomFieldDefinition;
  value: CustomFieldValue;
  onChange: (value: CustomFieldValue) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function CustomFieldInput({
  definition,
  value,
  onChange,
  error,
  disabled = false,
  className = '',
}: CustomFieldInputProps) {
  const config = definition.field_config as FieldConfig;
  const placeholder = 'placeholder' in config ? config.placeholder : '';

  const baseInputClass = `w-full h-9 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white'
  } ${className}`;

  switch (definition.field_type) {
    case 'text':
      const textConfig = config as { maxLength?: number; multiline?: boolean };
      if (textConfig.multiline) {
        return (
          <div>
            <textarea
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={textConfig.maxLength}
              rows={3}
              className={`${baseInputClass} h-auto py-2`}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
        );
      }
      return (
        <div>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={textConfig.maxLength}
            className={baseInputClass}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'number':
      const numberConfig = config as { min?: number; max?: number; step?: number };
      return (
        <div>
          <input
            type="number"
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={placeholder}
            disabled={disabled}
            min={numberConfig.min}
            max={numberConfig.max}
            step={numberConfig.step || 1}
            className={baseInputClass}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'boolean':
      return (
        <div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm text-gray-700 dark:text-slate-300">
              {value ? 'Yes' : 'No'}
            </span>
          </label>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div>
          <input
            type="date"
            value={value ? String(value).split('T')[0] : ''}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
            disabled={disabled}
            className={baseInputClass}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'enum':
      const enumConfig = config as { options: { value: string; label: string; color?: string }[] };
      return (
        <div>
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClass}
          >
            <option value="">{placeholder || 'Select...'}</option>
            {enumConfig.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'multi_select':
      const multiConfig = config as { options: { value: string; label: string; color?: string }[]; maxSelections?: number };
      const selectedValues = Array.isArray(value) ? value : [];

      const toggleOption = (optionValue: string) => {
        if (selectedValues.includes(optionValue)) {
          onChange(selectedValues.filter((v) => v !== optionValue));
        } else {
          if (!multiConfig.maxSelections || selectedValues.length < multiConfig.maxSelections) {
            onChange([...selectedValues, optionValue]);
          }
        }
      };

      return (
        <div>
          <div className="flex flex-wrap gap-2">
            {multiConfig.options?.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !disabled && toggleOption(option.value)}
                  disabled={disabled}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-400'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  style={isSelected && option.color ? { borderColor: option.color, backgroundColor: `${option.color}20` } : {}}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {multiConfig.maxSelections && (
            <p className="mt-1 text-xs text-gray-500">
              {selectedValues.length}/{multiConfig.maxSelections} selected
            </p>
          )}
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'url':
      return (
        <div>
          <input
            type="url"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'https://'}
            disabled={disabled}
            className={baseInputClass}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'email':
      return (
        <div>
          <input
            type="email"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'email@example.com'}
            disabled={disabled}
            className={baseInputClass}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );

    default:
      return (
        <div>
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClass}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      );
  }
}
