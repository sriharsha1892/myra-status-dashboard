import {
  accountKey,
  activeFilterCount,
  compactMoney,
  effectiveStatus,
  filterAccounts,
  filtersFromSearchParams,
  filtersToSearchParams,
  flattenOptions,
  groupByAccount,
  matchesFilters,
  normaliseStatus,
  optionCountBucket,
  parseMoney,
  usersBand,
  valueRange,
  EMPTY_FILTERS,
} from '../register';
import type { RegisterFilters, RegisterQuote, StoredPricingOption } from '../types';

const NOW = new Date('2026-09-22T12:00:00Z');

function quote(overrides: Partial<RegisterQuote> = {}): RegisterQuote {
  const options = overrides.options ?? [
    { groupLabel: 'Option A', model: 'per-seat', term: '1-Year', users: '3', projects: null, hours: '300', price: 45000 },
  ];
  return {
    id: 'q1',
    reference: 'MQ-20260901-AAAA',
    version: 1,
    companyName: 'Acme',
    contactName: 'Jane Doe',
    contactEmail: 'jane@acme.com',
    preparedBy: 'Satish Boini',
    currency: 'USD',
    status: 'draft',
    effectiveStatus: 'draft',
    createdAt: '2026-09-01T00:00:00Z',
    quoteDate: '2026-09-01',
    validUntil: '2026-10-01',
    downloadCount: 1,
    optionCount: options.length,
    valueMin: 45000,
    valueMax: 45000,
    options,
    ...overrides,
  };
}

describe('parseMoney', () => {
  it('strips formatting', () => {
    expect(parseMoney('45,000')).toBe(45000);
    expect(parseMoney('$12,500.50')).toBe(12500.5);
    expect(parseMoney(400000)).toBe(400000);
  });
  it('returns null for empty or junk', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney(NaN)).toBeNull();
  });
});

describe('normaliseStatus', () => {
  it('maps legacy statuses onto the lifecycle', () => {
    expect(normaliseStatus('downloaded')).toBe('draft');
    expect(normaliseStatus('signed')).toBe('accepted');
    expect(normaliseStatus(null)).toBe('draft');
    expect(normaliseStatus('sent')).toBe('sent');
    expect(normaliseStatus('garbage')).toBe('draft');
  });
});

describe('effectiveStatus', () => {
  it('expires open quotes past valid_until', () => {
    expect(effectiveStatus('draft', '2026-09-01', NOW)).toBe('expired');
    expect(effectiveStatus('sent', '2026-09-01', NOW)).toBe('expired');
  });
  it('keeps open quotes within validity', () => {
    expect(effectiveStatus('draft', '2026-10-01', NOW)).toBe('draft');
    expect(effectiveStatus('sent', '2026-09-22', NOW)).toBe('sent'); // valid through end of day
  });
  it('never expires terminal statuses', () => {
    expect(effectiveStatus('accepted', '2020-01-01', NOW)).toBe('accepted');
    expect(effectiveStatus('declined', '2020-01-01', NOW)).toBe('declined');
  });
  it('tolerates missing or bad dates', () => {
    expect(effectiveStatus('draft', null, NOW)).toBe('draft');
    expect(effectiveStatus('sent', 'not-a-date', NOW)).toBe('sent');
  });
});

describe('flattenOptions', () => {
  it('prefers structured pricing_options and flattens rows across groups', () => {
    const groups: StoredPricingOption[] = [
      {
        label: 'Option A: User-Based',
        pricingModel: 'per-seat',
        rows: [
          { term: '1-Year', users: '1', consultingHours: '100', listPrice: '', offerPrice: '12,500' },
          { term: '1-Year', users: '5', consultingHours: '100', listPrice: '', offerPrice: '50,000' },
        ],
      },
      {
        label: 'Option B: Project-Based',
        pricingModel: 'per-project',
        rows: [
          { term: '1-Year', namedUsers: 'Unlimited', projectsIncluded: '25', consultingHours: '25', listPrice: '', offerPrice: '30000' },
        ],
      },
    ];
    const out = flattenOptions(groups, [{ term: 'ignored', investment: '999' }]);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ groupLabel: 'Option A: User-Based', model: 'per-seat', users: '1', price: 12500 });
    expect(out[2]).toMatchObject({ groupLabel: 'Option B: Project-Based', model: 'per-project', users: 'Unlimited', projects: '25', price: 30000 });
  });

  it('falls back to legacy line_items', () => {
    const out = flattenOptions(null, [
      { term: '1-Year', users: '1', consultingHours: '100', investment: '18,000' },
      { term: '1-Year', users: '2', consultingHours: '200', investment: '30,000' },
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.price)).toEqual([18000, 30000]);
    expect(out[0].model).toBe('per-seat');
  });

  it('returns empty for nothing', () => {
    expect(flattenOptions(null, null)).toEqual([]);
    expect(flattenOptions([], [])).toEqual([]);
  });
});

describe('valueRange', () => {
  it('reports min and max, never a sum', () => {
    const opts = flattenOptions(null, [{ investment: '12,500' }, { investment: '50,000' }]);
    expect(valueRange(opts)).toEqual({ min: 12500, max: 50000 });
  });
  it('is null when no prices', () => {
    expect(valueRange([])).toEqual({ min: null, max: null });
  });
});

describe('usersBand', () => {
  it('bands seat counts', () => {
    expect(usersBand('1')).toBe('1');
    expect(usersBand('3')).toBe('2-5');
    expect(usersBand('10')).toBe('6-10');
    expect(usersBand('25')).toBe('10+');
    expect(usersBand('Unlimited')).toBe('10+');
    expect(usersBand('')).toBeNull();
    expect(usersBand(null)).toBeNull();
  });
});

