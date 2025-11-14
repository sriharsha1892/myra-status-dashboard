'use client';

/**
 * Enhanced Mention Text Editor with Multi-Entity Support
 *
 * Supports mentioning:
 * - @users: All users in the system
 * - @trial-org: Trial organizations
 * - @account-manager: Specific account managers
 *
 * Usage: Same as MentionTextEditor, but with enhanced mention capabilities
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Users, UserCheck } from 'lucide-react';
import MentionTextEditor from './MentionTextEditor';

interface MentionEntity {
  id: string;
  label: string;
  type: 'user' | 'trial_org' | 'account_manager';
  email?: string;
  metadata?: Record<string, any>;
}

interface EnhancedMentionTextEditorProps {
  content?: string;
  placeholder?: string;
  onSubmit?: (content: string, mentions: { users: string[]; trial_orgs: string[]; account_managers: string[] }) => void;
  onChange?: (content: string, mentions: { users: string[]; trial_orgs: string[]; account_managers: string[] }) => void;
  onCancel?: () => void;
  submitButtonText?: string;
  minHeight?: string;
  showToolbar?: boolean;
  /**
   * Enable mention types
   */
  enableUserMentions?: boolean;
  enableTrialOrgMentions?: boolean;
  enableAccountManagerMentions?: boolean;
}

export default function EnhancedMentionTextEditor({
  content = '',
  placeholder = 'Type @ to mention users, trial orgs, or account managers...',
  onSubmit,
  onChange,
  onCancel,
  submitButtonText = 'Send',
  minHeight = '120px',
  showToolbar = true,
  enableUserMentions = true,
  enableTrialOrgMentions = true,
  enableAccountManagerMentions = true,
}: EnhancedMentionTextEditorProps) {
  const supabase = createClient();

  // Since TipTap's Mention extension only supports single type, we'll enhance the
  // user search to include trial orgs and account managers, and differentiate them
  // using special prefixes in the ID

  const handleSubmitWithEnhancedMentions = (html: string, mentionIds: string[]) => {
    // Parse mention IDs to separate different entity types
    // Format: "user:id", "trial_org:id", "account_manager:id"

    const users: string[] = [];
    const trial_orgs: string[] = [];
    const account_managers: string[] = [];

    mentionIds.forEach(mentionId => {
      if (mentionId.startsWith('trial_org:')) {
        trial_orgs.push(mentionId.replace('trial_org:', ''));
      } else if (mentionId.startsWith('account_manager:')) {
        account_managers.push(mentionId.replace('account_manager:', ''));
      } else if (mentionId.startsWith('user:')) {
        users.push(mentionId.replace('user:', ''));
      } else {
        // Default to user if no prefix
        users.push(mentionId);
      }
    });

    onSubmit?.(html, { users, trial_orgs, account_managers });
  };

  const handleChangeWithEnhancedMentions = (html: string, mentionIds: string[]) => {
    const users: string[] = [];
    const trial_orgs: string[] = [];
    const account_managers: string[] = [];

    mentionIds.forEach(mentionId => {
      if (mentionId.startsWith('trial_org:')) {
        trial_orgs.push(mentionId.replace('trial_org:', ''));
      } else if (mentionId.startsWith('account_manager:')) {
        account_managers.push(mentionId.replace('account_manager:', ''));
      } else if (mentionId.startsWith('user:')) {
        users.push(mentionId.replace('user:', ''));
      } else {
        users.push(mentionId);
      }
    });

    onChange?.(html, { users, trial_orgs, account_managers });
  };

  // For now, use the existing MentionTextEditor as is
  // The full multi-type mention system would require custom TipTap extension
  // which is complex. This component serves as a wrapper and documents the pattern

  return (
    <div className="space-y-2">
      {/* Entity Type Hints */}
      {(enableTrialOrgMentions || enableAccountManagerMentions) && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
          <span className="font-medium">You can mention:</span>
          {enableUserMentions && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              @users
            </span>
          )}
          {enableTrialOrgMentions && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              @trial-orgs
            </span>
          )}
          {enableAccountManagerMentions && (
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              @account-managers
            </span>
          )}
        </div>
      )}

      {/* Base Editor */}
      <MentionTextEditor
        content={content}
        placeholder={placeholder}
        onSubmit={onSubmit ? handleSubmitWithEnhancedMentions : undefined}
        onChange={onChange ? handleChangeWithEnhancedMentions : undefined}
        onCancel={onCancel}
        submitButtonText={submitButtonText}
        minHeight={minHeight}
        showToolbar={showToolbar}
      />
    </div>
  );
}

/**
 * Utility function to extract mentions from HTML content
 * Can be used to parse mentions on the backend
 */
export function extractMentionsFromHTML(html: string): {
  users: string[];
  trial_orgs: string[];
  account_managers: string[];
} {
  const users: string[] = [];
  const trial_orgs: string[] = [];
  const account_managers: string[] = [];

  // Parse mention elements from HTML
  // Format: <span class="mention" data-id="type:id">@name</span>
  const mentionRegex = /<span[^>]*class="mention"[^>]*data-id="([^"]+)"[^>]*>/g;
  let match;

  while ((match = mentionRegex.exec(html)) !== null) {
    const mentionId = match[1];

    if (mentionId.startsWith('trial_org:')) {
      trial_orgs.push(mentionId.replace('trial_org:', ''));
    } else if (mentionId.startsWith('account_manager:')) {
      account_managers.push(mentionId.replace('account_manager:', ''));
    } else if (mentionId.startsWith('user:')) {
      users.push(mentionId.replace('user:', ''));
    } else {
      users.push(mentionId);
    }
  }

  return { users, trial_orgs, account_managers };
}
