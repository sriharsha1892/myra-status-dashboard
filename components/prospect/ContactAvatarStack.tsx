'use client';

import React from 'react';
import Image from 'next/image';
import {
  Crown,
  Shield,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { OrgContact, ContactRole, getInitials, getAvatarColor } from '@/lib/types/contact';
import { ROLE_PRIORITY, sortRolesByPriority } from './RoleBadge';

interface ContactAvatarProps {
  contact: Pick<OrgContact, 'name' | 'avatar_url' | 'role' | 'is_primary' | 'is_advocate'>;
  size?: 'sm' | 'md' | 'lg';
  showRoleBadge?: boolean;
  showRing?: boolean;
  className?: string;
}

export function ContactAvatar({
  contact,
  size = 'md',
  showRoleBadge = true,
  showRing = false,
  className = '',
}: ContactAvatarProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  };

  const badgeSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const badgePositions = {
    sm: '-bottom-0.5 -right-0.5',
    md: '-bottom-0.5 -right-0.5',
    lg: '-bottom-1 -right-1',
  };

  const avatarColor = getAvatarColor(contact.name);
  const initials = getInitials(contact.name);

  // Role badge icon
  const roleBadgeIcons: Partial<Record<ContactRole, { icon: React.ElementType; color: string }>> = {
    champion: { icon: Crown, color: 'text-amber-500 bg-amber-100 ring-amber-200' },
    decision_maker: { icon: Shield, color: 'text-purple-500 bg-purple-100 ring-purple-200' },
    blocker: { icon: AlertTriangle, color: 'text-red-500 bg-red-100 ring-red-200' },
    executive_sponsor: { icon: Star, color: 'text-indigo-500 bg-indigo-100 ring-indigo-200' },
  };

  const roleBadge = roleBadgeIcons[contact.role];

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Avatar */}
      <div
        className={`
          relative rounded-full flex items-center justify-center font-medium text-white
          ${sizeClasses[size]}
          ${showRing ? 'ring-2 ring-white' : ''}
          ${contact.is_primary ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}
        `}
      >
        {contact.avatar_url ? (
          <Image
            src={contact.avatar_url}
            alt={contact.name}
            fill
            className="rounded-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 rounded-full flex items-center justify-center ${avatarColor}`}>
            {initials}
          </div>
        )}
      </div>

      {/* Role badge overlay */}
      {showRoleBadge && roleBadge && (
        <div
          className={`
            absolute ${badgePositions[size]} ${badgeSizes[size]}
            rounded-full flex items-center justify-center
            ${roleBadge.color} ring-1
          `}
        >
          <roleBadge.icon className="h-2.5 w-2.5" />
        </div>
      )}

      {/* Advocate indicator */}
      {contact.is_advocate && !roleBadge && (
        <div
          className={`
            absolute ${badgePositions[size]} ${badgeSizes[size]}
            rounded-full flex items-center justify-center
            bg-amber-100 text-amber-600 ring-1 ring-amber-200
          `}
        >
          <Crown className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}

interface ContactAvatarStackProps {
  contacts: Pick<OrgContact, 'id' | 'name' | 'avatar_url' | 'role' | 'is_primary' | 'is_advocate'>[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showRoleBadges?: boolean;
  className?: string;
  onContactClick?: (contactId: string) => void;
}

export function ContactAvatarStack({
  contacts,
  maxVisible = 4,
  size = 'md',
  showRoleBadges = true,
  className = '',
  onContactClick,
}: ContactAvatarStackProps) {
  // Sort contacts: primary first, then by role priority
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return ROLE_PRIORITY[b.role] - ROLE_PRIORITY[a.role];
  });

  const visibleContacts = sortedContacts.slice(0, maxVisible);
  const hiddenCount = contacts.length - maxVisible;

  const overlapClasses = {
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
  };

  const counterSizes = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  };

  if (contacts.length === 0) {
    return (
      <div className={`text-sm text-gray-400 italic ${className}`}>
        No contacts
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {visibleContacts.map((contact, index) => (
        <div
          key={contact.id}
          className={`
            ${index > 0 ? overlapClasses[size] : ''}
            transition-transform hover:z-10 hover:scale-110
            ${onContactClick ? 'cursor-pointer' : ''}
          `}
          style={{ zIndex: visibleContacts.length - index }}
          onClick={() => onContactClick?.(contact.id)}
        >
          <ContactAvatar
            contact={contact}
            size={size}
            showRoleBadge={showRoleBadges}
            showRing={index > 0}
          />
        </div>
      ))}

      {hiddenCount > 0 && (
        <div
          className={`
            ${overlapClasses[size]} ${counterSizes[size]}
            rounded-full bg-gray-100 text-gray-600 font-medium
            flex items-center justify-center ring-2 ring-white
          `}
        >
          +{hiddenCount}
        </div>
      )}
    </div>
  );
}

interface ContactAvatarWithInfoProps {
  contact: OrgContact;
  size?: 'sm' | 'md' | 'lg';
  showEmail?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function ContactAvatarWithInfo({
  contact,
  size = 'md',
  showEmail = true,
  showTitle = true,
  className = '',
}: ContactAvatarWithInfoProps) {
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ContactAvatar contact={contact} size={size} />
      <div className="min-w-0 flex-1">
        <div className={`font-medium text-gray-900 truncate ${textSizes[size]}`}>
          {contact.name}
          {contact.is_primary && (
            <span className="ml-1.5 text-xs text-emerald-600 font-normal">(Primary)</span>
          )}
        </div>
        {showTitle && contact.title && (
          <div className="text-xs text-gray-500 truncate">{contact.title}</div>
        )}
        {showEmail && contact.email && (
          <div className="text-xs text-gray-400 truncate">{contact.email}</div>
        )}
      </div>
    </div>
  );
}