describe('optionCountBucket', () => {
  it('splits single vs multi', () => {
    expect(optionCountBucket(1)).toBe('single');
    expect(optionCountBucket(0)).toBe('single');
    expect(optionCountBucket(3)).toBe('multi');
  });
});

describe('groupByAccount', () => {
  it('groups case/space-insensitively, newest first, accounts ordered by latest', () => {
    const accounts = groupByAccount([
      quote({ id: 'a1', companyName: 'Acme', createdAt: '2026-01-01T00:00:00Z', preparedBy: 'Satish Boini' }),
      quote({ id: 'b1', companyName: 'Beta Corp', createdAt: '2026-05-01T00:00:00Z' }),
      quote({ id: 'a2', companyName: ' acme ', createdAt: '2026-06-01T00:00:00Z', preparedBy: 'Kirandeep Kaur', contactName: 'Bob' }),
    ]);
    expect(accounts.map((a) => a.key)).toEqual(['acme', 'beta corp']);
    expect(accounts[0].quotes.map((q) => q.id)).toEqual(['a2', 'a1']);
    expect(accounts[0].latest.id).toBe('a2');
    expect(accounts[0].ams).toEqual(['Kirandeep Kaur', 'Satish Boini']);
    expect(accounts[0].contacts).toEqual(['Bob', 'Jane Doe']);
    expect(accountKey('  Foo   Bar ')).toBe('foo bar');
  });
});

describe('matchesFilters', () => {
  const multi = quote({
    id: 'm',
    options: [
      { groupLabel: 'A', model: 'per-seat', term: '1-Year', users: '1', projects: null, hours: '100', price: 12500 },
      { groupLabel: 'B', model: 'per-project', term: '2-Year', users: 'Unlimited', projects: '25', hours: '25', price: 30000 },
    ],
    optionCount: 2,
  });

  it('matches everything with empty filters', () => {
    expect(matchesFilters(multi, EMPTY_FILTERS, NOW)).toBe(true);
  });

  it('is OR within a facet', () => {
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, terms: ['3-Year', '2-Year'] }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, terms: ['3-Year'] }, NOW)).toBe(false);
  });

  it('is AND across facets', () => {
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, terms: ['1-Year'], models: ['per-project'] }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, terms: ['1-Year'], ams: ['Nobody'] }, NOW)).toBe(false);
  });

  it('matches option facets when ANY option satisfies', () => {
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, usersBands: ['10+'] }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, usersBands: ['2-5'] }, NOW)).toBe(false);
  });

  it('filters by option count, status, AM, date range and search', () => {
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, optionCounts: ['multi'] }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, optionCounts: ['single'] }, NOW)).toBe(false);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, statuses: ['draft'] }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, statuses: ['expired'] }, NOW)).toBe(false);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, ams: ['Satish Boini'] }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, dateRange: '30d' }, NOW)).toBe(true);
    expect(matchesFilters(quote({ createdAt: '2025-01-01T00:00:00Z' }), { ...EMPTY_FILTERS, dateRange: '90d' }, NOW)).toBe(false);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, search: 'jane@' }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, search: 'MQ-2026' }, NOW)).toBe(true);
    expect(matchesFilters(multi, { ...EMPTY_FILTERS, search: 'zzz' }, NOW)).toBe(false);
  });
});

describe('filterAccounts', () => {
  it('drops accounts with no visible quote and counts hidden versions', () => {
    const accounts = groupByAccount([
      quote({ id: 'a1', companyName: 'Acme', preparedBy: 'Satish Boini' }),
      quote({ id: 'a2', companyName: 'Acme', preparedBy: 'Kirandeep Kaur', createdAt: '2026-08-01T00:00:00Z' }),
      quote({ id: 'b1', companyName: 'Beta', preparedBy: 'Kirandeep Kaur' }),
    ]);
    const out = filterAccounts(accounts, { ...EMPTY_FILTERS, ams: ['Satish Boini'] }, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].account.companyName).toBe('Acme');
    expect(out[0].visible.map((q) => q.id)).toEqual(['a1']);
    expect(out[0].hidden).toBe(1);
  });
});

describe('URL round trip', () => {
  it('serialises and parses filters, dropping unknown values', () => {
    const f: RegisterFilters = {
      search: 'ceva',
      ams: ['Satish Boini', 'Kirandeep Kaur'],
      statuses: ['draft', 'expired'],
      terms: ['1-Year'],
      models: ['per-project'],
      optionCounts: ['multi'],
      usersBands: ['2-5', '10+'],
      dateRange: '90d',
    };
    const params = filtersToSearchParams(f);
    expect(filtersFromSearchParams(params)).toEqual(f);
    expect(activeFilterCount(f)).toBe(11);

    const dirty = new URLSearchParams('status=draft,bogus&model=nope&range=weird');
    expect(filtersFromSearchParams(dirty)).toEqual({ ...EMPTY_FILTERS, statuses: ['draft'] });
    expect(filtersToSearchParams(EMPTY_FILTERS).toString()).toBe('');
  });
});

describe('compactMoney', () => {
  it('formats compactly without a symbol', () => {
    expect(compactMoney(45000)).toBe('45K');
    expect(compactMoney(12500)).toBe('12.5K');
    expect(compactMoney(1250000)).toBe('1.25M');
    expect(compactMoney(800)).toBe('800');
    expect(compactMoney(null)).toBe('—');
  });
});
