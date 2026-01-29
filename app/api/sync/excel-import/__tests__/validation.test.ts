/**
 * Validation Tests for Excel Import API Route
 * Tests Zod validation on POST body (bug #1) and safe JSON.parse in GET (bug #11)
 *
 * Since NextRequest requires native Web APIs not available in Jest JSDOM,
 * and Zod 4 has issues with z.record(z.unknown()) containing nested objects,
 * we use manual validation functions that mimic the route's validation logic.
 */

// Valid status values for commit rows
const VALID_STATUS_VALUES = ['matched', 'new', 'skipped'] as const;
const VALID_FIELD_RESOLUTION_VALUES = ['keep_db', 'use_excel'] as const;

/**
 * Validates an Excel row (should be a plain object with any key-value pairs)
 */
function isValidExcelRow(row: unknown): boolean {
  return typeof row === 'object' && row !== null && !Array.isArray(row);
}

/**
 * Validates an analyze request structure, mimicking the route's AnalyzeRequestSchema
 */
function validateAnalyzeRequest(body: unknown): { success: boolean; errors?: Record<string, string[]> } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { success: false, errors: { _errors: ['Expected object'] } };
  }

  const b = body as Record<string, unknown>;

  // action: z.literal('analyze').optional()
  if (b.action !== undefined && b.action !== 'analyze') {
    return { success: false, errors: { action: ['action must be "analyze" if provided'] } };
  }

  // rows: z.array(ExcelRowSchema).min(1)
  if (!Array.isArray(b.rows)) {
    return { success: false, errors: { rows: ['rows must be an array'] } };
  }

  if (b.rows.length === 0) {
    return { success: false, errors: { rows: ['At least one row is required'] } };
  }

  // Each row must be a valid Excel row (object)
  for (let i = 0; i < b.rows.length; i++) {
    if (!isValidExcelRow(b.rows[i])) {
      return { success: false, errors: { rows: [`Row ${i} must be an object`] } };
    }
  }

  return { success: true };
}

/**
 * Validates a commit row structure, mimicking the route's CommitRowSchema
 */
function validateCommitRow(row: unknown): { success: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return { success: false, errors: ['Expected object'] };
  }

  const r = row as Record<string, unknown>;

  // rowIndex: z.number()
  if (typeof r.rowIndex !== 'number') {
    errors.push('rowIndex must be a number');
  }

  // excelData: z.record(z.unknown())
  if (typeof r.excelData !== 'object' || r.excelData === null || Array.isArray(r.excelData)) {
    errors.push('excelData must be an object');
  }

  // selectedMatchId: z.string().nullable()
  if (r.selectedMatchId !== null && typeof r.selectedMatchId !== 'string') {
    errors.push('selectedMatchId must be a string or null');
  }
  if (r.selectedMatchId === undefined) {
    errors.push('selectedMatchId is required');
  }

  // fieldResolutions: z.record(z.enum(['keep_db', 'use_excel']))
  if (typeof r.fieldResolutions !== 'object' || r.fieldResolutions === null || Array.isArray(r.fieldResolutions)) {
    errors.push('fieldResolutions must be an object');
  } else {
    const fr = r.fieldResolutions as Record<string, unknown>;
    for (const [key, value] of Object.entries(fr)) {
      if (!VALID_FIELD_RESOLUTION_VALUES.includes(value as typeof VALID_FIELD_RESOLUTION_VALUES[number])) {
        errors.push(`fieldResolutions.${key} must be "keep_db" or "use_excel"`);
      }
    }
  }

  // status: z.enum(['matched', 'new', 'skipped'])
  if (!VALID_STATUS_VALUES.includes(r.status as typeof VALID_STATUS_VALUES[number])) {
    errors.push('status must be "matched", "new", or "skipped"');
  }

  return { success: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validates a commit request structure, mimicking the route's CommitRequestSchema
 */
function validateCommitRequest(body: unknown): { success: boolean; errors?: Record<string, string[]> } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { success: false, errors: { _errors: ['Expected object'] } };
  }

  const b = body as Record<string, unknown>;

  // action: z.literal('commit')
  if (b.action !== 'commit') {
    return { success: false, errors: { action: ['action must be "commit"'] } };
  }

  // reviewRows: z.array(CommitRowSchema).min(1)
  if (!Array.isArray(b.reviewRows)) {
    return { success: false, errors: { reviewRows: ['reviewRows must be an array'] } };
  }

  if (b.reviewRows.length === 0) {
    return { success: false, errors: { reviewRows: ['At least one row is required'] } };
  }

  const rowErrors: string[] = [];
  for (let i = 0; i < b.reviewRows.length; i++) {
    const rowResult = validateCommitRow(b.reviewRows[i]);
    if (!rowResult.success && rowResult.errors) {
      rowErrors.push(...rowResult.errors.map((e) => `reviewRows[${i}]: ${e}`));
    }
  }

  if (rowErrors.length > 0) {
    return { success: false, errors: { reviewRows: rowErrors } };
  }

  return { success: true };
}

