/**
 * Demo and Pipeline Data Mapper
 * Maps Excel columns to database fields for demo_events and sales_pipeline tables
 */

export interface ExcelRow {
  [key: string]: string | number | null | undefined;
}

export interface DemoEventData {
  external_id: string;
  company_name: string;
  contact_email: string | null;
  contact_name: string | null;
  contact_title: string | null;
  demo_date: string;
  demo_time: string | null;
  demo_status: 'scheduled' | 'completed' | 'cancelled';
  sales_poc: string;
  demo_rating: number | null;
}

export interface SalesPipelineData {
  external_id: string;
  company_name: string;
  primary_email: string;
  client_name: string | null;
  contact_title: string | null;
  stage: string;
  trial_status: string | null;
  deal_value: number | null;
  deal_value_inr: number | null;
  currency: string;
  employee_name: string;
  expected_close: string | null;
  extra_data: Record<string, unknown>;
}

export interface MappedData {
  demo: DemoEventData | null;
  pipeline: SalesPipelineData | null;
  errors: string[];
}

// Column name normalization mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  id: ['id', 'id (don\'t edit)', 'demo_id', 'external_id'],
  date: ['date', 'demo_date', 'demo date'],
  time: ['time', 'demo_time', 'demo time'],
  sales_poc: ['sales poc', 'sales_poc', 'am', 'account manager', 'employee', 'employee_name'],
  email: ['email', 'email (primary contact)', 'primary_email', 'contact_email', 'primary email'],
  company_name: ['company name', 'company_name', 'org', 'organization', 'org_name'],
  contact_title: ['title/role', 'title', 'role', 'contact_title', 'title/role (primary contact)'],
  domain: ['domain', 'industry', 'vertical'],
  demo_status: ['demo status', 'demo_status', 'status'],
  stage: ['stage', 'pipeline_stage', 'deal_stage'],
  arr: ['arr', 'annual_revenue', 'annual revenue'],
  deal_value: ['deal value', 'deal_value', 'deal value (total booking)', 'amount', 'value'],
  closing_month: ['closing month', 'closing_month', 'expected_close', 'close_date'],
};

// Stage normalization mapping
const STAGE_MAP: Record<string, string> = {
  'intro': 'intro',
  'introduction': 'intro',
  'demo': 'demo',
  'demo done': 'demo',
  'pending trial': 'pending_trial',
  'pending_trial': 'pending_trial',
  'trial': 'trial',
  'trial access': 'trial',
  'feedback': 'feedback',
  'feedback call': 'feedback',
  'proposal': 'proposal',
  'quote': 'proposal',
  'nego': 'nego',
  'negotiation': 'nego',
  'won': 'won',
  'closed won': 'won',
  'onboarded': 'won',
  'completed': 'won',
  'lost': 'lost',
  'closed lost': 'lost',
};

// Demo status normalization
const DEMO_STATUS_MAP: Record<string, 'scheduled' | 'completed' | 'cancelled'> = {
  'scheduled': 'scheduled',
  'pending': 'scheduled',
  'upcoming': 'scheduled',
  'completed': 'completed',
  'done': 'completed',
  'finished': 'completed',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'no show': 'cancelled',
};

/**
 * Find the column value by checking all possible aliases
 */
function getColumnValue(row: ExcelRow, field: string): string | number | null {
  const aliases = COLUMN_ALIASES[field] || [field];

  for (const alias of aliases) {
    // Check exact match (case-insensitive)
    const key = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === alias.toLowerCase()
    );
    if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key] as string | number;
    }
  }

  return null;
}

/**
 * Parse date from various formats
 */
