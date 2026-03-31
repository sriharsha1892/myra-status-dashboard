'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { QuoteRow, PPUQuoteRow, PricingOptionGroup, Currency } from '@/lib/quote/types';
import { CURRENCY_SYMBOLS } from '@/lib/quote/types';
import { TERM_OPTIONS } from '@/lib/quote/constants';

// ============================================================================
// SHARED UTILS
// ============================================================================

function formatNumberDisplay(value: string, currency: Currency): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;
  return currency === 'INR' ? num.toLocaleString('en-IN') : num.toLocaleString('en-US');
}

function parseFormattedNumber(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

function calculateDiscount(listPrice: string, offerPrice: string): { percent: number | null; isNegative: boolean } {
  const list = parseFloat(parseFormattedNumber(listPrice));
  const offer = parseFloat(parseFormattedNumber(offerPrice));
  if (isNaN(list) || isNaN(offer) || list === 0) return { percent: null, isNegative: false };
  const percent = ((list - offer) / list) * 100;
  return { percent: Math.abs(percent), isNegative: percent < 0 };
}

// ============================================================================
// PROPS
// ============================================================================

interface PricingOptionCardProps {
  group: PricingOptionGroup;
  index: number;
  currency: Currency;
  canRemove: boolean;
  onUpdate: (updates: Partial<PricingOptionGroup>) => void;
  onRemove: () => void;
}

// ============================================================================
// PER-SEAT TABLE (simplified — inside option cards)
// ============================================================================

function PerSeatSection({
  group,
  currency,
  onUpdate,
}: {
  group: PricingOptionGroup;
  currency: Currency;
  onUpdate: (updates: Partial<PricingOptionGroup>) => void;
}) {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  const updateRow = (rowIdx: number, field: keyof QuoteRow, value: string) => {
    const newRows = group.rows.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r);
    onUpdate({ rows: newRows });
  };

  const addRow = () => {
    onUpdate({ rows: [...group.rows, { term: '1-Year', users: '', consultingHours: '', listPrice: '', offerPrice: '' }] });
  };

  const removeRow = (rowIdx: number) => {
    if (group.rows.length <= 1) return;
    onUpdate({ rows: group.rows.filter((_, i) => i !== rowIdx) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm text-neutral-500">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={group.showUsersColumn}
            onChange={(e) => onUpdate({ showUsersColumn: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
          />
          Show Users
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={group.showPromotionalPrice}
            onChange={(e) => onUpdate({ showPromotionalPrice: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
          />
          Show Promotional Price
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-violet-600 text-white">
              <th className="px-3 py-2 text-left font-medium rounded-tl-lg">Term</th>
              {group.showUsersColumn && <th className="px-3 py-2 text-left font-medium">Users</th>}
              <th className="px-3 py-2 text-left font-medium">Consulting Hours</th>
              <th className="px-3 py-2 text-left font-medium">List Price ({symbol})</th>
              {group.showPromotionalPrice && <th className="px-3 py-2 text-left font-medium">Investment ({symbol})</th>}
              {group.showPromotionalPrice && <th className="px-3 py-2 text-center font-medium">Discount</th>}
              <th className="px-3 py-2 text-center font-medium rounded-tr-lg w-10"></th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, idx) => {
              const disc = calculateDiscount(row.listPrice, row.offerPrice);
              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}>
                  <td className="px-2 py-2">
                    <select
                      value={TERM_OPTIONS.some(o => o.value === row.term) ? row.term : 'custom'}
                      onChange={(e) => updateRow(idx, 'term', e.target.value === 'custom' ? '' : e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500"
                    >
                      {TERM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  {group.showUsersColumn && (
                    <td className="px-2 py-2">
                      <input type="text" value={row.users} onChange={(e) => updateRow(idx, 'users', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="10" />
                    </td>
                  )}
                  <td className="px-2 py-2">
                    <input type="text" value={row.consultingHours} onChange={(e) => updateRow(idx, 'consultingHours', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="500/year" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.listPrice}
                      onChange={(e) => updateRow(idx, 'listPrice', parseFormattedNumber(e.target.value))}
                      onBlur={() => { if (row.listPrice) updateRow(idx, 'listPrice', formatNumberDisplay(row.listPrice, currency)); }}
                      onFocus={() => { if (row.listPrice) updateRow(idx, 'listPrice', parseFormattedNumber(row.listPrice)); }}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="75,000" />
                  </td>
                  {group.showPromotionalPrice && (
                    <td className="px-2 py-2">
                      <input type="text" value={row.offerPrice}
                        onChange={(e) => updateRow(idx, 'offerPrice', parseFormattedNumber(e.target.value))}
                        onBlur={() => { if (row.offerPrice) updateRow(idx, 'offerPrice', formatNumberDisplay(row.offerPrice, currency)); }}
                        onFocus={() => { if (row.offerPrice) updateRow(idx, 'offerPrice', parseFormattedNumber(row.offerPrice)); }}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500 font-medium" placeholder="60,000" />
                    </td>
                  )}
                  {group.showPromotionalPrice && (
                    <td className="px-2 py-2 text-center">
                      {disc.percent !== null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          disc.isNegative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {disc.percent.toFixed(1)}% {disc.isNegative ? 'up' : 'off'}
                        </span>
                      ) : <span className="text-neutral-400">-</span>}
                    </td>
                  )}
                  <td className="px-2 py-2 text-center">
                    {group.rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(idx)}
                        className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remove row">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Add Row
      </button>

      {/* Additional Hour Rate */}
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
        <label className="text-sm text-neutral-600 whitespace-nowrap">Addl. Hour Rate:</label>
        <div className="relative w-40">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">{symbol}</span>
          <input type="text" value={group.additionalHourRate}
            onChange={(e) => onUpdate({ additionalHourRate: e.target.value })}
            className="w-full pl-7 pr-8 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="250" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">/hr</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PPU TABLE
// ============================================================================

function PPUSection({
  group,
  currency,
  onUpdate,
}: {
  group: PricingOptionGroup;
  currency: Currency;
  onUpdate: (updates: Partial<PricingOptionGroup>) => void;
}) {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  const updateRow = (rowIdx: number, field: keyof PPUQuoteRow, value: string) => {
    const newRows = group.ppuRows.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r);
    onUpdate({ ppuRows: newRows });
  };

  const addRow = () => {
    onUpdate({ ppuRows: [...group.ppuRows, { term: '1-Year', namedUsers: 'Unlimited', projectsIncluded: '', consultingHours: '', listPrice: '', offerPrice: '' }] });
  };

  const removeRow = (rowIdx: number) => {
    if (group.ppuRows.length <= 1) return;
    onUpdate({ ppuRows: group.ppuRows.filter((_, i) => i !== rowIdx) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm text-neutral-500">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={group.showPromotionalPrice}
            onChange={(e) => onUpdate({ showPromotionalPrice: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500" />
          Show Promotional Price
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={group.showOverageRate}
            onChange={(e) => onUpdate({ showOverageRate: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500" />
          Show Overage Rate
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-emerald-600 text-white">
              <th className="px-3 py-2 text-left font-medium rounded-tl-lg">Term</th>
              <th className="px-3 py-2 text-left font-medium">Named Users</th>
              <th className="px-3 py-2 text-left font-medium">Projects Included</th>
              <th className="px-3 py-2 text-left font-medium">Consulting Hrs/Yr</th>
              <th className="px-3 py-2 text-left font-medium">List Price ({symbol})</th>
              {group.showPromotionalPrice && <th className="px-3 py-2 text-left font-medium">Investment ({symbol})</th>}
              {group.showPromotionalPrice && <th className="px-3 py-2 text-center font-medium">Discount</th>}
              {group.showOverageRate && <th className="px-3 py-2 text-left font-medium">Overage/Project</th>}
              <th className="px-3 py-2 text-center font-medium rounded-tr-lg w-10"></th>
            </tr>
          </thead>
          <tbody>
            {group.ppuRows.map((row, idx) => {
              const disc = calculateDiscount(row.listPrice, row.offerPrice);
              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}>
                  <td className="px-2 py-2">
                    <select value={row.term} onChange={(e) => updateRow(idx, 'term', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500">
                      {TERM_OPTIONS.filter(o => o.value !== 'custom').map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.namedUsers} onChange={(e) => updateRow(idx, 'namedUsers', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="Unlimited" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.projectsIncluded} onChange={(e) => updateRow(idx, 'projectsIncluded', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="50" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.consultingHours} onChange={(e) => updateRow(idx, 'consultingHours', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="50/year" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.listPrice}
                      onChange={(e) => updateRow(idx, 'listPrice', parseFormattedNumber(e.target.value))}
                      onBlur={() => { if (row.listPrice) updateRow(idx, 'listPrice', formatNumberDisplay(row.listPrice, currency)); }}
                      onFocus={() => { if (row.listPrice) updateRow(idx, 'listPrice', parseFormattedNumber(row.listPrice)); }}
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="12,500" />
                  </td>
                  {group.showPromotionalPrice && (
                    <td className="px-2 py-2">
                      <input type="text" value={row.offerPrice}
                        onChange={(e) => updateRow(idx, 'offerPrice', parseFormattedNumber(e.target.value))}
                        onBlur={() => { if (row.offerPrice) updateRow(idx, 'offerPrice', formatNumberDisplay(row.offerPrice, currency)); }}
                        onFocus={() => { if (row.offerPrice) updateRow(idx, 'offerPrice', parseFormattedNumber(row.offerPrice)); }}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500 font-medium" placeholder="8,750" />
                    </td>
                  )}
                  {group.showPromotionalPrice && (
                    <td className="px-2 py-2 text-center">
                      {disc.percent !== null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          disc.isNegative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {disc.percent.toFixed(1)}% {disc.isNegative ? 'up' : 'off'}
                        </span>
                      ) : <span className="text-neutral-400">-</span>}
                    </td>
                  )}
                  {group.showOverageRate && (
                    <td className="px-2 py-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">{symbol}</span>
                        <input type="text" value={row.overageRate || ''}
                          onChange={(e) => updateRow(idx, 'overageRate', e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="150" />
                      </div>
                    </td>
                  )}
                  <td className="px-2 py-2 text-center">
                    {group.ppuRows.length > 1 && (
                      <button type="button" onClick={() => removeRow(idx)}
                        className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remove row">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Add Row
      </button>

      {/* Scope Definition */}
      <div className="pt-3 border-t border-neutral-100">
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          What counts as a Research Project?
        </label>
        <textarea
          value={group.scopeDefinition || ''}
          onChange={(e) => onUpdate({ scopeDefinition: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-violet-500"
          placeholder="A Research Project is a single topic or decision theme..."
        />
        <p className="mt-1 text-xs text-neutral-400">Included in the generated document to define project scope for the client.</p>
      </div>

      {/* Additional Hour Rate */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-600 whitespace-nowrap">Addl. Hour Rate:</label>
        <div className="relative w-40">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">{symbol}</span>
          <input type="text" value={group.additionalHourRate}
            onChange={(e) => onUpdate({ additionalHourRate: e.target.value })}
            className="w-full pl-7 pr-8 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-violet-500" placeholder="250" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">/hr</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CARD
// ============================================================================

export function PricingOptionCard({ group, index, currency, canRemove, onUpdate, onRemove }: PricingOptionCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        group.pricingModel === 'per-seat' ? 'bg-violet-50 border-b border-violet-200' : 'bg-emerald-50 border-b border-emerald-200'
      }`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button type="button" onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 text-neutral-500 hover:text-neutral-700">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={group.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-neutral-300 focus:border-violet-500 focus:outline-none rounded-none"
          />
          <select
            value={group.pricingModel}
            onChange={(e) => {
              const model = e.target.value as 'per-seat' | 'per-project';
              const updates: Partial<PricingOptionGroup> = { pricingModel: model };
              if (model === 'per-project' && group.ppuRows.length === 0) {
                updates.ppuRows = [{ term: '1-Year', namedUsers: 'Unlimited', projectsIncluded: '', consultingHours: '', listPrice: '', offerPrice: '' }];
                updates.scopeDefinition = group.scopeDefinition || 'A Research Project is a single topic or decision theme. Follow-up questions, refined assumptions, and scenario iterations all remain within that project. A new, unrelated topic constitutes a separate Research Project.';
              }
              if (model === 'per-seat' && group.rows.length === 0) {
                updates.rows = [{ term: '1-Year', users: '', consultingHours: '', listPrice: '', offerPrice: '' }];
              }
              onUpdate(updates);
            }}
            className="px-2 py-1 text-xs font-medium border border-neutral-200 rounded-lg bg-white focus:ring-2 focus:ring-violet-500"
          >
            <option value="per-seat">Per-Seat</option>
            <option value="per-project">Per-Project (PPU)</option>
          </select>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="ml-3 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove option group">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4">
          {group.pricingModel === 'per-seat'
            ? <PerSeatSection group={group} currency={currency} onUpdate={onUpdate} />
            : <PPUSection group={group} currency={currency} onUpdate={onUpdate} />
          }
        </div>
      )}
    </div>
  );
}