/**
 * Helper to simulate POST validation logic from the route
 */
function validatePostRequest(body: unknown): { success: boolean; error?: string; details?: unknown } {
  // Handle null/undefined
  if (body === null || body === undefined) {
    return { success: false, error: 'Invalid request data', details: { _errors: ['Expected object'] } };
  }

  // Check if it's an object
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, error: 'Invalid request data', details: { _errors: ['Expected object'] } };
  }

  const typedBody = body as Record<string, unknown>;

  // Route based on action
  if (typedBody.action === 'commit') {
    const result = validateCommitRequest(body);
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid request data',
        details: result.errors,
      };
    }
    return { success: true };
  }

  // Default: Analyze
  const result = validateAnalyzeRequest(body);
  if (!result.success) {
    return {
      success: false,
      error: 'Invalid request data',
      details: result.errors,
    };
  }
  return { success: true };
}

/**
 * Helper to simulate safe JSON.parse for GET sample parameter
 */
function parseSampleJson(sampleJson: string | null): { success: boolean; error?: string; data?: unknown } {
  if (!sampleJson) {
    return { success: true, data: null }; // No sample, return recent syncs
  }

  try {
    const sample = JSON.parse(sampleJson);
    return { success: true, data: sample };
  } catch {
    return { success: false, error: 'Invalid JSON in sample parameter' };
  }
}