function parseDate(value: string | number | null): string | null {
  if (!value) return null;

  const str = String(value).trim();

  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }

  // Try "Tuesday, 2 December 2025" format
  const longMatch = str.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*(\d{1,2})\s+(\w+)\s+(\d{4})/i
  );
  if (longMatch) {
    const [, day, month, year] = longMatch;
    const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Try "Dec 2, 2025" or "December 2, 2025" format
  const shortMatch = str.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (shortMatch) {
    const [, month, day, year] = shortMatch;
    const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Try "2/12/2025" or "12/2/2025" (assume MM/DD/YYYY for US)
  const slashMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parse time from various formats
 */
function parseTime(value: string | number | null): string | null {
  if (!value) return null;

  const str = String(value).trim();

  // HH:MM format
  const timeMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let [, hours, minutes, period] = timeMatch;
    let h = parseInt(hours, 10);

    if (period) {
      if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    }

    return `${String(h).padStart(2, '0')}:${minutes}:00`;
  }

  return null;
}

/**
 * Parse currency value
 */
function parseCurrency(value: string | number | null): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') return value;

  // Remove currency symbols and commas
  const cleaned = String(value)
    .replace(/[$€£₹,\s]/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Normalize stage value
 */
function normalizeStage(value: string | null): string {
  if (!value) return 'intro';

  const normalized = value.toLowerCase().trim();
  return STAGE_MAP[normalized] || 'intro';
}

/**
 * Normalize demo status
 */
function normalizeDemoStatus(
  value: string | null
): 'scheduled' | 'completed' | 'cancelled' {
  if (!value) return 'scheduled';

  const normalized = value.toLowerCase().trim();
  return DEMO_STATUS_MAP[normalized] || 'scheduled';
}

/**
 * Map a single Excel row to demo and pipeline data
 */
export function mapExcelRow(row: ExcelRow, rowIndex: number): MappedData {
  const errors: string[] = [];

  // Extract values
  const id = getColumnValue(row, 'id');
  const date = getColumnValue(row, 'date');
  const time = getColumnValue(row, 'time');
  const salesPoc = getColumnValue(row, 'sales_poc');
  const email = getColumnValue(row, 'email');
  const companyName = getColumnValue(row, 'company_name');
  const contactTitle = getColumnValue(row, 'contact_title');
  const domain = getColumnValue(row, 'domain');
  const demoStatus = getColumnValue(row, 'demo_status');
  const stage = getColumnValue(row, 'stage');
  const arr = getColumnValue(row, 'arr');
  const dealValue = getColumnValue(row, 'deal_value');
  const closingMonth = getColumnValue(row, 'closing_month');

  // Validate required fields
  if (!companyName) {
    errors.push(`Row ${rowIndex + 1}: Missing company name`);
  }

  if (!salesPoc) {
    errors.push(`Row ${rowIndex + 1}: Missing sales POC`);
  }

  if (!date) {
    errors.push(`Row ${rowIndex + 1}: Missing demo date`);
  }

  // Parse values
  const parsedDate = parseDate(date);
  const parsedTime = parseTime(time);
  const parsedDealValue = parseCurrency(dealValue);
  const parsedArr = parseCurrency(arr);

  // Build external ID
  const externalId = id ? String(id) : `ROW-${rowIndex + 1}`;

  // Create demo event data
  const demo: DemoEventData | null =
    companyName && salesPoc && parsedDate
      ? {
          external_id: externalId,
          company_name: String(companyName),
          contact_email: email ? String(email) : null,
          contact_name: null,
          contact_title: contactTitle ? String(contactTitle) : null,
          demo_date: parsedDate,
          demo_time: parsedTime,
          demo_status: normalizeDemoStatus(demoStatus ? String(demoStatus) : null),
          sales_poc: String(salesPoc),
          demo_rating: null,
        }
      : null;

  // Create pipeline data
  const pipeline: SalesPipelineData | null =
    companyName && email
      ? {
          external_id: externalId,
          company_name: String(companyName),
          primary_email: String(email),
          client_name: null,
          contact_title: contactTitle ? String(contactTitle) : null,
          stage: normalizeStage(stage ? String(stage) : null),
          trial_status: null,
          deal_value: parsedDealValue,
          deal_value_inr: parsedDealValue ? parsedDealValue * 83 : null, // Rough USD to INR
          currency: 'USD',
          employee_name: String(salesPoc || 'Unknown'),
          expected_close: closingMonth ? String(closingMonth) : null,
          extra_data: {
            domain: domain ? String(domain) : null,
            arr: parsedArr,
            original_stage: stage ? String(stage) : null,
            original_demo_status: demoStatus ? String(demoStatus) : null,
          },
        }
      : null;

  return { demo, pipeline, errors };
}

/**
 * Map multiple Excel rows
 */
export function mapExcelData(rows: ExcelRow[]): {
  demos: DemoEventData[];
  pipeline: SalesPipelineData[];
  errors: string[];
  summary: {
    totalRows: number;
    validDemos: number;
    validPipeline: number;
    errorCount: number;
  };
} {
  const demos: DemoEventData[] = [];
  const pipeline: SalesPipelineData[] = [];
  const allErrors: string[] = [];

  rows.forEach((row, index) => {
    const { demo, pipeline: pipelineData, errors } = mapExcelRow(row, index);

    if (demo) demos.push(demo);
    if (pipelineData) pipeline.push(pipelineData);
    allErrors.push(...errors);
  });

  return {
    demos,
    pipeline,
    errors: allErrors,
    summary: {
      totalRows: rows.length,
      validDemos: demos.length,
      validPipeline: pipeline.length,
      errorCount: allErrors.length,
    },
  };
}

/**
 * Get detected columns from a sample row
 */
export function detectColumns(sampleRow: ExcelRow): {
  detected: string[];
  unmapped: string[];
} {
  const detected: string[] = [];
  const unmapped: string[] = [];

  Object.keys(sampleRow).forEach((col) => {
    let found = false;

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (
        aliases.some((alias) => alias.toLowerCase() === col.toLowerCase().trim())
      ) {
        detected.push(`${col} → ${field}`);
        found = true;
        break;
      }
    }

    if (!found) {
      unmapped.push(col);
    }
  });

  return { detected, unmapped };
}
