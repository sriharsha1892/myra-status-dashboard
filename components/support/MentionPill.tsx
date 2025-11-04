'use client';

import { useState, useRef, useEffect } from 'react';

interface MentionPillProps {
  username: string;
  userId?: string;
  onProfileClick?: (userId: string) => void;
}

export function MentionPill({ username, userId, onProfileClick }: MentionPillProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [userDetails, setUserDetails] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Fetch user details on hover
  useEffect(() => {
    if (showTooltip && userId && !userDetails) {
      fetchUserDetails();
    }
  }, [showTooltip, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;

    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll use the username as the display name
      setUserDetails({
        name: username,
        email: `${username}@example.com`,
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (userId && onProfileClick) {
      onProfileClick(userId);
    }
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <span
        ref={pillRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center px-1.5 py-0.5 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-colors"
      >
        @{username}
      </span>

      {/* Tooltip */}
      {showTooltip && userDetails && (
        <div
          ref={tooltipRef}
          className="fixed z-[100] bg-gray-900 text-white text-xs rounded-md py-2 px-3 shadow-lg pointer-events-none"
          style={{
            top: pillRef.current
              ? `${pillRef.current.getBoundingClientRect().bottom + 8}px`
              : '0px',
            left: pillRef.current
              ? `${pillRef.current.getBoundingClientRect().left}px`
              : '0px',
          }}
        >
          <div className="font-medium">{userDetails.name}</div>
          <div className="text-gray-300 text-xs">{userDetails.email}</div>
          <div className="text-gray-400 text-xs mt-1">Click to view profile</div>
          {/* Tooltip arrow */}
          <div
            className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
            style={{
              top: '-4px',
              left: '12px',
            }}
          />
        </div>
      )}
    </>
  );
}
