/**
 * ExcelImportSection Header Detection and Warning System Tests
 * Tests for bug #9: Fragile header detection fix
 *
 * The component now validates detected columns and shows warnings
 * when they don't match expected format.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { validateDetectedColumns } from '../ExcelImportSection';
import ExcelImportSection from '../ExcelImportSection';

// Mock xlsx library
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

// Mock ExcelReviewModal
jest.mock('../ExcelReviewModal', () => ({
  __esModule: true,
  default: () => <div data-testid="review-modal">Review Modal</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Upload: () => <span data-testid="icon-upload">Upload</span>,
  FileSpreadsheet: () => <span data-testid="icon-spreadsheet">FileSpreadsheet</span>,
  CheckCircle: () => <span data-testid="icon-check">CheckCircle</span>,
  XCircle: () => <span data-testid="icon-x-circle">XCircle</span>,
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
  AlertCircle: () => <span data-testid="icon-alert">AlertCircle</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
  ChevronDown: () => <span data-testid="icon-chevron-down">ChevronDown</span>,
  ChevronUp: () => <span data-testid="icon-chevron-up">ChevronUp</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
  ClipboardPaste: () => <span data-testid="icon-paste">ClipboardPaste</span>,
  FileUp: () => <span data-testid="icon-file-up">FileUp</span>,
}));

describe('validateDetectedColumns', () => {
  describe('valid columns that should pass without warning', () => {
    it('passes columns with expected keywords: company_name, email, stage, deal_value', () => {
      const columns = ['company_name', 'email', 'stage', 'deal_value'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeNull();
    });

    it('passes columns with mixed case and various keywords', () => {
      const columns = ['Company_Name', 'Contact_Email', 'Demo_Date', 'Sales_POC', 'Deal_Value'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeNull();
    });

    it('passes FIXED_COLUMNS-style columns', () => {
      const columns = [
        'external_id',
        'demo_date',
        'demo_time',
        'sales_poc',
        'contact_email',
        'company_name',
        'demo_status',
        'stage',
        'deal_value',
      ];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeNull();
    });

    it('passes with at least 3 matching keywords', () => {
      const columns = ['company', 'email', 'status'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeNull();
    });
  });

  describe('columns that should trigger warnings', () => {
    it('warns for generic column names like A, B, C, D', () => {
      const columns = ['A', 'B', 'C', 'D'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true); // Still allows import but warns
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain('Column headers may not match expected format');
      expect(result.warning).toContain('A, B, C, D');
    });

    it('warns for numeric column names', () => {
      const columns = ['Column1', 'Column2', 'Column3', 'Column4'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain('Column headers may not match expected format');
    });

    it('warns for random unrecognized column names', () => {
      const columns = ['foo', 'bar', 'baz', 'qux'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain('Expected columns like: company_name, email, stage, deal_value');
    });

    it('truncates warning for more than 5 columns', () => {
      const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain('...');
      // Should only show first 5 columns in the "Found columns:" section
      expect(result.warning).toContain('A, B, C, D, E');
      // F, G, H should not appear in the column list (only shows first 5)
      expect(result.warning).not.toContain('G');
      expect(result.warning).not.toContain('H');
    });
  });

  describe('missing company column warning', () => {
    it('warns when company column is missing but has enough other keywords', () => {
      const columns = ['email', 'stage', 'deal_value', 'poc'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain('No "company" column detected');
      expect(result.warning).toContain('Import may not work correctly');
    });

    it('does not warn about company when it exists', () => {
      const columns = ['company_name', 'email', 'stage', 'deal_value'];
      const result = validateDetectedColumns(columns);

      expect(result.warning).toBeNull();
    });

    it('accepts "company" anywhere in column name', () => {
      const columns = ['my_company_field', 'email', 'stage', 'deal_value'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeNull();
    });
  });

  describe('empty columns array', () => {
    it('flags empty columns array as invalid', () => {
      const columns: string[] = [];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(false);
      expect(result.warning).toBe('No columns detected in the data');
    });
  });

  describe('edge cases', () => {
    it('handles single column', () => {
      const columns = ['company_name'];
      const result = validateDetectedColumns(columns);

      // Single column won't have 3 keywords, so should warn
      expect(result.valid).toBe(true);
      expect(result.warning).not.toBeNull();
    });

    it('handles columns with special characters', () => {
      const columns = ['company-name', 'email@address', 'stage_value'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      // Should still match keywords via includes
    });

    it('handles uppercase column names', () => {
      const columns = ['COMPANY_NAME', 'EMAIL', 'STAGE', 'DEAL_VALUE'];
      const result = validateDetectedColumns(columns);

      expect(result.valid).toBe(true);
      expect(result.warning).toBeNull();
    });
  });
});

describe('ExcelImportSection Component - Warning Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expandSection = async () => {
    const header = screen.getByRole('button', { name: /Excel Data Import/i });
    await userEvent.click(header);
  };

  it('renders the component header', () => {
    render(<ExcelImportSection />);
    expect(screen.getByText('Excel Data Import')).toBeInTheDocument();
  });

  describe('warning display in UI', () => {
    it('displays column warning when set via paste with bad headers', async () => {
      const user = userEvent.setup();
      render(<ExcelImportSection />);

      // Expand the section
      await expandSection();

      // Switch to paste mode
      const pasteTab = screen.getByRole('button', { name: /Copy & Paste/i });
      await user.click(pasteTab);

      // Enter data with headers that look like data (generic columns)
      const textarea = screen.getByPlaceholderText(/Paste your Excel data here/i);
      const badData = 'A\tB\tC\tD\nvalue1\tvalue2\tvalue3\tvalue4';
      await user.clear(textarea);
      await user.type(textarea, badData);

      // Click Parse Data
      const parseButton = screen.getByRole('button', { name: /Parse Data/i });
      await user.click(parseButton);

      // Wait for warning to appear
      await waitFor(() => {
        expect(screen.getByText('Column Header Warning')).toBeInTheDocument();
      });

      // Check warning content
      expect(screen.getByText(/Column headers may not match expected format/i)).toBeInTheDocument();
    });

    it('does not display warning for valid headers', async () => {
      const user = userEvent.setup();
      render(<ExcelImportSection />);

      await expandSection();

      // Switch to paste mode
      const pasteTab = screen.getByRole('button', { name: /Copy & Paste/i });
      await user.click(pasteTab);

      // Enter data with good headers
      const textarea = screen.getByPlaceholderText(/Paste your Excel data here/i);
      const goodData = 'company_name\temail\tstage\tdeal_value\nAcme Corp\ttest@acme.com\tdemo\t10000';
      await user.clear(textarea);
      await user.type(textarea, goodData);

      // Click Parse Data
      const parseButton = screen.getByRole('button', { name: /Parse Data/i });
      await user.click(parseButton);

      // Wait for parsing to complete
      await waitFor(() => {
        expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
      });

      // Warning should not be present
      expect(screen.queryByText('Column Header Warning')).not.toBeInTheDocument();
    });

    it('warning is clearable by clicking X button', async () => {
      const user = userEvent.setup();
      render(<ExcelImportSection />);

      await expandSection();

      // Switch to paste mode
      const pasteTab = screen.getByRole('button', { name: /Copy & Paste/i });
      await user.click(pasteTab);

      // Enter data with bad headers
      const textarea = screen.getByPlaceholderText(/Paste your Excel data here/i);
      const badData = 'A\tB\tC\tD\nvalue1\tvalue2\tvalue3\tvalue4';
      await user.clear(textarea);
      await user.type(textarea, badData);

      // Click Parse Data
      const parseButton = screen.getByRole('button', { name: /Parse Data/i });
      await user.click(parseButton);

      // Wait for warning to appear
      await waitFor(() => {
        expect(screen.getByText('Column Header Warning')).toBeInTheDocument();
      });

      // Find and click the close button (the button wrapping XCircle icon)
      // The warning section has a button with XCircle inside it
      const warningContainer = screen.getByText('Column Header Warning').closest('div')?.parentElement;
      const closeButton = warningContainer?.querySelector('button.ml-auto');
      expect(closeButton).toBeInTheDocument();
      await user.click(closeButton!);

      // Warning should be gone
      await waitFor(() => {
        expect(screen.queryByText('Column Header Warning')).not.toBeInTheDocument();
      });
    });
  });

  describe('reset clears warning', () => {
    it('clicking Cancel clears the column warning', async () => {
      const user = userEvent.setup();
      render(<ExcelImportSection />);

      await expandSection();

      // Switch to paste mode
      const pasteTab = screen.getByRole('button', { name: /Copy & Paste/i });
      await user.click(pasteTab);

      // Enter data with bad headers
      const textarea = screen.getByPlaceholderText(/Paste your Excel data here/i);
      const badData = 'A\tB\tC\tD\nvalue1\tvalue2\tvalue3\tvalue4';
      await user.clear(textarea);
      await user.type(textarea, badData);

      // Click Parse Data
      const parseButton = screen.getByRole('button', { name: /Parse Data/i });
      await user.click(parseButton);

      // Wait for warning and parsed data to appear
      await waitFor(() => {
        expect(screen.getByText('Column Header Warning')).toBeInTheDocument();
      });

      // Click Cancel to reset
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      // Warning should be cleared
      expect(screen.queryByText('Column Header Warning')).not.toBeInTheDocument();

      // Should be back to input mode
      expect(screen.getByRole('button', { name: /Copy & Paste/i })).toBeInTheDocument();
    });
  });

  describe('warning styling', () => {
    it('warning has amber/yellow styling to distinguish from errors', async () => {
      const user = userEvent.setup();
      render(<ExcelImportSection />);

      await expandSection();

      // Switch to paste mode
      const pasteTab = screen.getByRole('button', { name: /Copy & Paste/i });
      await user.click(pasteTab);

      // Enter data with bad headers
      const textarea = screen.getByPlaceholderText(/Paste your Excel data here/i);
      const badData = 'X\tY\tZ\nval1\tval2\tval3';
      await user.clear(textarea);
      await user.type(textarea, badData);

      // Click Parse Data
      const parseButton = screen.getByRole('button', { name: /Parse Data/i });
      await user.click(parseButton);

      // Wait for warning
      await waitFor(() => {
        expect(screen.getByText('Column Header Warning')).toBeInTheDocument();
      });

      // Check for amber styling
      const warningContainer = screen.getByText('Column Header Warning').closest('div')?.parentElement;
      expect(warningContainer).toHaveClass('bg-amber-50');
      expect(warningContainer).toHaveClass('border-amber-200');
    });
  });
});

describe('ExcelImportSection - Header Detection Logic', () => {
  it('detects headers that look like keywords', async () => {
    const user = userEvent.setup();
    render(<ExcelImportSection />);

    // Expand
    const header = screen.getByRole('button', { name: /Excel Data Import/i });
    await user.click(header);

    // Switch to paste mode
    const pasteTab = screen.getByRole('button', { name: /Copy & Paste/i });
    await user.click(pasteTab);

    // Paste data where first row has header keywords
    const textarea = screen.getByPlaceholderText(/Paste your Excel data here/i);
    const dataWithHeaders = 'company_name\temail\tstage\nAcme\tacme@test.com\tdemo\nBeta\tbeta@test.com\ttrial';
    await user.clear(textarea);
    await user.type(textarea, dataWithHeaders);

    const parseButton = screen.getByRole('button', { name: /Parse Data/i });
    await user.click(parseButton);

    // Should show the detected columns: company_name, email, stage
    // Using getAllByText since columns appear in both the column list and table header
    await waitFor(() => {
      expect(screen.getAllByText('company_name').length).toBeGreaterThan(0);
    });

    // Should show email and stage as detected columns
    expect(screen.getAllByText('email').length).toBeGreaterThan(0);
    expect(screen.getAllByText('stage').length).toBeGreaterThan(0);
  });

  it('uses fixed columns when first row looks like data (ID pattern)', async () => {
    const user = userEvent.setup();
    render(<ExcelImportSection />);

    // Expand
    const header = screen.getByRole('button', { name: /Excel Data Import/i });
    await user.click(header);

    // Switch to paste mode
    const pasteTab = screen.getByRole('button', { name: /Copy & Paste/i });
    await user.click(pasteTab);

    // Paste data where first row looks like data (starts with ID pattern)
    const textarea = screen.getByPlaceholderText(/Paste your Excel data here/i);
    const dataWithoutHeaders = 'DEMO-2024-1\t2024-01-15\t10:00\tJohn\tjohn@test.com\nDEMO-2024-2\t2024-01-16\t11:00\tJane\tjane@test.com';
    await user.clear(textarea);
    await user.type(textarea, dataWithoutHeaders);

    const parseButton = screen.getByRole('button', { name: /Parse Data/i });
    await user.click(parseButton);

    // Should use fixed columns (external_id, demo_date, etc.)
    // Using getAllByText since columns appear in multiple places
    await waitFor(() => {
      expect(screen.getAllByText('external_id').length).toBeGreaterThan(0);
    });

    // The fixed columns should be visible
    expect(screen.getAllByText('demo_date').length).toBeGreaterThan(0);
  });
});
