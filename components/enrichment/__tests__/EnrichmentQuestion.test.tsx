/**
 * EnrichmentQuestion Unit Tests
 * Tests all combinations of the enrichment question component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnrichmentQuestion } from '../EnrichmentQuestion';
import type { QuestionWithContext } from '@/lib/enrichment/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, onMouseEnter, onMouseLeave, ...props }: any) => (
      <div
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="option"
        {...props}
      >
        {children}
      </div>
    ),
    svg: ({ children, className, ...props }: any) => (
      <svg className={className} {...props}>
        {children}
      </svg>
    ),
    path: (props: any) => <path {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock EnrichmentChoiceChips
jest.mock('../EnrichmentChoiceChips', () => ({
  EnrichmentChoiceChips: ({ options, selectedIndex, onSelect, aiSuggestion, disabled }: any) => (
    <div data-testid="choice-chips">
      {options?.map((option: any, index: number) => (
        <button
          key={option.value}
          onClick={() => !disabled && onSelect(index)}
          data-selected={selectedIndex === index}
          data-ai-suggested={aiSuggestion?.value === option.value}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

describe('EnrichmentQuestion', () => {
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
    ],
    ...overrides,
  });

  const defaultProps = {
    question: createMockQuestion(),
    index: 0,
    isFocused: false,
    isCompleted: false,
    selectedChoiceIndex: -1,
    onFocus: jest.fn(),
    onChoiceSelect: jest.fn(),
    onConfirm: jest.fn(),
    onSkip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // AI SUGGESTION TESTS
  // =====================================================
  describe('AI Suggestion States', () => {
    const questionWithAI = createMockQuestion({
      aiSuggestion: { value: 'healthy', confidence: 0.8 },
    });

    const questionWithLowConfidenceAI = createMockQuestion({
      aiSuggestion: { value: 'healthy', confidence: 0.5 },
    });

    it('1. no AI banner when not focused (even with high confidence)', () => {
      render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithAI}
          isFocused={false}
        />
      );
      expect(screen.queryByText(/AI suggests/)).not.toBeInTheDocument();
    });

    it('2. shows AI banner when focused with high confidence', () => {
      render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithAI}
          isFocused={true}
        />
      );
      expect(screen.getByText(/AI suggests/)).toBeInTheDocument();
      // Check for the strong element in the banner specifically
      const banner = screen.getByText(/AI suggests/).closest('div');
      expect(banner).toHaveTextContent('Healthy');
    });

    it('3. no banner for low confidence even when focused', () => {
      render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithLowConfidenceAI}
          isFocused={true}
        />
      );
      expect(screen.queryByText(/AI suggests/)).not.toBeInTheDocument();
    });

    it('4. no banner when completed', () => {
      render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithAI}
          isFocused={true}
          isCompleted={true}
        />
      );
      expect(screen.queryByText(/AI suggests/)).not.toBeInTheDocument();
    });

    it('5. Accept button calls handlers', async () => {
      const onChoiceSelect = jest.fn();
      const onConfirm = jest.fn();
      const user = userEvent.setup();

      render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithAI}
          isFocused={true}
          onChoiceSelect={onChoiceSelect}
          onConfirm={onConfirm}
        />
      );

      const acceptButton = screen.getByText('Accept');
      await user.click(acceptButton);

      expect(onChoiceSelect).toHaveBeenCalledWith(0); // "healthy" is at index 0
      // onConfirm is called after a small delay
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('6. auto-selects AI suggestion on focus (high confidence)', () => {
      const onChoiceSelect = jest.fn();

      // Render initially not focused
      const { rerender } = render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithAI}
          isFocused={false}
          selectedChoiceIndex={-1}
          onChoiceSelect={onChoiceSelect}
        />
      );

      // Become focused
      rerender(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithAI}
          isFocused={true}
          selectedChoiceIndex={-1}
          onChoiceSelect={onChoiceSelect}
        />
      );

      expect(onChoiceSelect).toHaveBeenCalledWith(0);
    });

    it('7. does not auto-select low confidence', () => {
      const onChoiceSelect = jest.fn();

      const { rerender } = render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithLowConfidenceAI}
          isFocused={false}
          selectedChoiceIndex={-1}
          onChoiceSelect={onChoiceSelect}
        />
      );

      rerender(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithLowConfidenceAI}
          isFocused={true}
          selectedChoiceIndex={-1}
          onChoiceSelect={onChoiceSelect}
        />
      );

      expect(onChoiceSelect).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // FOCUS/COMPLETION STATE TESTS
  // =====================================================
  describe('Focus/Completion States', () => {
    it('8. idle state shows index number', () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={false} isCompleted={false} />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('9. focused state shows bold text and ring', () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={true} isCompleted={false} />
      );
      // There are multiple role="option" elements, get the main container
      const containers = screen.getAllByRole('option');
      const mainContainer = containers[0];
      expect(mainContainer).toHaveClass('ring-1');
    });

    it('10. completed state shows checkmark', () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={false} isCompleted={true} />
      );
      // Should show SVG checkmark instead of number
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('11. clicking focuses question when not focused', async () => {
      const onFocus = jest.fn();
      const user = userEvent.setup();

      render(
        <EnrichmentQuestion {...defaultProps} isFocused={false} onFocus={onFocus} />
      );

      await user.click(screen.getByRole('option'));

      expect(onFocus).toHaveBeenCalled();
    });

    it('12. clicking does nothing when completed', async () => {
      const onFocus = jest.fn();
      const user = userEvent.setup();

      render(
        <EnrichmentQuestion
          {...defaultProps}
          isCompleted={true}
          onFocus={onFocus}
        />
      );

      await user.click(screen.getByRole('option'));

      expect(onFocus).not.toHaveBeenCalled();
    });

    it('13. disabled prevents focus', async () => {
      const onFocus = jest.fn();
      const user = userEvent.setup();

      render(
        <EnrichmentQuestion
          {...defaultProps}
          disabled={true}
          onFocus={onFocus}
        />
      );

      await user.click(screen.getByRole('option'));

      expect(onFocus).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // CHOICE CHIPS VISIBILITY TESTS
  // =====================================================
  describe('Choice Chips Visibility', () => {
    it('14. shows chips when focused', () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={true} isCompleted={false} />
      );
      expect(screen.getByTestId('choice-chips')).toBeInTheDocument();
    });

    it('15. hides chips when not focused', () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={false} isCompleted={false} />
      );
      expect(screen.queryByTestId('choice-chips')).not.toBeInTheDocument();
    });

    it('16. hides chips when completed', () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={true} isCompleted={true} />
      );
      expect(screen.queryByTestId('choice-chips')).not.toBeInTheDocument();
    });

    it('17. no chips when question has no options', () => {
      const questionWithoutOptions = createMockQuestion({ options: undefined });
      render(
        <EnrichmentQuestion
          {...defaultProps}
          question={questionWithoutOptions}
          isFocused={true}
        />
      );
      expect(screen.queryByTestId('choice-chips')).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // ACTION BUTTON TESTS
  // =====================================================
  describe('Hover/Action Buttons', () => {
    it('18. shows actions on hover', async () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={false} isCompleted={false} />
      );

      const container = screen.getByRole('option');
      fireEvent.mouseEnter(container);

      // Check for skip button (SkipForward icon title)
      expect(screen.getByTitle('Skip (s)')).toBeInTheDocument();
    });

    it('19. shows actions when focused', () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={true} isCompleted={false} />
      );

      expect(screen.getByTitle('Skip (s)')).toBeInTheDocument();
      expect(screen.getByTitle('Confirm (Enter)')).toBeInTheDocument();
    });

    it('20. hides actions when completed', async () => {
      render(
        <EnrichmentQuestion {...defaultProps} isFocused={true} isCompleted={true} />
      );

      expect(screen.queryByTitle('Skip (s)')).not.toBeInTheDocument();
    });

    it('21. confirm is disabled without selection', () => {
      render(
        <EnrichmentQuestion
          {...defaultProps}
          isFocused={true}
          selectedChoiceIndex={-1}
        />
      );

      const confirmButton = screen.getByTitle('Confirm (Enter)');
      expect(confirmButton).toBeDisabled();
    });

    it('22. confirm is enabled with selection', () => {
      render(
        <EnrichmentQuestion
          {...defaultProps}
          isFocused={true}
          selectedChoiceIndex={1}
        />
      );

      const confirmButton = screen.getByTitle('Confirm (Enter)');
      expect(confirmButton).not.toBeDisabled();
    });

    it('23. skip calls onSkip', async () => {
      const onSkip = jest.fn();
      const user = userEvent.setup();

      render(
        <EnrichmentQuestion {...defaultProps} isFocused={true} onSkip={onSkip} />
      );

      await user.click(screen.getByTitle('Skip (s)'));

      expect(onSkip).toHaveBeenCalled();
    });

    it('24. confirm calls onConfirm when selection exists', async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();

      render(
        <EnrichmentQuestion
          {...defaultProps}
          isFocused={true}
          selectedChoiceIndex={1}
          onConfirm={onConfirm}
        />
      );

      await user.click(screen.getByTitle('Confirm (Enter)'));

      expect(onConfirm).toHaveBeenCalled();
    });
  });

  // =====================================================
  // ENTITY COUNT DISPLAY
  // =====================================================
  describe('Entity Count Display', () => {
    it('shows entity count badge', () => {
      render(<EnrichmentQuestion {...defaultProps} />);
      expect(screen.getByText(/2 orgs/)).toBeInTheDocument();
    });

    it('uses singular for 1 entity', () => {
      const singleEntityQuestion = createMockQuestion({
        entities: [{ id: 'org1', name: 'Acme', currentValue: null }],
      });
      render(
        <EnrichmentQuestion {...defaultProps} question={singleEntityQuestion} />
      );
      expect(screen.getByText(/1 org/)).toBeInTheDocument();
    });

    it('shows "contact" for user entity type', () => {
      const userQuestion = createMockQuestion({
        entityType: 'user',
        entities: [{ id: 'u1', name: 'John', currentValue: null }],
      });
      render(<EnrichmentQuestion {...defaultProps} question={userQuestion} />);
      expect(screen.getByText(/1 contact/)).toBeInTheDocument();
    });
  });
});
