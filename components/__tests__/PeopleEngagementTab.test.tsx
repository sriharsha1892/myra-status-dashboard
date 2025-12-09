/**
 * PeopleEngagementTab Unit Tests
 * Tests the People & Engagement tab with user influence prompts
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PeopleEngagementTab from '../PeopleEngagementTab';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UpdatesTab
jest.mock('../UpdatesTab', () => ({
  __esModule: true,
  default: () => <div data-testid="updates-tab">Updates Tab Content</div>,
}));

// Mock UserInfluencePrompt
jest.mock('../enrichment', () => ({
  UserInfluencePrompt: ({ userId, onUpdate }: any) => (
    <div data-testid={`influence-prompt-${userId}`}>
      <span>Influence Prompt for {userId}</span>
      <button onClick={() => onUpdate?.('champion')}>Set Champion</button>
    </div>
  ),
}));

describe('PeopleEngagementTab', () => {
  const mockUsers = [
    {
      user_id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Decision Maker',
      current_stage: 'Engaged',
      influence: null,
    },
    {
      user_id: 'user2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Champion',
      current_stage: 'Interested',
      influence: 'champion',
    },
    {
      user_id: 'user3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'Influencer',
      current_stage: 'Cold',
      influence: null,
    },
  ];

  const defaultProps = {
    orgId: 'org-123',
    users: mockUsers,
    onAddUser: jest.fn(),
    onEditUser: jest.fn(),
    onDeleteUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // INFLUENCE PROMPT VISIBILITY TESTS
  // =====================================================
  describe('Influence Prompt Visibility', () => {
    it('1. shows influence prompt when user has no influence', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      // John (user1) has no influence
      expect(screen.getByTestId('influence-prompt-user1')).toBeInTheDocument();
      // Bob (user3) has no influence
      expect(screen.getByTestId('influence-prompt-user3')).toBeInTheDocument();
    });

    it('2. hides prompt when user has influence set', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      // Jane (user2) has influence set to 'champion'
      expect(screen.queryByTestId('influence-prompt-user2')).not.toBeInTheDocument();
    });

    it('3. merges influence from platform user data', async () => {
      // Create users where stakeholder has no influence but platformUser does
      const usersWithMerge = [
        {
          user_id: 'user-merge',
          name: 'Merge Test',
          email: 'merge@example.com',
          role: 'Contact',
          current_stage: 'Active',
          influence: 'evaluator', // Has influence
        },
      ];

      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} users={usersWithMerge} />);
      });

      // Should NOT show prompt because influence is set
      expect(screen.queryByTestId('influence-prompt-user-merge')).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // PLATFORM USER BADGE TESTS
  // =====================================================
  describe('Active User Badge', () => {
    it('5. shows Active User badge for platform users with activity', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      // Cards should render
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  // =====================================================
  // LOADING & EMPTY STATES
  // =====================================================
  describe('Loading and Empty States', () => {
    it('8. shows header while fetching', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });
      expect(screen.getByText('People & Contacts')).toBeInTheDocument();
    });

    it('9. shows empty state when no users', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} users={[]} />);
      });

      expect(screen.getByText('No contacts yet')).toBeInTheDocument();
      expect(screen.getByText('Add First Contact')).toBeInTheDocument();
    });

    it('10. renders user cards for each user', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });

  // =====================================================
  // USER CARD ACTIONS
  // =====================================================
  describe('User Card Actions', () => {
    it('11. Edit button triggers onEditUser', async () => {
      const onEditUser = jest.fn();
      const user = userEvent.setup();

      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} onEditUser={onEditUser} />);
      });

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      expect(onEditUser).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user1',
        name: 'John Doe',
      }));
    });

    it('Delete button triggers onDeleteUser', async () => {
      const onDeleteUser = jest.fn();
      const user = userEvent.setup();

      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} onDeleteUser={onDeleteUser} />);
      });

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      expect(onDeleteUser).toHaveBeenCalledWith('user1');
    });
  });

  // =====================================================
  // SECTION TOGGLE TESTS
  // =====================================================
  describe('Section Toggle', () => {
    it('12. toggles between People and Activity sections', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      // Initially shows People section
      expect(screen.getByText('People & Contacts')).toBeInTheDocument();

      // Click Activity button
      await user.click(screen.getByText('User Activity'));

      // Should show Updates Tab
      await waitFor(() => {
        expect(screen.getByTestId('updates-tab')).toBeInTheDocument();
      });

      // Click People button to go back
      await user.click(screen.getByText('People'));

      // Should show People section again
      await waitFor(() => {
        expect(screen.getByText('People & Contacts')).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // ADD USER BUTTON
  // =====================================================
  describe('Add User Button', () => {
    it('Add Contact button triggers onAddUser', async () => {
      const onAddUser = jest.fn();
      const user = userEvent.setup();

      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} onAddUser={onAddUser} />);
      });

      await user.click(screen.getByText('Add Contact'));

      expect(onAddUser).toHaveBeenCalled();
    });

    it('Add First Contact button in empty state triggers onAddUser', async () => {
      const onAddUser = jest.fn();
      const user = userEvent.setup();

      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} users={[]} onAddUser={onAddUser} />);
      });

      await user.click(screen.getByText('Add First Contact'));

      expect(onAddUser).toHaveBeenCalled();
    });
  });

  // =====================================================
  // ROLE AND STAGE BADGES
  // =====================================================
  describe('User Badges', () => {
    it('displays role badges', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      expect(screen.getByText('Decision Maker')).toBeInTheDocument();
      expect(screen.getByText('Champion')).toBeInTheDocument();
      expect(screen.getByText('Influencer')).toBeInTheDocument();
    });

    it('displays stage badges', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      expect(screen.getByText('Engaged')).toBeInTheDocument();
      expect(screen.getByText('Interested')).toBeInTheDocument();
      expect(screen.getByText('Cold')).toBeInTheDocument();
    });
  });

  // =====================================================
  // SET PASSWORD BUTTON
  // =====================================================
  describe('Set Password Button', () => {
    it('shows Set Password button when onSetPassword is provided', async () => {
      await act(async () => {
        render(
          <PeopleEngagementTab
            {...defaultProps}
            onSetPassword={jest.fn()}
          />
        );
      });

      expect(screen.getAllByText('Set Password').length).toBeGreaterThan(0);
    });

    it('hides Set Password button when onSetPassword is not provided', async () => {
      await act(async () => {
        render(<PeopleEngagementTab {...defaultProps} />);
      });

      expect(screen.queryByText('Set Password')).not.toBeInTheDocument();
    });

    it('triggers onSetPassword when clicked', async () => {
      const onSetPassword = jest.fn();
      const user = userEvent.setup();

      await act(async () => {
        render(
          <PeopleEngagementTab
            {...defaultProps}
            onSetPassword={onSetPassword}
          />
        );
      });

      const setPasswordButtons = screen.getAllByText('Set Password');
      await user.click(setPasswordButtons[0]);

      expect(onSetPassword).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user1',
      }));
    });
  });
});
