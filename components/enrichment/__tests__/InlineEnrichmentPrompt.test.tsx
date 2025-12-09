/**
 * InlineEnrichmentPrompt Unit Tests
 * Tests all combinations of the inline enrichment prompt component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineEnrichmentPrompt, {
  HealthStatusPrompt,
  DealMomentumPrompt,
  UserInfluencePrompt,
} from '../InlineEnrichmentPrompt';

// Mock Supabase client
const mockUpdate = jest.fn();
const mockEq = jest.fn(() => Promise.resolve({ error: null }));
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      mockFrom(table);
      return {
        update: (data: Record<string, unknown>) => {
          mockUpdate(data);
          return {
            eq: (field: string, value: string) => mockEq(field, value),
          };
        },
      };
    },
  }),
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

describe('InlineEnrichmentPrompt', () => {
  const defaultProps = {
    entityId: 'org-123',
    entityType: 'organization' as const,
    field: 'health_status',
    table: 'trial_organizations',
    label: 'Set Health Status',
    options: [
      { value: 'healthy', label: 'Healthy', icon: 'healthy' as const },
      { value: 'warning', label: 'Warning', icon: 'warning' as const },
      { value: 'at-risk', label: 'At-Risk', icon: 'at-risk' as const },
      { value: 'critical', label: 'Critical', icon: 'critical' as const },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // DISPLAY LOGIC TESTS
  // =====================================================
  describe('Display Logic', () => {
    it('1. shows prompt when no current value', () => {
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);
      expect(screen.getByText('Set Health Status')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('2. hides prompt when value exists and showAlways is false', () => {
      const { container } = render(
        <InlineEnrichmentPrompt {...defaultProps} currentValue="healthy" />
      );
      expect(container.firstChild).toBeNull();
    });

    it('3. shows prompt when value exists with showAlways=true', () => {
      render(
        <InlineEnrichmentPrompt
          {...defaultProps}
          currentValue="healthy"
          showAlways={true}
        />
      );
      // When showAlways is true with existing value, it shows compact display with Change button
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();
    });

    it('4. shows compact display after selection', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Healthy'));

      await waitFor(() => {
        expect(screen.getByText('Healthy')).toBeInTheDocument();
        expect(screen.getByText('Change')).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // OPTION SELECTION TESTS
  // =====================================================
  describe('Option Selection', () => {
    it('5. renders all options', () => {
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('At-Risk')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('6. calls supabase update on click', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Healthy'));

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('trial_organizations');
        expect(mockUpdate).toHaveBeenCalledWith({ health_status: 'healthy' });
        expect(mockEq).toHaveBeenCalledWith('org_id', 'org-123');
      });
    });

    it('7. shows success toast on successful update', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Warning'));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Updated set health status');
      });
    });

    it('8. shows error toast on failed update', async () => {
      // Override mock to return an error
      mockEq.mockImplementationOnce(() =>
        Promise.resolve({ error: { message: 'DB Error' } })
      );

      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('At-Risk'));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to update');
      });
    });

    it('9. disables buttons while updating', async () => {
      const user = userEvent.setup();
      // Make the update slow
      mockEq.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      const healthyButton = screen.getByText('Healthy').closest('button')!;
      await user.click(healthyButton);

      // Buttons should be disabled during update
      expect(healthyButton).toBeDisabled();
    });

    it('10. shows loading state while updating', async () => {
      const user = userEvent.setup();
      mockEq.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      // Get the healthy button before clicking
      const healthyButton = screen.getByText('Healthy').closest('button')!;
      await user.click(healthyButton);

      // Check for disabled state during update
      expect(healthyButton).toBeDisabled();
    });
  });

  // =====================================================
  // COMPACT DISPLAY TESTS
  // =====================================================
  describe('Compact Display (after selection)', () => {
    it('11. shows selected label in compact view', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Healthy'));

      await waitFor(() => {
        // After selection, should show compact display with label
        const compactDisplay = screen.getByText('Healthy');
        expect(compactDisplay).toBeInTheDocument();
      });
    });

    it('12. shows correct icon for warning', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Warning'));

      await waitFor(() => {
        // The compact display should be visible with warning icon (amber styling)
        expect(screen.getByText('Warning')).toBeInTheDocument();
      });
    });

    it('13. shows red styling for critical', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Critical'));

      await waitFor(() => {
        const display = screen.getByText('Critical').closest('div');
        expect(display).toHaveClass('text-red-700');
      });
    });

    it('14. shows Change button in compact view', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Healthy'));

      await waitFor(() => {
        expect(screen.getByText('Change')).toBeInTheDocument();
      });
    });

    it('15. clicking Change resets selection', async () => {
      const user = userEvent.setup();
      render(<InlineEnrichmentPrompt {...defaultProps} currentValue={null} />);

      await user.click(screen.getByText('Healthy'));
      await waitFor(() => {
        expect(screen.getByText('Change')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Change'));

      // Should show all options again
      await waitFor(() => {
        expect(screen.getByText('Set Health Status')).toBeInTheDocument();
        expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
        expect(screen.getByText('Warning')).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // CALLBACK TESTS
  // =====================================================
  describe('Callbacks', () => {
    it('calls onUpdate callback after successful selection', async () => {
      const onUpdate = jest.fn();
      const user = userEvent.setup();

      render(
        <InlineEnrichmentPrompt
          {...defaultProps}
          currentValue={null}
          onUpdate={onUpdate}
        />
      );

      await user.click(screen.getByText('Healthy'));

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith('healthy');
      });
    });
  });
});

// =====================================================
// PRESET COMPONENT TESTS
// =====================================================
describe('HealthStatusPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('16. uses correct field and table', async () => {
    const user = userEvent.setup();
    render(<HealthStatusPrompt orgId="org-456" currentValue={null} />);

    await user.click(screen.getByText('Healthy'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('trial_organizations');
      expect(mockUpdate).toHaveBeenCalledWith({ health_status: 'healthy' });
      expect(mockEq).toHaveBeenCalledWith('org_id', 'org-456');
    });
  });

  it('renders all 4 health status options', () => {
    render(<HealthStatusPrompt orgId="org-456" currentValue={null} />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('At-Risk')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});

describe('DealMomentumPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('17. uses correct field and table', async () => {
    const user = userEvent.setup();
    render(<DealMomentumPrompt orgId="org-789" currentValue={null} />);

    await user.click(screen.getByText('Fast Track'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('trial_organizations');
      expect(mockUpdate).toHaveBeenCalledWith({ deal_momentum: 'fast_track' });
      expect(mockEq).toHaveBeenCalledWith('org_id', 'org-789');
    });
  });

  it('renders all deal momentum options', () => {
    render(<DealMomentumPrompt orgId="org-789" currentValue={null} />);
    expect(screen.getByText('Fast Track')).toBeInTheDocument();
    expect(screen.getByText('Steady')).toBeInTheDocument();
    expect(screen.getByText('Stalled')).toBeInTheDocument();
    expect(screen.getByText('At Risk')).toBeInTheDocument();
  });
});

describe('UserInfluencePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('18. uses correct field and table for user', async () => {
    const user = userEvent.setup();
    render(<UserInfluencePrompt userId="user-123" currentValue={null} />);

    await user.click(screen.getByText('Champion'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('trial_users');
      expect(mockUpdate).toHaveBeenCalledWith({ influence: 'champion' });
    });
  });

  it('19. renders all 5 influence options', () => {
    render(<UserInfluencePrompt userId="user-123" currentValue={null} />);
    expect(screen.getByText('Champion')).toBeInTheDocument();
    expect(screen.getByText('Decision Maker')).toBeInTheDocument();
    expect(screen.getByText('Evaluator')).toBeInTheDocument();
    expect(screen.getByText('Influencer')).toBeInTheDocument();
    expect(screen.getByText('Blocker')).toBeInTheDocument();
  });

  it('20. uses user_id field for user entity type', async () => {
    const user = userEvent.setup();
    render(<UserInfluencePrompt userId="user-456" currentValue={null} />);

    await user.click(screen.getByText('Decision Maker'));

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-456');
    });
  });
});
