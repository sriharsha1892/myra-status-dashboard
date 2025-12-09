'use client';

/**
 * ColumnMapper Component - Glassmorphism Edition
 *
 * Visual column mapping interface when CSV headers don't match expected fields.
 * Allows users to map CSV columns to entity fields with auto-detection.
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FieldDefinition } from '@/lib/reliableImport/fieldDefinitions';

interface ColumnMapperProps {
  csvColumns: string[];
  expectedFields: FieldDefinition[];
  autoMapping: Record<string, string>;
  missingRequired: string[];
  onConfirm: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

export function ColumnMapper({
  csvColumns,
  expectedFields,
  autoMapping,
  missingRequired,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(autoMapping);

  useEffect(() => {
    setMapping(autoMapping);
  }, [autoMapping]);

  const handleMappingChange = (csvColumn: string, fieldKey: string) => {
    setMapping((prev) => {
      const updated = { ...prev };
      if (fieldKey === '') {
        delete updated[csvColumn];
      } else {
        updated[csvColumn] = fieldKey;
      }
      return updated;
    });
  };

  // Get currently mapped field keys
  const mappedFields = new Set(Object.values(mapping));

  // Check if all required fields are mapped
  const requiredFields = expectedFields.filter((f) => f.required);
  const currentlyMissing = requiredFields.filter((f) => !mappedFields.has(f.key));

  return (
    <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-6 animate-fade-in">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">🔗</span>
          Column Mapping
        </h3>
        <p className="text-sm text-white/50 mt-1">
          Map your CSV columns to the expected fields. Required fields are marked with *.
        </p>
      </div>

      {currentlyMissing.length > 0 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-300">
            <strong>Missing required fields:</strong>{' '}
            {currentlyMissing.map((f) => f.label).join(', ')}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center text-xs font-medium text-white/40 uppercase tracking-wider border-b border-white/[0.08] pb-3">
          <span>CSV Column</span>
          <span className="w-8"></span>
          <span>Maps To</span>
        </div>

        {csvColumns.map((csvColumn) => {
          const currentMapping = mapping[csvColumn] || '';
          const mappedField = expectedFields.find((f) => f.key === currentMapping);

          return (
            <div
              key={csvColumn}
              className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center animate-fade-in"
            >
              <div className="px-3 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08] text-sm font-mono text-white/70">
                {csvColumn}
              </div>
              <div className="text-white/30 text-lg">→</div>
              <select
                value={currentMapping}
                onChange={(e) => handleMappingChange(csvColumn, e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer',
                  'bg-white/[0.04] border text-white',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  currentMapping
                    ? 'border-purple-500/40 bg-purple-500/10'
                    : 'border-white/[0.08] hover:border-white/20'
                )}
              >
                <option value="" className="bg-slate-900 text-white/50">— Skip this column —</option>
                <optgroup label="Required Fields" className="bg-slate-900">
                  {expectedFields
                    .filter((f) => f.required)
                    .map((field) => (
                      <option
                        key={field.key}
                        value={field.key}
                        disabled={
                          mappedFields.has(field.key) && mapping[csvColumn] !== field.key
                        }
                        className="bg-slate-900"
                      >
                        {field.label} *
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Optional Fields" className="bg-slate-900">
                  {expectedFields
                    .filter((f) => !f.required)
                    .map((field) => (
                      <option
                        key={field.key}
                        value={field.key}
                        disabled={
                          mappedFields.has(field.key) && mapping[csvColumn] !== field.key
                        }
                        className="bg-slate-900"
                      >
                        {field.label}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          );
        })}
      </div>

      {/* Field descriptions */}
      <div className="mt-6 pt-4 border-t border-white/[0.08]">
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
          Field Descriptions
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
          {expectedFields.slice(0, 6).map((field) => (
            <div key={field.key} className="flex gap-1.5">
              <span className="font-medium text-white/60">{field.label}:</span>
              <span>{field.description || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(mapping)}
          disabled={currentlyMissing.length > 0}
          className={cn(
            'btn-shimmer px-6 py-2.5 text-sm font-medium rounded-xl transition-all',
            currentlyMissing.length > 0
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]'
          )}
        >
          Confirm Mapping
        </button>
      </div>
    </div>
  );
}
