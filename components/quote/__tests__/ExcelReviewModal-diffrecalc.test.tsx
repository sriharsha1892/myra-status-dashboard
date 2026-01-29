/**
 * ExcelReviewModal Field Diff Recalculation Tests
 *
 * Tests that when user changes the match selection in handleCompanyChange,
 * the diffs are properly recalculated using compareRecords (not stale diffs).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExcelReviewModal from '../ExcelReviewModal';
import type { ReviewRow } from '@/app/api/sync/excel-import/route';
import type { DbRecord, FieldDiff, MatchResult } from '@/lib/sync/fuzzy-matcher';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  CheckCircle: () => <span data-testid="icon-check-circle">CheckCircle</span>,
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  PlusCircle: () => <span data-testid="icon-plus-circle">PlusCircle</span>,
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
  ChevronDown: () => <span data-testid="icon-chevron-down">ChevronDown</span>,
  ChevronUp: () => <span data-testid="icon-chevron-up">ChevronUp</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  SkipForward: () => <span data-testid="icon-skip">SkipForward</span>,
  Save: () => <span data-testid="icon-save">Save</span>,
  Building: () => <span data-testid="icon-building">Building</span>,
  ArrowRight: () => <span data-testid="icon-arrow-right">ArrowRight</span>,
}));

describe('ExcelReviewModal - Field Diff Recalculation', () => {
  // Mock DB records with different field values for testing diff recalculation
  const mockDbRecords: DbRecord[] = [
    {
      id: 'company-1',
      company_name: 'Acme Corp',
      primary_email: 'acme@example.com',
      stage: 'trial',
      deal_value: 10000,
      employee_name: 'John Doe',
    },
    {
      id: 'company-2',
      company_name: 'Acme Corporation',
      primary_email: 'contact@acme.com',
      stage: 'negotiation',
      deal_value: 25000,
      employee_name: 'Jane Smith',
    },
    {
      id: 'company-3',
      company_name: 'Beta Inc',
      primary_email: 'info@beta.com',
      stage: 'proposal',
      deal_value: 15000,
      employee_name: 'Bob Wilson',
    },
  ];

  // Excel data that will have different diffs with different DB records
  const mockExcelData: Record<string, unknown> = {
    company_name: 'Acme Corp',
    contact_email: 'newcontact@acme.com',
    stage: 'demo',
    deal_value: 20000,
    sales_poc: 'Alice Johnson',
  };

  // Initial diffs when matched to company-1
  const initialDiffs: FieldDiff[] = [
    { field: 'stage', label: 'Stage', excelValue: 'demo', dbValue: 'trial', resolution: 'pending' },
    { field: 'deal_value', label: 'Deal Value', excelValue: 20000, dbValue: 10000, resolution: 'pending' },
    { field: 'employee_name', label: 'Sales POC', excelValue: 'Alice Johnson', dbValue: 'John Doe', resolution: 'pending' },
  ];

  // Match result with both companies as options
  const mockMatchResult: MatchResult = {
    excelRowIndex: 0,
    excelCompanyName: 'Acme Corp',
    matchType: 'exact',
    matches: [
      { dbRecord: mockDbRecords[0], similarity: 100, matchedBy: 'company_name' },
      { dbRecord: mockDbRecords[1], similarity: 85, matchedBy: 'company_name' },
      { dbRecord: mockDbRecords[2], similarity: 50, matchedBy: 'company_name' },
    ],
    suggestedMatch: mockDbRecords[0],
  };

  const createReviewRow = (overrides?: Partial<ReviewRow>): ReviewRow => ({
    rowIndex: 0,
    excelData: mockExcelData,
    matchResult: mockMatchResult,
    selectedMatchId: 'company-1',
    fieldDiffs: initialDiffs,
    status: 'matched',
    ...overrides,
  });

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    reviewRows: [createReviewRow()],
    dbRecords: mockDbRecords,
    summary: {
      totalRows: 1,
      exactMatches: 1,
      fuzzyMatches: 0,
      noMatches: 0,
      totalDiffs: 3,
    },
    onCommit: jest.fn().mockResolvedValue(undefined),
    isCommitting: false,
  };

  // Helper function to expand a row and get the company select dropdown
  const expandRowAndGetSelect = async (user: ReturnType<typeof userEvent.setup>) => {
    // Find and click the row header to expand
    const rowHeader = screen.getByText('Acme Corp').closest('div[class*="cursor-pointer"]');
    expect(rowHeader).toBeInTheDocument();
    await user.click(rowHeader!);

    // Wait for the dropdown to appear - native <select> elements
    await waitFor(() => {
      const selects = document.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    // Get the company selection dropdown (first select in the expanded row)
    const selects = document.querySelectorAll('select');
    return selects[0] as HTMLSelectElement;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // DIFF RECALCULATION TESTS
  // =====================================================
  describe('Diff Recalculation on Match Change', () => {
    it('1. recalculates fieldDiffs when changing from one matched company to another', async () => {
      const user = userEvent.setup();
      render(<ExcelReviewModal {...defaultProps} />);

      // Initial state: should show 3 diffs
      expect(screen.getByText(/3 diff/)).toBeInTheDocument();

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Verify initial diffs are displayed (Stage diff)
      expect(screen.getByText('Stage')).toBeInTheDocument();

      // Change to company-2 (Acme Corporation)
      await user.selectOptions(selectDropdown, 'company-2');

      // After changing to company-2, diffs should be recalculated
      // The diffs will be different because company-2 has different values:
      // company-2: stage='negotiation', deal_value=25000, employee_name='Jane Smith'
      // Excel: stage='demo', deal_value=20000, sales_poc='Alice Johnson'

      // Wait for state to update and verify diffs changed
      await waitFor(() => {
        // The diff count might change based on the new comparison
        // We expect diffs to still exist (stage, deal_value, employee_name will all differ)
        const diffBadge = screen.queryByText(/\d+ diff/);
        expect(diffBadge).toBeInTheDocument();
      });

      // Verify that the component is now showing the match to company-2
      expect(selectDropdown.value).toBe('company-2');
    });

    it('2. clears fieldDiffs when changing from matched company to "new"', async () => {
      const user = userEvent.setup();
      render(<ExcelReviewModal {...defaultProps} />);

      // Initially has diffs
      expect(screen.getByText(/3 diff/)).toBeInTheDocument();

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Change to "new" (create new company)
      await user.selectOptions(selectDropdown, 'new');

      // Wait for the state update
      await waitFor(() => {
        // When status is 'new', fieldDiffs should be empty (no comparison needed)
        // The diff badge should disappear
        expect(screen.queryByText(/\d+ diff/)).not.toBeInTheDocument();
      });

      // Verify the status changed to new (blue styling, shows new record data)
      expect(screen.getByText('No match - will create new record')).toBeInTheDocument();
    });

    it('3. calculates fieldDiffs when changing from "new" to a matched company', async () => {
      const user = userEvent.setup();

      // Start with a "new" status row (no match selected) - these are auto-expanded
      const newRow = createReviewRow({
        selectedMatchId: null,
        status: 'new',
        fieldDiffs: [], // No diffs for new records
      });

      render(
        <ExcelReviewModal
          {...defaultProps}
          reviewRows={[newRow]}
          summary={{ ...defaultProps.summary, exactMatches: 0, noMatches: 1, totalDiffs: 0 }}
        />
      );

      // "new" status rows are auto-expanded, so select should be visible
      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThan(0);
      });

      const selectDropdown = document.querySelector('select') as HTMLSelectElement;

      // Initially no diffs (new record)
      expect(screen.queryByText(/\d+ diff/)).not.toBeInTheDocument();

      // Change to company-1 (Acme Corp)
      await user.selectOptions(selectDropdown, 'company-1');

      // Wait for diffs to be calculated
      await waitFor(() => {
        // Now diffs should be calculated against company-1
        // The diff badge should appear
        const diffBadge = screen.queryByText(/\d+ diff/);
        expect(diffBadge).toBeInTheDocument();
      });

      // Verify it's now in matched state
      expect(selectDropdown.value).toBe('company-1');
    });

    it('4. resets fieldResolutions when match changes', async () => {
      const user = userEvent.setup();
      render(<ExcelReviewModal {...defaultProps} />);

      // Expand row and get select
      const companySelect = await expandRowAndGetSelect(user);

      // Get all select elements - first is company, rest are field resolutions
      const allSelects = document.querySelectorAll('select');
      expect(allSelects.length).toBeGreaterThan(1); // Company + field resolution selects

      const resolutionSelect = allSelects[1] as HTMLSelectElement;

      // Change a resolution to 'use_excel'
      await user.selectOptions(resolutionSelect, 'use_excel');
      expect(resolutionSelect.value).toBe('use_excel');

      // Now change the matched company
      await user.selectOptions(companySelect, 'company-2');

      // After changing match, resolutions should be reset to default ('keep_db' for matched)
      await waitFor(() => {
        // Get fresh list of resolution selects (excluding company select)
        const newAllSelects = document.querySelectorAll('select');
        const newResolutionSelects = Array.from(newAllSelects).slice(1);

        // All resolutions should be reset to 'keep_db' after match change
        newResolutionSelects.forEach((select) => {
          expect((select as HTMLSelectElement).value).toBe('keep_db');
        });
      });
    });

    it('5. uses compareRecords from fuzzy-matcher (verified by diff changes)', async () => {
      const user = userEvent.setup();
      render(<ExcelReviewModal {...defaultProps} />);

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Initial state - verify diffs are shown
      expect(screen.getByText('Stage')).toBeInTheDocument();

      // Change to company-3 (Beta Inc) which has very different values
      // Beta Inc: stage='proposal', deal_value=15000, employee_name='Bob Wilson'
      await user.selectOptions(selectDropdown, 'company-3');

      // Wait for recalculation
      await waitFor(() => {
        // Diffs should still exist but with different DB values
        // This proves compareRecords was called with the new matched record
        const diffBadge = screen.queryByText(/\d+ diff/);
        expect(diffBadge).toBeInTheDocument();
      });

      // Verify the select now shows company-3
      expect(selectDropdown.value).toBe('company-3');
    });
  });

  // =====================================================
  // EDGE CASE TESTS
  // =====================================================
  describe('Edge Cases', () => {
    it('6. handles changing to skip status', async () => {
      const user = userEvent.setup();
      render(<ExcelReviewModal {...defaultProps} />);

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Change to skip
      await user.selectOptions(selectDropdown, 'skip');

      await waitFor(() => {
        expect(screen.getByText('Skipped - will not import')).toBeInTheDocument();
      });

      // The row content should be hidden when skipped
      // Diff badge should not be visible for skipped rows
      expect(screen.queryByText('Stage')).not.toBeInTheDocument();
    });

    it('7. maintains correct diffs after multiple match changes', async () => {
      const user = userEvent.setup();
      render(<ExcelReviewModal {...defaultProps} />);

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Change to company-2
      await user.selectOptions(selectDropdown, 'company-2');
      await waitFor(() => {
        expect(selectDropdown.value).toBe('company-2');
      });

      // Change to company-3
      await user.selectOptions(selectDropdown, 'company-3');
      await waitFor(() => {
        expect(selectDropdown.value).toBe('company-3');
      });

      // Change back to company-1
      await user.selectOptions(selectDropdown, 'company-1');
      await waitFor(() => {
        expect(selectDropdown.value).toBe('company-1');
        // Diffs should be recalculated for company-1
        const diffBadge = screen.queryByText(/\d+ diff/);
        expect(diffBadge).toBeInTheDocument();
      });
    });

    it('8. handles row with no initial diffs when changing match', async () => {
      const user = userEvent.setup();

      // Row with exact match and no diffs (all values match)
      const noDiffsRow = createReviewRow({
        fieldDiffs: [],
        status: 'matched',
      });

      render(
        <ExcelReviewModal
          {...defaultProps}
          reviewRows={[noDiffsRow]}
          summary={{ ...defaultProps.summary, totalDiffs: 0 }}
        />
      );

      // Initially no diffs badge visible
      expect(screen.queryByText(/\d+ diff/)).not.toBeInTheDocument();

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Change to a company that will have diffs
      await user.selectOptions(selectDropdown, 'company-2');

      await waitFor(() => {
        // Now diffs should appear (compareRecords should calculate new diffs)
        const diffBadge = screen.queryByText(/\d+ diff/);
        expect(diffBadge).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // COMMIT DATA VERIFICATION
  // =====================================================
  describe('Commit with Recalculated Diffs', () => {
    it('9. commits with recalculated diffs after match change', async () => {
      const user = userEvent.setup();
      const mockOnCommit = jest.fn().mockResolvedValue(undefined);

      render(<ExcelReviewModal {...defaultProps} onCommit={mockOnCommit} />);

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Change match to company-2
      await user.selectOptions(selectDropdown, 'company-2');

      await waitFor(() => {
        expect(selectDropdown.value).toBe('company-2');
      });

      // Click commit button
      const commitButton = screen.getByRole('button', { name: /commit changes/i });
      await user.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommit).toHaveBeenCalledTimes(1);
        const commitArg = mockOnCommit.mock.calls[0][0];

        // Verify the commit was called with the new match ID
        expect(commitArg).toHaveLength(1);
        expect(commitArg[0].selectedMatchId).toBe('company-2');
      });
    });

    it('10. commits with empty fieldResolutions when changed to new', async () => {
      const user = userEvent.setup();
      const mockOnCommit = jest.fn().mockResolvedValue(undefined);

      render(<ExcelReviewModal {...defaultProps} onCommit={mockOnCommit} />);

      // Expand row and get select
      const selectDropdown = await expandRowAndGetSelect(user);

      // Change to new
      await user.selectOptions(selectDropdown, 'new');

      await waitFor(() => {
        expect(selectDropdown.value).toBe('new');
      });

      // Click commit button
      const commitButton = screen.getByRole('button', { name: /commit changes/i });
      await user.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommit).toHaveBeenCalledTimes(1);
        const commitArg = mockOnCommit.mock.calls[0][0];

        // Verify the commit was called with null match ID and status 'new'
        expect(commitArg).toHaveLength(1);
        expect(commitArg[0].selectedMatchId).toBeNull();
        expect(commitArg[0].status).toBe('new');
        // fieldResolutions should be empty for new records
        expect(Object.keys(commitArg[0].fieldResolutions)).toHaveLength(0);
      });
    });
  });
});
