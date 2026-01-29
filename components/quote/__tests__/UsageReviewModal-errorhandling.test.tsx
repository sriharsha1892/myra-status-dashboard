/**
 * UsageReviewModal Error Handling Tests
 * Tests for bug #10: Missing onCommit error handling
 * Verifies that the handleCommit function properly catches errors and shows toast notifications
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import UsageReviewModal from '../UsageReviewModal';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  CheckCircle: () => <span data-testid="icon-check">Check</span>,
  AlertTriangle: () => <span data-testid="icon-alert">Alert</span>,
  User: () => <span data-testid="icon-user">User</span>,
  Building: () => <span data-testid="icon-building">Building</span>,
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
  ChevronDown: () => <span data-testid="icon-chevron-down">Down</span>,
  ChevronUp: () => <span data-testid="icon-chevron-up">Up</span>,
  Save: () => <span data-testid="icon-save">Save</span>,
  Search: () => <span data-testid="icon-search">Search</span>,
  DollarSign: () => <span data-testid="icon-dollar">Dollar</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
}));

describe('UsageReviewModal Error Handling', () => {
  // Test data
  const mockUsageEntries = [
    { title: 'Test Conversation 1', user: 'John Doe', date: '2024-01-15', cost: '$5.00' },
    { title: 'Test Conversation 2', user: 'Jane Smith', date: '2024-01-16', cost: '$3.50' },
  ];

  const mockOrganizations = [
    { id: 'org-1', org_name: 'Acme Corp', is_internal: false },
    { id: 'org-2', org_name: 'Beta Inc', is_internal: false },
  ];

  // Existing mappings so all users are mapped (allowing commit)
  const mockExistingMappings = [
    { user_name: 'John Doe', org_id: 'org-1' },
    { user_name: 'Jane Smith', org_id: 'org-2' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    usageEntries: mockUsageEntries,
    organizations: mockOrganizations,
    existingMappings: mockExistingMappings,
    onCommit: jest.fn(),
    isCommitting: false,
  };

  // Store original console.error
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to track calls
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  // =====================================================
  // SUCCESS CASE TESTS
  // =====================================================
  describe('When onCommit succeeds', () => {
    it('should not show error toast when onCommit resolves successfully', async () => {
      const onCommit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      // Click the Import button
      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(onCommit).toHaveBeenCalled();
      });

      // toast.error should NOT have been called
      expect(toast.error).not.toHaveBeenCalled();
      // console.error should NOT have been called
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should call onCommit with correct arguments', async () => {
      const onCommit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(onCommit).toHaveBeenCalledWith(
          mockUsageEntries,
          expect.arrayContaining([
            expect.objectContaining({ userName: 'John Doe', orgId: 'org-1' }),
            expect.objectContaining({ userName: 'Jane Smith', orgId: 'org-2' }),
          ])
        );
      });
    });
  });

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================
  describe('When onCommit throws an Error', () => {
    it('should call toast.error with the error message', async () => {
      const errorMessage = 'Database connection failed';
      const onCommit = jest.fn().mockRejectedValue(new Error(errorMessage));
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          `Failed to import usage data: ${errorMessage}`
        );
      });
    });

    it('should log the error to console.error', async () => {
      const error = new Error('Network error');
      const onCommit = jest.fn().mockRejectedValue(error);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Failed to commit usage data:',
          error
        );
      });
    });

    it('should handle various error messages correctly', async () => {
      const testCases = [
        'Permission denied',
        'Timeout exceeded',
        'Invalid data format',
        '',  // Empty error message
      ];

      for (const errorMessage of testCases) {
        jest.clearAllMocks();
        const onCommit = jest.fn().mockRejectedValue(new Error(errorMessage));
        const user = userEvent.setup();

        const { unmount } = render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

        const importButton = screen.getByRole('button', { name: /import usage data/i });
        await user.click(importButton);

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            `Failed to import usage data: ${errorMessage}`
          );
        });

        unmount();
      }
    });
  });

  // =====================================================
  // NON-ERROR THROW TESTS
  // =====================================================
  describe('When onCommit throws a non-Error value', () => {
    it('should call toast.error with "Unknown error" for string rejection', async () => {
      const onCommit = jest.fn().mockRejectedValue('Something went wrong');
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to import usage data: Unknown error'
        );
      });
    });

    it('should call toast.error with "Unknown error" for null rejection', async () => {
      const onCommit = jest.fn().mockRejectedValue(null);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to import usage data: Unknown error'
        );
      });
    });

    it('should call toast.error with "Unknown error" for undefined rejection', async () => {
      const onCommit = jest.fn().mockRejectedValue(undefined);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to import usage data: Unknown error'
        );
      });
    });

    it('should call toast.error with "Unknown error" for object rejection', async () => {
      const onCommit = jest.fn().mockRejectedValue({ code: 500, message: 'Server error' });
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to import usage data: Unknown error'
        );
      });
    });

    it('should call toast.error with "Unknown error" for number rejection', async () => {
      const onCommit = jest.fn().mockRejectedValue(404);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to import usage data: Unknown error'
        );
      });
    });

    it('should log non-Error values to console.error', async () => {
      const nonErrorValue = { code: 'ERR_NETWORK' };
      const onCommit = jest.fn().mockRejectedValue(nonErrorValue);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Failed to commit usage data:',
          nonErrorValue
        );
      });
    });
  });

  // =====================================================
  // COMPONENT STABILITY TESTS
  // =====================================================
  describe('Component stability on error', () => {
    it('should not crash when onCommit fails', async () => {
      const onCommit = jest.fn().mockRejectedValue(new Error('Critical failure'));
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Component should still be rendered and functional
      expect(screen.getByRole('button', { name: /import usage data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should allow retry after failure', async () => {
      const onCommit = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(undefined);
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });

      // First attempt - fails
      await user.click(importButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to import usage data: First attempt failed'
        );
      });

      jest.clearAllMocks();

      // Second attempt - succeeds
      await user.click(importButton);
      await waitFor(() => {
        expect(onCommit).toHaveBeenCalledTimes(1);
      });

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should remain interactive after error', async () => {
      const onCommit = jest.fn().mockRejectedValue(new Error('Error'));
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} onClose={onClose} />);

      // Trigger error
      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // User should still be able to close the modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should still show user list after error', async () => {
      const onCommit = jest.fn().mockRejectedValue(new Error('Error'));
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // User list should still be visible
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  // =====================================================
  // EDGE CASE TESTS
  // =====================================================
  describe('Edge cases', () => {
    it('should handle rapid consecutive clicks with errors', async () => {
      const onCommit = jest.fn().mockRejectedValue(new Error('Error'));
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });

      // Rapid clicks
      await user.click(importButton);
      await user.click(importButton);
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Component should still be stable
      expect(screen.getByRole('button', { name: /import usage data/i })).toBeInTheDocument();
    });

    it('should handle Error subclass correctly', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const onCommit = jest.fn().mockRejectedValue(new CustomError('Custom error occurred'));
      const user = userEvent.setup();

      render(<UsageReviewModal {...defaultProps} onCommit={onCommit} />);

      const importButton = screen.getByRole('button', { name: /import usage data/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to import usage data: Custom error occurred'
        );
      });
    });
  });
});
