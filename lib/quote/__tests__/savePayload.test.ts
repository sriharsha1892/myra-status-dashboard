import { buildPricingOptions, buildQuoteSavePayload } from '../savePayload';
import { quoteSavePayloadSchema } from '@/lib/validation/schemas/quote';
import { DEFAULT_QUOTE_FORM, createPricingOptionGroup } from '../constants';
import { flattenOptions, valueRange } from '../register';
import type { QuoteFormData } from '../types';

function baseForm(overrides: Partial<QuoteFormData> = {}): QuoteFormData {
  return {
    ...DEFAULT_QUOTE_FORM,
    preparedFor: 'CEVA Logistics',
    contactName: 'Jane Doe',
    contactEmail: 'jane@ceva.com',
    quoteDate: '2026-09-22',
    validUntil: '2026-10-22',
    currency: 'USD',
    preparedBy: 'Satish Boini',
    rows: [
      { term: '1-Year', users: '1', consultingHours: '100', listPrice: '15000', offerPrice: '12500' },
      { term: '1-Year', users: '5', consultingHours: '100', listPrice: '60000', offerPrice: '50000' },
      { term: '', users: '', consultingHours: '', listPrice: '', offerPrice: '' }, // blank row ignored
    ],
    ...overrides,
  };
}

describe('buildPricingOptions', () => {
  it('wraps single-mode rows in one per-seat group and drops blank rows', () => {
    const groups = buildPricingOptions(baseForm());
    expect(groups).toHaveLength(1);
    expect(groups[0].pricingModel).toBe('per-seat');
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[0].rows[1].offerPrice).toBe('50000');
  });

  it('persists every multi-option group, including per-project rows', () => {
    const seat = createPricingOptionGroup('per-seat', 0);
    seat.rows = [{ term: '1-Year', users: '3', consultingHours: '300', listPrice: '', offerPrice: '45000' }];
    const project = createPricingOptionGroup('per-project', 1);
    project.ppuRows = [
      { term: '1-Year', namedUsers: 'Unlimited', projectsIncluded: '25', consultingHours: '25', listPrice: '', offerPrice: '30000', overageRate: '900' },
    ];
    const groups = buildPricingOptions(baseForm({ pricingOptions: [seat, project] }));
    expect(groups.map((g) => g.pricingModel)).toEqual(['per-seat', 'per-project']);
    expect(groups[1].label).toBe('Option B: Project-Based');
    expect(groups[1].rows[0]).toMatchObject({ namedUsers: 'Unlimited', projectsIncluded: '25', offerPrice: '30000', overageRate: '900' });
    expect(groups[1].scopeDefinition).toBeTruthy();
  });
});

describe('buildQuoteSavePayload', () => {
  it('produces a payload the API schema accepts, with a value range instead of a sum', () => {
    const payload = buildQuoteSavePayload(baseForm(), 'MQ-20260922-TEST');
    const parsed = quoteSavePayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    expect(payload).not.toHaveProperty('totalValue');
    expect(payload.lineItems).toEqual([
      { term: '1-Year', users: '1', consultingHours: '100', investment: '12500' },
      { term: '1-Year', users: '5', consultingHours: '100', investment: '50000' },
    ]);

    const options = flattenOptions(payload.pricingOptions, null);
    expect(valueRange(options)).toEqual({ min: 12500, max: 50000 });
  });

  it('rejects a payload with no options', () => {
    const payload = buildQuoteSavePayload(
      baseForm({ rows: [{ term: '', users: '', consultingHours: '', listPrice: '', offerPrice: '' }] }),
      'MQ-20260922-EMPTY'
    );
    expect(quoteSavePayloadSchema.safeParse(payload).success).toBe(false);
  });
});
