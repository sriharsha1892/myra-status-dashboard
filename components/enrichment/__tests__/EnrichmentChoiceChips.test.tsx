/**
 * EnrichmentChoiceChips Unit Tests
 * Tests all combinations of the choice chips component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnrichmentChoiceChips } from '../EnrichmentChoiceChips';
import type { QuestionOption, AISuggestion } from '@/lib/enrichment/types';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, disabled, className, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} className={className} {...props}>
        {children}
      </button>
    ),
  },
}));

describe('EnrichmentChoiceChips', () => {
  const defaultOptions: QuestionOption[] = [
    { value: 'healthy', label: 'Healthy' },
    { value: 'warning', label: 'Warning' },
    { value: 'at-risk', label: 'At-Risk' },
    { value: 'critical', label: 'Critical' },
  ];

  const defaultProps = {
    options: defaultOptions,
    selectedIndex: -1,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // RENDERING TESTS
  // =====================================================
  describe('Rendering', () => {
    it('1. renders all options', () => {
      render(<EnrichmentChoiceChips {...defaultProps} />);
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('At-Risk')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('2. shows neutral styling when none selected', () => {
      render(<EnrichmentChoiceChips {...defaultProps} selectedIndex={-1} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('border-neutral-200');
        expect(button).not.toHaveClass('border-blue-500');
      });
    });

    it('12. shows keyboard shortcut numbers', () => {
      render(<EnrichmentChoiceChips {...defaultProps} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  // =====================================================
  // SELECTION STYLING TESTS
  // =====================================================
  describe('Selection Styling', () => {
    it('3. shows blue styling for first selected', () => {
      render(<EnrichmentChoiceChips {...defaultProps} selectedIndex={0} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveClass('border-blue-500');
      expect(buttons[0]).toHaveClass('bg-blue-50');
      expect(buttons[0]).toHaveClass('text-blue-700');
    });

    it('4. shows blue styling for last selected', () => {
      render(<EnrichmentChoiceChips {...defaultProps} selectedIndex={3} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[3]).toHaveClass('border-blue-500');
      expect(buttons[0]).not.toHaveClass('border-blue-500');
    });
  });

  // =====================================================
  // AI SUGGESTION TESTS
  // =====================================================
  describe('AI Suggestion Highlighting', () => {
    const highConfidenceSuggestion: AISuggestion = {
      value: 'warning',
      confidence: 0.7,
    };

    const lowConfidenceSuggestion: AISuggestion = {
      value: 'warning',
      confidence: 0.5,
    };

    it('5. shows violet styling for AI suggested option (no selection)', () => {
      render(
        <EnrichmentChoiceChips
          {...defaultProps}
          selectedIndex={-1}
          aiSuggestion={highConfidenceSuggestion}
        />
      );
      const warningButton = screen.getByText('Warning').closest('button');
      expect(warningButton).toHaveClass('ring-1');
      expect(warningButton).toHaveClass('ring-violet-300');
    });

    it('6. shows both blue selection and violet AI suggestion for different options', () => {
      render(
        <EnrichmentChoiceChips
          {...defaultProps}
          selectedIndex={0}
          aiSuggestion={highConfidenceSuggestion}
        />
      );
      const healthyButton = screen.getByText('Healthy').closest('button');
      const warningButton = screen.getByText('Warning').closest('button');

      // First button selected (blue)
      expect(healthyButton).toHaveClass('border-blue-500');
      // Second button AI suggested (violet)
      expect(warningButton).toHaveClass('ring-violet-300');
    });

    it('7. shows only blue when AI suggested same as selected', () => {
      render(
        <EnrichmentChoiceChips
          {...defaultProps}
          selectedIndex={1} // Warning is at index 1
          aiSuggestion={highConfidenceSuggestion}
        />
      );
      const warningButton = screen.getByText('Warning').closest('button');
      // Should be blue (selected), not violet (AI suggested)
      expect(warningButton).toHaveClass('border-blue-500');
      expect(warningButton).not.toHaveClass('ring-violet-300');
    });

    it('8. no violet highlight for low confidence', () => {
      render(
        <EnrichmentChoiceChips
          {...defaultProps}
          selectedIndex={-1}
          aiSuggestion={lowConfidenceSuggestion}
        />
      );
      const warningButton = screen.getByText('Warning').closest('button');
      expect(warningButton).not.toHaveClass('ring-violet-300');
    });

    it('15. shows AI dot indicator for high confidence', () => {
      render(
        <EnrichmentChoiceChips
          {...defaultProps}
          selectedIndex={-1}
          aiSuggestion={highConfidenceSuggestion}
        />
      );
      // Look for the violet dot inside the warning button
      const warningButton = screen.getByText('Warning').closest('button');
      const dot = warningButton?.querySelector('.bg-violet-400');
      expect(dot).toBeInTheDocument();
    });

    it('16. AI dot has tooltip with confidence percentage', () => {
      const suggestionWith72: AISuggestion = {
        value: 'warning',
        confidence: 0.72,
      };
      render(
        <EnrichmentChoiceChips
          {...defaultProps}
          selectedIndex={-1}
          aiSuggestion={suggestionWith72}
        />
      );
      const warningButton = screen.getByText('Warning').closest('button');
      const dot = warningButton?.querySelector('[title]');
      expect(dot?.getAttribute('title')).toContain('72%');
    });
  });

  // =====================================================
  // INTERACTION TESTS
  // =====================================================
  describe('Interactions', () => {
    it('9. clicking chip calls onSelect with correct index', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();

      render(<EnrichmentChoiceChips {...defaultProps} onSelect={onSelect} />);

      await user.click(screen.getByText('At-Risk'));

      expect(onSelect).toHaveBeenCalledWith(2); // At-Risk is at index 2
    });

    it('10. disabled chip does not call onSelect', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();

      render(
        <EnrichmentChoiceChips {...defaultProps} onSelect={onSelect} disabled={true} />
      );

      await user.click(screen.getByText('Healthy'));

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('11. disabled chips show opacity styling', () => {
      render(<EnrichmentChoiceChips {...defaultProps} disabled={true} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('opacity-50');
        expect(button).toHaveClass('cursor-not-allowed');
      });
    });
  });

  // =====================================================
  // ANIMATION TESTS (Limited due to framer-motion mock)
  // =====================================================
  describe('Animation States', () => {
    it('13. hover is enabled when not disabled', async () => {
      const { container } = render(<EnrichmentChoiceChips {...defaultProps} />);
      // In real tests, we'd check for whileHover prop
      // With mock, we just verify buttons are interactive
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).not.toBeDisabled();
    });

    it('14. hover is disabled when component is disabled', () => {
      render(<EnrichmentChoiceChips {...defaultProps} disabled={true} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  // =====================================================
  // EDGE CASES
  // =====================================================
  describe('Edge Cases', () => {
    it('handles empty options array', () => {
      render(<EnrichmentChoiceChips {...defaultProps} options={[]} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('handles single option', () => {
      render(
        <EnrichmentChoiceChips
          {...defaultProps}
          options={[{ value: 'single', label: 'Single Option' }]}
        />
      );
      expect(screen.getByText('Single Option')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('handles undefined aiSuggestion', () => {
      render(<EnrichmentChoiceChips {...defaultProps} aiSuggestion={undefined} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('ring-violet-300');
      });
    });
  });
});