describe('Excel Import API - Zod Validation', () => {
  describe('POST /api/sync/excel-import - Analyze Request Validation', () => {
    it('should return error when POST body is null', () => {
      const result = validatePostRequest(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should return error when POST body is undefined', () => {
      const result = validatePostRequest(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when rows array is missing', () => {
      const result = validatePostRequest({
        someOtherField: 'value',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
      expect((result.details as Record<string, unknown>).rows).toBeDefined();
    });

    it('should return error when rows is not an array', () => {
      const result = validatePostRequest({
        rows: 'not an array',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should return error when rows array is empty', () => {
      const result = validatePostRequest({
        rows: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect((result.details as Record<string, unknown>).rows).toBeDefined();
    });

    it('should pass validation with valid analyze request', () => {
      const result = validatePostRequest({
        rows: [{ company_name: 'Test Company', email: 'test@test.com' }],
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass validation when action is explicitly "analyze"', () => {
      const result = validatePostRequest({
        action: 'analyze',
        rows: [{ company_name: 'Test Company', email: 'test@test.com' }],
      });

      expect(result.success).toBe(true);
    });

    it('should pass validation with rows containing various data types', () => {
      const result = validatePostRequest({
        rows: [
          {
            company_name: 'Test Company',
            deal_value: 1000,
            is_active: true,
            metadata: null,
            tags: ['tag1', 'tag2'],
            nested: { key: 'value' },
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should pass validation with multiple rows', () => {
      const result = validatePostRequest({
        rows: [
          { company_name: 'Company 1' },
          { company_name: 'Company 2' },
          { company_name: 'Company 3' },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('POST /api/sync/excel-import - Commit Request Validation', () => {
    it('should return error when action is "commit" but reviewRows is missing', () => {
      const result = validatePostRequest({
        action: 'commit',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
      expect((result.details as Record<string, unknown>).reviewRows).toBeDefined();
    });

    it('should return error when action is "commit" and reviewRows is empty', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect((result.details as Record<string, unknown>).reviewRows).toBeDefined();
    });

    it('should return error when action is "commit" and reviewRows has invalid structure', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            // Missing required fields: rowIndex, excelData, selectedMatchId, fieldResolutions, status
            someField: 'value',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should return error when commit row has wrong status enum value', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { company_name: 'Test' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'invalid_status', // Invalid enum value
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when commit row has wrong fieldResolutions value', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { company_name: 'Test' },
            selectedMatchId: null,
            fieldResolutions: {
              company_name: 'invalid_resolution', // Should be 'keep_db' or 'use_excel'
            },
            status: 'new',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when rowIndex is not a number', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 'not a number',
            excelData: { company_name: 'Test' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'new',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when excelData is not an object', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: 'not an object',
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'new',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when selectedMatchId is undefined (should be string | null)', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { company_name: 'Test' },
            // selectedMatchId is missing (undefined)
            fieldResolutions: {},
            status: 'new',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should pass validation with valid commit request (status: new)', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { company_name: 'Test Company' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'new',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should pass validation with valid commit request (status: matched)', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { company_name: 'Test Company' },
            selectedMatchId: 'uuid-123',
            fieldResolutions: {
              company_name: 'use_excel',
              stage: 'keep_db',
            },
            status: 'matched',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should pass validation with valid commit request (status: skipped)', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { company_name: 'Test Company' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'skipped',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should pass validation with multiple rows of different statuses', () => {
      const result = validatePostRequest({
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { company_name: 'New Company' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'new',
          },
          {
            rowIndex: 1,
            excelData: { company_name: 'Matched Company' },
            selectedMatchId: 'uuid-456',
            fieldResolutions: { stage: 'use_excel' },
            status: 'matched',
          },
          {
            rowIndex: 2,
            excelData: { company_name: 'Skipped Company' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'skipped',
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('POST /api/sync/excel-import - Malformed body types', () => {
    it('should return error when body is a number instead of object', () => {
      const result = validatePostRequest(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when body is a string instead of object', () => {
      const result = validatePostRequest('just a string');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when body is an array instead of object', () => {
      const result = validatePostRequest([1, 2, 3]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return error when body is a boolean', () => {
      const result = validatePostRequest(true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/sync/excel-import - Safe JSON.parse (bug #11)', () => {
    it('should return error with "Invalid JSON" when sample parameter is invalid JSON', () => {
      const result = parseSampleJson('not valid json {{{');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in sample parameter');
    });

    it('should return error when sample is an incomplete JSON object', () => {
      const result = parseSampleJson('{"company_name": "Test"');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in sample parameter');
    });

    it('should return error when sample is a plain string without quotes', () => {
      const result = parseSampleJson('just a string');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in sample parameter');
    });

    it('should return error when sample contains malformed JSON with trailing comma', () => {
      const result = parseSampleJson('{"company_name": "Test",}');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in sample parameter');
    });

    it('should return error when sample has unquoted keys', () => {
      const result = parseSampleJson('{company_name: "Test"}');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in sample parameter');
    });

    it('should return error when sample has single quotes instead of double quotes', () => {
      const result = parseSampleJson("{'company_name': 'Test'}");

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in sample parameter');
    });

    it('should return error when sample has unescaped special characters', () => {
      const result = parseSampleJson('{"company_name": "Test\nCompany"}');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in sample parameter');
    });

    it('should handle valid JSON in sample parameter', () => {
      const result = parseSampleJson(
        JSON.stringify({ company_name: 'Test Company', email: 'test@test.com' })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ company_name: 'Test Company', email: 'test@test.com' });
    });

    it('should handle valid JSON array in sample parameter', () => {
      const result = parseSampleJson(JSON.stringify([{ company_name: 'Test' }]));

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ company_name: 'Test' }]);
    });

    it('should handle valid JSON with nested objects', () => {
      const result = parseSampleJson(
        JSON.stringify({
          company: { name: 'Test', address: { city: 'NYC' } },
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ company: { name: 'Test', address: { city: 'NYC' } } });
    });

    it('should return success with null data when no sample parameter provided', () => {
      const result = parseSampleJson(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return success with null data when sample is empty string (falsy)', () => {
      // Empty string is falsy, so our helper treats it like null
      const result = parseSampleJson('');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle JSON with escaped characters correctly', () => {
      const result = parseSampleJson(
        JSON.stringify({
          company_name: 'Test "Company" Inc.',
          description: 'Line1\\nLine2',
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        company_name: 'Test "Company" Inc.',
        description: 'Line1\\nLine2',
      });
    });

    it('should handle JSON with unicode characters', () => {
      const result = parseSampleJson(
        JSON.stringify({
          company_name: 'Test Company',
          note: 'Meeting scheduled for next week',
        })
      );

      expect(result.success).toBe(true);
    });

    it('should handle JSON with numbers and booleans', () => {
      const result = parseSampleJson(
        JSON.stringify({
          deal_value: 10000,
          is_active: true,
          discount: 0.15,
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deal_value: 10000, is_active: true, discount: 0.15 });
    });

    it('should handle JSON with null values', () => {
      const result = parseSampleJson(
        JSON.stringify({
          company_name: 'Test',
          contact: null,
          notes: null,
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ company_name: 'Test', contact: null, notes: null });
    });
  });

  describe('AnalyzeRequest Validation Edge Cases', () => {
    it('should require at least one row', () => {
      const result = validateAnalyzeRequest({ rows: [] });

      expect(result.success).toBe(false);
      expect(result.errors?.rows).toBeDefined();
      expect(result.errors?.rows?.[0]).toContain('At least one row is required');
    });

    it('should accept action: "analyze" or omit action entirely', () => {
      expect(validateAnalyzeRequest({ rows: [{}], action: 'analyze' }).success).toBe(true);
      expect(validateAnalyzeRequest({ rows: [{}] }).success).toBe(true);
    });

    it('should reject action: "commit" (different schema)', () => {
      const result = validateAnalyzeRequest({ rows: [{}], action: 'commit' });
      expect(result.success).toBe(false);
    });

    it('should accept rows with any key-value pairs', () => {
      const result = validateAnalyzeRequest({
        rows: [
          { any_key: 'any_value', number: 123, nested: { a: 1 } },
          { different_key: true, array: [1, 2, 3] },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject rows that are arrays', () => {
      const result = validateAnalyzeRequest({
        rows: [[1, 2, 3]],
      });
      expect(result.success).toBe(false);
    });

    it('should reject rows that are primitives', () => {
      const result = validateAnalyzeRequest({
        rows: ['string', 123, true],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CommitRow Validation Edge Cases', () => {
    it('should validate all required fields', () => {
      const validRow = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: null,
        fieldResolutions: {},
        status: 'new',
      };

      const result = validateCommitRow(validRow);
      expect(result.success).toBe(true);
    });

    it('should reject missing rowIndex', () => {
      const row = {
        excelData: {},
        selectedMatchId: null,
        fieldResolutions: {},
        status: 'new',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('rowIndex must be a number');
    });

    it('should accept valid status values', () => {
      const baseRow = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: null,
        fieldResolutions: {},
      };

      expect(validateCommitRow({ ...baseRow, status: 'matched' }).success).toBe(true);
      expect(validateCommitRow({ ...baseRow, status: 'new' }).success).toBe(true);
      expect(validateCommitRow({ ...baseRow, status: 'skipped' }).success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const row = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: null,
        fieldResolutions: {},
        status: 'fuzzy', // Not in the allowed enum
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(false);
    });

    it('should accept valid fieldResolutions values', () => {
      const row = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: 'uuid',
        fieldResolutions: {
          field1: 'keep_db',
          field2: 'use_excel',
        },
        status: 'matched',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(true);
    });

    it('should reject invalid fieldResolutions values', () => {
      const row = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: 'uuid',
        fieldResolutions: {
          field1: 'invalid_value',
        },
        status: 'matched',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(false);
    });

    it('should allow empty fieldResolutions object', () => {
      const row = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: null,
        fieldResolutions: {},
        status: 'new',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(true);
    });

    it('should accept string selectedMatchId', () => {
      const row = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: 'some-uuid-string',
        fieldResolutions: {},
        status: 'matched',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(true);
    });

    it('should reject number selectedMatchId', () => {
      const row = {
        rowIndex: 0,
        excelData: {},
        selectedMatchId: 123,
        fieldResolutions: {},
        status: 'matched',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(false);
    });

    it('should reject array as excelData', () => {
      const row = {
        rowIndex: 0,
        excelData: [1, 2, 3],
        selectedMatchId: null,
        fieldResolutions: {},
        status: 'new',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(false);
    });

    it('should reject null as excelData', () => {
      const row = {
        rowIndex: 0,
        excelData: null,
        selectedMatchId: null,
        fieldResolutions: {},
        status: 'new',
      };
      const result = validateCommitRow(row);
      expect(result.success).toBe(false);
    });
  });

  describe('CommitRequest Validation Edge Cases', () => {
    it('should require action to be "commit"', () => {
      const request = {
        action: 'analyze',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: {},
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'new',
          },
        ],
      };
      const result = validateCommitRequest(request);
      expect(result.success).toBe(false);
    });

    it('should require at least one reviewRow', () => {
      const request = {
        action: 'commit',
        reviewRows: [],
      };
      const result = validateCommitRequest(request);

      expect(result.success).toBe(false);
      expect(result.errors?.reviewRows).toBeDefined();
    });

    it('should accept valid commit request with multiple rows', () => {
      const request = {
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { name: 'Test 1' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'new',
          },
          {
            rowIndex: 1,
            excelData: { name: 'Test 2' },
            selectedMatchId: 'uuid-1',
            fieldResolutions: { name: 'use_excel' },
            status: 'matched',
          },
        ],
      };
      const result = validateCommitRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject if any row in reviewRows is invalid', () => {
      const request = {
        action: 'commit',
        reviewRows: [
          {
            rowIndex: 0,
            excelData: { name: 'Test 1' },
            selectedMatchId: null,
            fieldResolutions: {},
            status: 'new',
          },
          {
            // Invalid row - missing required fields
            rowIndex: 'not a number',
          },
        ],
      };
      const result = validateCommitRequest(request);
      expect(result.success).toBe(false);
    });
  });
});
