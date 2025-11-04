'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  raw_user_meta_data: {
    name?: string;
    full_name?: string;
    role?: string;
  };
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentionedUserIds: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface MentionData {
  userId: string;
  username: string;
}

export function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  className = '',
  disabled = false,
}: MentionInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [mentions, setMentions] = useState<MentionData[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        console.error('Error fetching users:', response.statusText);
        return;
      }

      const data = await response.json();

      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Detect @ trigger and filter users
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = value;
    const cursorPos = textarea.selectionStart;

    // Find the last @ before cursor
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setShowPicker(false);
      return;
    }

    // Check if there's a space or newline after the @ (which would close the mention)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex);
    if (textAfterAt.includes(' ') && textAfterAt.lastIndexOf(' ') > 0) {
      setShowPicker(false);
      return;
    }

    // Extract search term
    const searchTerm = textAfterAt.substring(1).toLowerCase();
    setMentionSearch(searchTerm);

    // Filter users by name or email (fuzzy search)
    const filtered = users.filter((user) => {
      const name = user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name || '';
      const email = user.email || '';
      const searchable = `${name} ${email}`.toLowerCase();

      // Simple fuzzy match: all characters of search term should appear in order
      if (searchTerm === '') return true;

      let searchIndex = 0;
      for (let i = 0; i < searchable.length && searchIndex < searchTerm.length; i++) {
        if (searchable[i] === searchTerm[searchIndex]) {
          searchIndex++;
        }
      }
      return searchIndex === searchTerm.length;
    });

    setFilteredUsers(filtered);
    setSelectedIndex(0);

    if (filtered.length > 0) {
      setShowPicker(true);

      // Calculate picker position based on cursor
      const coords = getCaretCoordinates(textarea, cursorPos);
      setPickerPosition({
        top: coords.top + 20,
        left: coords.left,
      });
    } else {
      setShowPicker(false);
    }
  }, [value, users]);

  // Get caret coordinates for positioning picker
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const lineHeight = parseInt(style.lineHeight);

    // Simple approximation - calculate based on text before cursor
    const textBeforeCursor = element.value.substring(0, position);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;

    return {
      top: (currentLine - 1) * lineHeight,
      left: 0, // Simplified - always align left
    };
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showPicker) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;

      case 'Enter':
        if (showPicker && filteredUsers[selectedIndex]) {
          e.preventDefault();
          selectUser(filteredUsers[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowPicker(false);
        break;
    }
  };

  // Select a user from picker
  const selectUser = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = value;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    const userName = user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name || user.email.split('@')[0];
    const mention = `@${userName}`;

    // Replace @search with @username
    const newText =
      text.substring(0, lastAtIndex) +
      mention +
      ' ' +
      text.substring(cursorPos);

    // Update mentions list
    const newMention: MentionData = {
      userId: user.id,
      username: userName,
    };

    const updatedMentions = [...mentions, newMention];
    setMentions(updatedMentions);

    // Extract unique user IDs and notify parent
    const uniqueUserIds = Array.from(new Set(updatedMentions.map(m => m.userId)));
    onMentionsChange(uniqueUserIds);

    onChange(newText);
    setShowPicker(false);

    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = lastAtIndex + mention.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  // Handle text change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Re-parse mentions from text to keep them in sync
    parseMentionsFromText(newValue);
  };

  // Parse existing mentions from text
  const parseMentionsFromText = (text: string) => {
    const mentionPattern = /@(\w+)/g;
    const foundMentions: MentionData[] = [];
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      const username = match[1];
      // Find user by username
      const user = users.find((u) => {
        const name = u.raw_user_meta_data?.name || u.raw_user_meta_data?.full_name || u.email.split('@')[0];
        return name.toLowerCase() === username.toLowerCase();
      });

      if (user) {
        foundMentions.push({
          userId: user.id,
          username,
        });
      }
    }

    setMentions(foundMentions);
    const uniqueUserIds = Array.from(new Set(foundMentions.map(m => m.userId)));
    onMentionsChange(uniqueUserIds);
  };

  // Click outside to close picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (showPicker && pickerRef.current) {
      const selectedElement = pickerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showPicker]);

  const getUserName = (user: User) => {
    return user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name || 'Unknown User';
  };

  const getUserInitial = (user: User) => {
    const name = getUserName(user);
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${className}`}
        disabled={disabled}
        rows={4}
      />

      {/* User picker dropdown */}
      {showPicker && filteredUsers.length > 0 && (
        <div
          ref={pickerRef}
          className="absolute z-50 w-80 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[200px] overflow-y-auto"
          style={{
            top: `${pickerPosition.top}px`,
          }}
        >
          <div className="py-1">
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                data-index={index}
                onClick={() => selectUser(user)}
                className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors h-[40px] ${
                  index === selectedIndex
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-gray-50 text-gray-900'
                }`}
              >
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                  {getUserInitial(user)}
                </div>

                {/* Name and email */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {getUserName(user)}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
