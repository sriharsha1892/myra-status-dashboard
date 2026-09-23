/**
 * Quote register — pure helpers shared by the /api/quote/list route,
 * the save route, and the /quote/admin page.
 *
 * Everything here is side-effect free and unit-tested in __tests__/register.test.ts.
 */

import type {
  Account,
  LegacyLineItem,
  OptionCountBucket,
  PricingModel,
  QuoteOption,
  QuoteStatus,
  RegisterDateRange,
  RegisterFilters,
  RegisterQuote,
  RegisterSort,
  StoredPricingOption,
  UsersBand,
} from './types';
import { QUOTE_STATUSES } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------
// Money
// ------------------------------------------------------------

/** "45,000" | "$45,000" | 45000 → 45000. Empty / unparseable → null. */
export function parseMoney(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ------------------------------------------------------------
// Status
// ------------------------------------------------------------

/** Maps any stored status (including legacy `downloaded` / `signed`) onto the lifecycle set. */
export function normaliseStatus(raw: string | null | undefined): QuoteStatus {
  if (raw === 'downloaded' || raw == null || raw === '') return 'draft';
  if (raw === 'signed') return 'accepted';
  return (QUOTE_STATUSES as readonly string[]).includes(raw) ? (raw as QuoteStatus) : 'draft';
}

// ------------------------------------------------------------
// Options
// ------------------------------------------------------------

/**
 * Normalises persisted pricing data into a flat option list.
 * Prefers structured `pricing_options`; falls back to legacy flat `line_items`.
 */
export function flattenOptions(
  pricingOptions: StoredPricingOption[] | null | undefined,
  lineItems: LegacyLineItem[] | null | undefined
): QuoteOption[] {
  if (Array.isArray(pricingOptions) && pricingOptions.length > 0) {
    const out: QuoteOption[] = [];
    pricingOptions.forEach((group) => {
      const rows = Array.isArray(group.rows) ? group.rows : [];
      rows.forEach((row) => {
        if (!row) return;
        const isProject = group.pricingModel === 'per-project';
        out.push({
          groupLabel: group.label || '',
          model: isProject ? 'per-project' : 'per-seat',
          term: row.term || '',
          users: isProject ? row.namedUsers ?? null : row.users ?? null,
          projects: isProject ? row.projectsIncluded ?? null : null,
          hours: row.consultingHours || '',
          price: parseMoney(row.offerPrice),
        });
      });
    });
    return out;
  }

  if (Array.isArray(lineItems)) {
    return lineItems
      .filter((it): it is LegacyLineItem => !!it && typeof it === 'object')
      .map((it) => ({
        groupLabel: '',
        model: 'per-seat' as const,
        term: it.term || '',
        users: it.users ?? null,
        projects: null,
        hours: it.consultingHours || '',
        price: parseMoney(it.investment),
      }));
  }

  return [];
}

export function valueRange(options: QuoteOption[]): { min: number | null; max: number | null } {
  const prices = options.map((o) => o.price).filter((p): p is number => p != null);
  if (prices.length === 0) return { min: null, max: null };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** "3" → '2-5'. Non-numeric (e.g. "Unlimited") → '10+'. Empty → null. */
export function usersBand(users: string | null | undefined): UsersBand | null {
  if (users == null) return null;
  const trimmed = String(users).trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed.replace(/[^0-9]/g, ''), 10);
  if (Number.isNaN(n)) return /unlimited/i.test(trimmed) ? '10+' : null;
  if (n <= 1) return '1';
  if (n <= 5) return '2-5';
  if (n <= 10) return '6-10';
  return '10+';
}

export function optionCountBucket(count: number): OptionCountBucket {
  return count > 1 ? 'multi' : 'single';
}

// ------------------------------------------------------------
// Dates: a quote is dated by its quote date, not by when it reached the register
// ------------------------------------------------------------

export function quoteTime(q: Pick<RegisterQuote, 'quoteDate' | 'createdAt'>): number {
  const t = new Date(q.quoteDate || q.createdAt).getTime();
  return Number.isNaN(t) ? new Date(q.createdAt).getTime() : t;
}

// ------------------------------------------------------------
// Grouping
// ------------------------------------------------------------

export function accountKey(companyName: string): string {
  return companyName.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Groups quotes (any order) into accounts. Quotes inside an account are newest first. */
export function groupByAccount(quotes: RegisterQuote[]): Account[] {
  const byKey = new Map<string, RegisterQuote[]>();
  quotes.forEach((q) => {
    const key = accountKey(q.companyName);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(q);
    else byKey.set(key, [q]);
  });

  const accounts: Account[] = [];
  byKey.forEach((list, key) => {
    const sorted = [...list].sort((a, b) => quoteTime(b) - quoteTime(a));
    const ams = uniqueSorted(sorted.map((q) => q.preparedBy).filter(Boolean));
    const contacts = uniqueSorted(sorted.map((q) => q.contactName).filter(Boolean));
    accounts.push({
      key,
      companyName: sorted[0].companyName,
      ams,
      contacts,
      quotes: sorted,
      latest: sorted[0],
    });
  });

  accounts.sort((a, b) => quoteTime(b.latest) - quoteTime(a.latest));
  return accounts;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

// ------------------------------------------------------------
// Filters
// ------------------------------------------------------------

export const EMPTY_FILTERS: RegisterFilters = {
  search: '',
  ams: [],
  statuses: [],
  terms: [],
  models: [],
  optionCounts: [],
  usersBands: [],
  dateRange: 'all',
  sort: 'newest',
};

export function hasActiveFilters(f: RegisterFilters): boolean {
  return (
    f.search.trim() !== '' ||
    f.ams.length > 0 ||
    f.statuses.length > 0 ||
    f.terms.length > 0 ||
    f.models.length > 0 ||
    f.optionCounts.length > 0 ||
    f.usersBands.length > 0 ||
    f.dateRange !== 'all'
  );
}

export function activeFilterCount(f: RegisterFilters): number {
  return (
    (f.search.trim() ? 1 : 0) +
    f.ams.length +
    f.statuses.length +
    f.terms.length +
    f.models.length +
    f.optionCounts.length +
    f.usersBands.length +
    (f.dateRange !== 'all' ? 1 : 0)
  );
}

function dateRangeCutoff(range: RegisterDateRange, now: Date): number | null {
  switch (range) {
    case '30d':
      return now.getTime() - 30 * DAY_MS;
    case '90d':
      return now.getTime() - 90 * DAY_MS;
    case '12mo':
      return now.getTime() - 365 * DAY_MS;
    default:
      return null;
  }
}

/**
 * Within a facet: OR. Across facets: AND.
 * Option facets (term / model / users band) match when ANY option on the quote satisfies them.
 */
export function matchesFilters(q: RegisterQuote, f: RegisterFilters, now: Date = new Date()): boolean {
  if (f.ams.length > 0 && !f.ams.includes(q.preparedBy)) return false;
  if (f.statuses.length > 0 && !f.statuses.includes(q.status)) return false;
  if (f.optionCounts.length > 0 && !f.optionCounts.includes(optionCountBucket(q.optionCount))) return false;

  const cutoff = dateRangeCutoff(f.dateRange, now);
  if (cutoff != null && quoteTime(q) < cutoff) return false;

  if (f.terms.length > 0 && !q.options.some((o) => f.terms.includes(o.term))) return false;
  if (f.models.length > 0 && !q.options.some((o) => f.models.includes(o.model))) return false;
  if (f.usersBands.length > 0) {
    const bandsOnQuote = q.options.map((o) => usersBand(o.users)).filter((b): b is UsersBand => b != null);
    if (!bandsOnQuote.some((b) => f.usersBands.includes(b))) return false;
  }

  const needle = f.search.trim().toLowerCase();
  if (needle) {
    const hay = [q.companyName, q.reference, q.contactName, q.contactEmail, q.preparedBy]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(needle)) return false;
  }

  return true;
}

/** Applies filters to accounts; drops accounts with no matching quote. */
export function filterAccounts(
  accounts: Account[],
  f: RegisterFilters,
  now: Date = new Date()
): Array<{ account: Account; visible: RegisterQuote[]; hidden: number }> {
  const out: Array<{ account: Account; visible: RegisterQuote[]; hidden: number }> = [];
  accounts.forEach((account) => {
    const visible = account.quotes.filter((q) => matchesFilters(q, f, now));
    if (visible.length === 0) return;
    out.push({ account, visible, hidden: account.quotes.length - visible.length });
  });
  return out;
}

// ------------------------------------------------------------
// URL (de)serialisation — keeps filtered views shareable
// ------------------------------------------------------------

const MODELS: readonly PricingModel[] = ['per-seat', 'per-project'] as const;
const OPTION_COUNTS: readonly OptionCountBucket[] = ['single', 'multi'] as const;
const USERS_BANDS: readonly UsersBand[] = ['1', '2-5', '6-10', '10+'] as const;
const DATE_RANGES: readonly RegisterDateRange[] = ['all', '30d', '90d', '12mo'] as const;
const SORTS: readonly RegisterSort[] = ['newest', 'oldest', 'company', 'quotes'] as const;

function pickList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
}

export function filtersFromSearchParams(params: URLSearchParams): RegisterFilters {
  const dateRaw = params.get('range');
  const sortRaw = params.get('sort');
  return {
    search: params.get('q') ?? '',
    ams: (params.get('am') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    statuses: pickList(params.get('status'), QUOTE_STATUSES),
    terms: (params.get('term') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    models: pickList(params.get('model'), MODELS),
    optionCounts: pickList(params.get('options'), OPTION_COUNTS),
    usersBands: pickList(params.get('users'), USERS_BANDS),
    dateRange: (DATE_RANGES as readonly string[]).includes(dateRaw ?? '')
      ? (dateRaw as RegisterDateRange)
      : 'all',
    sort: (SORTS as readonly string[]).includes(sortRaw ?? '') ? (sortRaw as RegisterSort) : 'newest',
  };
}

export function filtersToSearchParams(f: RegisterFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search.trim()) p.set('q', f.search.trim());
  if (f.ams.length) p.set('am', f.ams.join(','));
  if (f.statuses.length) p.set('status', f.statuses.join(','));
  if (f.terms.length) p.set('term', f.terms.join(','));
  if (f.models.length) p.set('model', f.models.join(','));
  if (f.optionCounts.length) p.set('options', f.optionCounts.join(','));
  if (f.usersBands.length) p.set('users', f.usersBands.join(','));
  if (f.dateRange !== 'all') p.set('range', f.dateRange);
  if (f.sort !== 'newest') p.set('sort', f.sort);
  return p;
}

// ------------------------------------------------------------
// Display helpers
// ------------------------------------------------------------

/** 45000 → "45K", 1250000 → "1.25M", 800 → "800". No currency symbol. */
export function compactMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `${trimZeros((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `${trimZeros((value / 1_000).toFixed(1))}K`;
  return String(Math.round(value));
}

function trimZeros(s: string): string {
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** "1-Year" → "1-Yr", "2-Year" → "2-Yr". Anything else passes through. */
export function shortTerm(term: string): string {
  return term.replace(/-Year$/i, '-Yr');
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const MODEL_LABEL: Record<PricingModel, string> = {
  'per-seat': 'User-based',
  'per-project': 'Project-based',
};

// ------------------------------------------------------------
// Sorting, facet counts, grouping, export
// ------------------------------------------------------------

export interface FilteredAccount {
  account: Account;
  visible: RegisterQuote[];
  hidden: number;
}

export const SORT_LABEL: Record<RegisterSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  company: 'Company A to Z',
  quotes: 'Most quotes',
};

function latestTime(r: FilteredAccount): number {
  return quoteTime(r.visible[0]);
}

export function sortAccounts(rows: FilteredAccount[], sort: RegisterSort): FilteredAccount[] {
  const out = [...rows];
  switch (sort) {
    case 'oldest':
      out.sort((a, b) => latestTime(a) - latestTime(b));
      break;
    case 'company':
      out.sort((a, b) => a.account.companyName.localeCompare(b.account.companyName, undefined, { sensitivity: 'base' }));
      break;
    case 'quotes':
      out.sort((a, b) => b.visible.length - a.visible.length || latestTime(b) - latestTime(a));
      break;
    default:
      out.sort((a, b) => latestTime(b) - latestTime(a));
  }
  return out;
}

export interface FacetCounts {
  terms: Record<string, number>;
  models: Record<string, number>;
  optionCounts: Record<OptionCountBucket, number>;
  usersBands: Record<UsersBand, number>;
}

/** Quotes per facet value, using the same any-option semantics as the filters. */
export function facetCounts(quotes: RegisterQuote[]): FacetCounts {
  const counts: FacetCounts = {
    terms: {},
    models: {},
    optionCounts: { single: 0, multi: 0 },
    usersBands: { '1': 0, '2-5': 0, '6-10': 0, '10+': 0 },
  };
  quotes.forEach((q) => {
    counts.optionCounts[optionCountBucket(q.optionCount)] += 1;
    const terms = new Set<string>();
    const models = new Set<string>();
    const bands = new Set<UsersBand>();
    q.options.forEach((o) => {
      if (o.term) terms.add(o.term);
      models.add(o.model);
      const b = usersBand(o.users);
      if (b) bands.add(b);
    });
    terms.forEach((t) => (counts.terms[t] = (counts.terms[t] || 0) + 1));
    models.forEach((m) => (counts.models[m] = (counts.models[m] || 0) + 1));
    bands.forEach((b) => (counts.usersBands[b] += 1));
  });
  return counts;
}

/** "September 2026" for list dividers. */
export function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** True when a valid-until date is in the past (calendar day precision, UTC). */
export function validityLapsed(validUntil: string | null | undefined, now: Date = new Date()): boolean {
  if (!validUntil) return false;
  const d = new Date(validUntil);
  if (Number.isNaN(d.getTime())) return false;
  const endOfDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
  return now.getTime() > endOfDay;
}

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One line per option, in list order. Mirrors exactly what the register shows. */
export function buildRegisterCsv(rows: FilteredAccount[]): string {
  const header = [
    'Company', 'Quote reference', 'Version', 'Status', 'Prepared by', 'Contact', 'Contact email',
    'Quote date', 'Valid until', 'Currency', 'Option group', 'Term', 'Users', 'Projects', 'Hours', 'Price',
  ];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    r.visible.forEach((q) => {
      const base = [
        r.account.companyName, q.reference, q.version, STATUS_LABEL[q.status], q.preparedBy, q.contactName,
        q.contactEmail, q.quoteDate?.slice(0, 10) ?? '', q.validUntil?.slice(0, 10) ?? '', q.currency,
      ];
      if (q.options.length === 0) {
        lines.push([...base, '', '', '', '', '', ''].map(csvCell).join(','));
        return;
      }
      q.options.forEach((o) => {
        lines.push([...base, o.groupLabel, o.term, o.users ?? '', o.projects ?? '', o.hours, o.price ?? ''].map(csvCell).join(','));
      });
    });
  });
  return lines.join('\n');
}
