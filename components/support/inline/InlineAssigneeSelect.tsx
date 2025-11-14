'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email?: string;
  role: string;
}

interface InlineAssigneeSelectProps {
  value: string | null;
  ticketId: string;
  onChange: (ticketId: string, newAssigneeId: string | null) => Promise<void>;
  onCancel?: () => void;
}

export default function InlineAssigneeSelect({
  value,
  ticketId,
  onChange,
  onCancel,
}: InlineAssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Fetch users when component opens
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers();
    }
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fetch the current assigned user
  useEffect(() => {
    if (value) {
      fetchAssignedUser(value);
    } else {
      setSelectedUser(null);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
        if (onCancel) onCancel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        if (onCancel) onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCancel]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, role')
        .in('role', ['Team', 'Admin', 'Account Manager'])
        .order('display_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAssignedUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, role')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setSelectedUser(data);
    } catch (error) {
      console.error('Error fetching assigned user:', error);
    }
  };

  const handleUserSelect = async (user: UserProfile | null) => {
    const newAssigneeId = user?.user_id || null;

    if (newAssigneeId === value) {
      setIsOpen(false);
      setSearchQuery('');
      return;
    }

    setIsSaving(true);
    try {
      await onChange(ticketId, newAssigneeId);
      setSelectedUser(user);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      // Rollback on error
      if (value) {
        fetchAssignedUser(value);
      } else {
        setSelectedUser(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const displayName = user.display_name?.toLowerCase() || '';
    return displayName.includes(query);
  });

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={isSaving}
        className={`inline-flex items-center gap-2 px-2 py-1 text-sm text-gray-700 rounded transition-all ${
          isOpen ? 'bg-gray-100 ring-2 ring-blue-600/20' : 'hover:bg-gray-50'
        } ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      >
        {isSaving ? (
          <>
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500">Saving...</span>
          </>
        ) : selectedUser ? (
          <>
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
              {getInitials(selectedUser.display_name)}
            </div>
            <span className="font-medium">{selectedUser.display_name || 'Unknown'}</span>
          </>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )}
      </button>

      {isOpen && !isSaving && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-8 px-2.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto">
            {loadingUsers ? (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  Loading users...
                </div>
              </div>
            ) : (
              <div className="py-1">
                {/* Unassign option */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserSelect(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    !selectedUser
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-xs text-gray-400">-</span>
                  </div>
                  <span>Unassigned</span>
                </button>

                {filteredUsers.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-gray-500">
                    {searchQuery ? 'No users found' : 'No team members available'}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserSelect(user);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                        selectedUser?.user_id === user.user_id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                        {getInitials(user.display_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {user.display_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
