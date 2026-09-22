'use client';

import React from 'react';

/** myRA 7-color avatar palette, chosen by first letter (A→violet, B→indigo, …, mod 7). */
const PALETTE = ['#A86DFF', '#818CF8', '#60A5FB', '#2DD4BF', '#34D399', '#FB923C', '#F472B6'];

function slotFor(name: string): number {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65) - 65;
  return ((code % 7) + 7) % 7;
}

interface AmAvatarProps {
  name: string;
  size?: number;
}

/** Rounded-square letter avatar for an account manager. Never a circle. */
export function AmAvatar({ name, size = 22 }: AmAvatarProps) {
  const label = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className="mr-avatar"
      title={name}
      style={{ width: size, height: size, background: PALETTE[slotFor(name)], fontSize: Math.round(size * 0.45) }}
    >
      {label}
    </span>
  );
}
