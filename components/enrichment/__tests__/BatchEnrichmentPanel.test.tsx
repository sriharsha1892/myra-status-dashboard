/**
 * BatchEnrichmentPanel Unit Tests
 * Tests all combinations of the batch enrichment panel component
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchEnrichmentPanel } from '../BatchEnrichmentPanel';
import type { QuestionWithContext } from '@/lib/enrichment/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock react-hot-toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

describe('BatchEnrichmentPanel', () => {
  const createMockQuestion = (overrides?: Partial<QuestionWithContext>): QuestionWithContext => ({
    id: 'q1',
    entityType: 'organization',
    targetField: 'health_status',
    targetTable: 'trial_organizations',
    label: 'Set Health Status',
    fieldType: 'card-select',
    options: [
      { value: 'healthy', label: 'Healthy' },
      { value: 'warning', label: 'Warning' },
      { value: 'at-risk', label: 'At-Risk' },
      { value: 'critical', label: 'Critical' },
    ],
    relevantRoles: ['admin'],
    priority: 'high',
    weight: 25,
    entities: [
      { id: 'org1', name: 'Acme Corp', currentValue: null },
      { id: 'org2', name: 'Beta Inc', currentValue: 'healthy' },
      { id: 'org3', name: 'Gamma LLC', currentValue: null },
    ],
    ...overrides,
  });

  const defaultProps = {
    question: createMockQuestion(),
    sessionId: 'session-123',
    onAnswer: jest.fn().mockResolvedValue(undefined),
    onSkip: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // ENTITY SELECTION TESTS
  // =====================================================
  describe('Entity Selection States', () => {
    it('1. auto-selects entities without values', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      // org1 and org3 have null values, should be auto-selected
      // org2 has a value, should not be auto-selected
      // Skip button should show "(2)" for the 2 auto-selected entities
      expect(screen.getByText(/Skip.*\(2\)/)).toBeInTheDocument();
    });

    it('2. toggles individual entity selection', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      // Find the Acme Corp row and toggle its checkbox
      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      const checkbox = within(acmeRow!).getAllByRole('button')[0];

      await user.click(checkbox);
      // After toggle, it should be deselected
    });

    it('3. Select All selects all entities', async () => {
      const user = userEvent.setup();

      // Create question with all entities having values (so none auto-selected)
      const question = createMockQuestion({
        entities: [
          { id: 'org1', name: 'Acme', currentValue: 'healthy' },
          { id: 'org2', name: 'Beta', currentValue: 'warning' },
        ],
      });

      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      await user.click(screen.getByText('Select All'));

      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });

    it('4. Deselect All deselects all entities', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      // First ensure all are selected
      await user.click(screen.getByText('Select All'));

      // Then deselect all
      await user.click(screen.getByText('Deselect All'));

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('5. Select All when some selected selects all', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      // Some are auto-selected (2 of 3), click Select All
      await user.click(screen.getByText('Select All'));

      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });
  });

  // =====================================================
  // BULK VALUE APPLICATION TESTS
  // =====================================================
  describe('Bulk Value Application', () => {
    it('6. opens bulk dropdown on click', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      await user.click(screen.getByText('Select...'));

      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('7. selecting bulk value updates dropdown text', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));

      // Dropdown should now show "Healthy" instead of "Select..."
      const bulkDropdown = screen.getAllByText('Healthy')[0];
      expect(bulkDropdown).toBeInTheDocument();
    });

    it('8. Apply button disabled when 0 selected', async () => {
      const user = userEvent.setup();

      // Create question with all entities having values (none auto-selected)
      const question = createMockQuestion({
        entities: [
          { id: 'org1', name: 'Acme', currentValue: 'healthy' },
        ],
      });

      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      // Set a bulk value
      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));

      // Apply button should show "Apply to 0 selected" and be disabled
      const applyButton = screen.getByText(/Apply to 0/);
      expect(applyButton).toBeDisabled();
    });

    it('9. Apply bulk value to selected entities', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      // Set bulk value
      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Warning' }));

      // Apply to selected (2 are auto-selected)
      await user.click(screen.getByText(/Apply to 2 selected/));

      // Check that entities now show "Warning" in their dropdowns
      const warningButtons = screen.getAllByText('Warning');
      expect(warningButtons.length).toBeGreaterThan(1);
    });

    it('10. Apply bulk overwrites existing pending values', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      // First set individual values
      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      const acmeDropdown = within(acmeRow!).getByText('—');
      await user.click(acmeDropdown);
      await user.click(screen.getByRole('button', { name: 'At-Risk' }));

      // Now apply bulk "Healthy"
      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));
      await user.click(screen.getByText(/Apply to/));

      // Acme should now show "Healthy" instead of "At-Risk"
      const acmeRowAfter = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      expect(within(acmeRowAfter!).getByText('Healthy')).toBeInTheDocument();
    });
  });

  // =====================================================
  // PER-ENTITY VALUE SELECTION TESTS
  // =====================================================
  describe('Per-Entity Value Selection', () => {
    it('11. opens entity dropdown on click', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(acmeRow!).getByText('—'));

      // Should show options
      expect(screen.getByRole('button', { name: 'Healthy' })).toBeInTheDocument();
    });

    it('12. sets individual entity value', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(acmeRow!).getByText('—'));
      await user.click(screen.getByRole('button', { name: 'Critical' }));

      // Should show the selected value
      expect(within(acmeRow!).getByText('Critical')).toBeInTheDocument();
    });

    it('13. clears entity value on Clear click', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      // Set a value first
      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(acmeRow!).getByText('—'));
      await user.click(screen.getByRole('button', { name: 'Warning' }));

      // Open dropdown again and clear
      await user.click(within(acmeRow!).getByText('Warning'));
      await user.click(screen.getByText('Clear'));

      // Should show "—" again
      expect(within(acmeRow!).getByText('—')).toBeInTheDocument();
    });

    it('14. allows different values per entity', async () => {
      const user = userEvent.setup();
      render(<BatchEnrichmentPanel {...defaultProps} />);

      // Set Acme to "Healthy"
      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(acmeRow!).getByText('—'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));

      // Set Gamma to "Critical"
      const gammaRow = screen.getByText('Gamma LLC').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(gammaRow!).getByText('—'));
      await user.click(screen.getByRole('button', { name: 'Critical' }));

      // Verify different values
      expect(within(acmeRow!).getByText('Healthy')).toBeInTheDocument();
      expect(within(gammaRow!).getByText('Critical')).toBeInTheDocument();
    });
  });

  // =====================================================
  // SUBMIT BEHAVIOR TESTS
  // =====================================================
  describe('Submit Behavior', () => {
    it('15. Submit button disabled when no entities ready', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      // No values set yet
      expect(screen.getByText('Submit Answers').closest('button')).toBeDisabled();
    });

    it('16. submits single entity', async () => {
      const onAnswer = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} onAnswer={onAnswer} />);

      // Set value for Acme
      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(acmeRow!).getByText('—'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));

      // Deselect Gamma (so only Acme is selected and has value)
      const gammaRow = screen.getByText('Gamma LLC').closest('div[class*="flex items-center gap-3"]');
      const gammaCheckbox = within(gammaRow!).getAllByRole('button')[0];
      await user.click(gammaCheckbox);

      // Submit
      await user.click(screen.getByText('Submit Answers'));

      await waitFor(() => {
        expect(onAnswer).toHaveBeenCalledWith(['org1'], 'healthy');
      });
    });

    it('17. submits entities with same value in single call', async () => {
      const onAnswer = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} onAnswer={onAnswer} />);

      // Apply same value to all selected
      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));
      await user.click(screen.getByText(/Apply to 2 selected/));

      // Submit
      await user.click(screen.getByText('Submit Answers'));

      await waitFor(() => {
        expect(onAnswer).toHaveBeenCalledTimes(1);
        expect(onAnswer).toHaveBeenCalledWith(expect.arrayContaining(['org1', 'org3']), 'healthy');
      });
    });

    it('18. submits entities with different values in multiple calls', async () => {
      const onAnswer = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} onAnswer={onAnswer} />);

      // Set Acme to "Healthy"
      const acmeRow = screen.getByText('Acme Corp').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(acmeRow!).getByText('—'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));

      // Set Gamma to "Warning"
      const gammaRow = screen.getByText('Gamma LLC').closest('div[class*="flex items-center gap-3"]');
      await user.click(within(gammaRow!).getByText('—'));
      await user.click(screen.getByRole('button', { name: 'Warning' }));

      // Submit
      await user.click(screen.getByText('Submit Answers'));

      await waitFor(() => {
        expect(onAnswer).toHaveBeenCalledTimes(2);
      });
    });

    it('19. shows loading state during submit', async () => {
      const onAnswer = jest.fn().mockImplementation(() => new Promise(r => setTimeout(r, 100)));
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} onAnswer={onAnswer} />);

      // Set value
      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));
      await user.click(screen.getByText(/Apply to 2 selected/));

      // Submit
      await user.click(screen.getByText('Submit Answers'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('20. shows success toast after submit', async () => {
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} />);

      // Set value and submit
      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));
      await user.click(screen.getByText(/Apply to 2 selected/));
      await user.click(screen.getByText('Submit Answers'));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('Updated 2'));
      });
    });

    it('21. shows error toast on submit failure', async () => {
      const onAnswer = jest.fn().mockRejectedValue(new Error('API Error'));
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} onAnswer={onAnswer} />);

      // Set value and submit
      await user.click(screen.getByText('Select...'));
      await user.click(screen.getByRole('button', { name: 'Healthy' }));
      await user.click(screen.getByText(/Apply to 2 selected/));
      await user.click(screen.getByText('Submit Answers'));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to submit answers');
      });
    });
  });

  // =====================================================
  // SKIP BEHAVIOR TESTS
  // =====================================================
  describe('Skip Behavior', () => {
    it('22. Skip disabled when 0 selected', async () => {
      const user = userEvent.setup();

      // Create question where none are auto-selected
      const question = createMockQuestion({
        entities: [{ id: 'org1', name: 'Acme', currentValue: 'healthy' }],
      });

      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      expect(screen.getByText('Skip').closest('button')).toBeDisabled();
    });

    it('23. Skip calls onSkip with selected entities', async () => {
      const onSkip = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} onSkip={onSkip} />);

      // Click the Skip button (which shows "Skip (2)")
      const skipButton = screen.getByText(/Skip.*\(2\)/).closest('button')!;
      await user.click(skipButton);

      await waitFor(() => {
        expect(onSkip).toHaveBeenCalledWith(expect.arrayContaining(['org1', 'org3']));
      });
    });

    it('24. Skip shows count', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      expect(screen.getByText(/Skip.*\(2\)/)).toBeInTheDocument();
    });
  });

  // =====================================================
  // AI SUGGESTION TESTS
  // =====================================================
  describe('AI Suggestion Display', () => {
    it('25. shows AI banner for high confidence', () => {
      const question = createMockQuestion({
        aiSuggestion: { value: 'healthy', confidence: 0.8 },
      });

      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      expect(screen.getByText(/AI suggests/)).toBeInTheDocument();
      expect(screen.getByText(/80%/)).toBeInTheDocument();
    });

    it('26. hides AI banner for low confidence', () => {
      const question = createMockQuestion({
        aiSuggestion: { value: 'healthy', confidence: 0.5 },
      });

      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      expect(screen.queryByText(/AI suggests/)).not.toBeInTheDocument();
    });

    it('27. hides AI banner when no suggestion', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      expect(screen.queryByText(/AI suggests/)).not.toBeInTheDocument();
    });

    it('28. AI pre-selects bulk value', () => {
      const question = createMockQuestion({
        aiSuggestion: { value: 'warning', confidence: 0.8 },
      });

      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      // The bulk dropdown should show "Warning" pre-selected (multiple Warning texts possible)
      const warningTexts = screen.getAllByText('Warning');
      expect(warningTexts.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // CLOSE/HEADER TESTS
  // =====================================================
  describe('Close/Header', () => {
    it('29. shows close button when onClose provided', () => {
      render(<BatchEnrichmentPanel {...defaultProps} onClose={() => {}} />);
      // X button should be visible
      const closeButton = document.querySelector('.lucide-x');
      expect(closeButton).toBeInTheDocument();
    });

    it('30. hides close button when no onClose', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      const closeButton = document.querySelector('.lucide-x');
      expect(closeButton).not.toBeInTheDocument();
    });

    it('31. calls onClose when X clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<BatchEnrichmentPanel {...defaultProps} onClose={onClose} />);

      const closeButton = document.querySelector('.lucide-x')!.closest('button')!;
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('32. shows missing count badge', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      // 2 of 3 entities have null currentValue
      expect(screen.getByText('2 missing')).toBeInTheDocument();
    });
  });

  // =====================================================
  // EDGE CASE TESTS
  // =====================================================
  describe('Edge Cases', () => {
    it('33. handles empty entities array', () => {
      const question = createMockQuestion({ entities: [] });
      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      expect(screen.getByText('0 missing')).toBeInTheDocument();
      expect(screen.getByText('Submit Answers').closest('button')).toBeDisabled();
    });

    it('34. none auto-selected when all have values', () => {
      const question = createMockQuestion({
        entities: [
          { id: 'org1', name: 'Acme', currentValue: 'healthy' },
          { id: 'org2', name: 'Beta', currentValue: 'warning' },
        ],
      });

      render(<BatchEnrichmentPanel {...defaultProps} question={question} />);

      expect(screen.getByText('0 missing')).toBeInTheDocument();
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('35. shows current value for entities with values', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      // Beta Inc has currentValue: 'healthy'
      expect(screen.getByText('(current: healthy)')).toBeInTheDocument();
    });

    it('36. displays question label in header', () => {
      render(<BatchEnrichmentPanel {...defaultProps} />);
      expect(screen.getByText('Set Health Status')).toBeInTheDocument();
    });
  });
});
