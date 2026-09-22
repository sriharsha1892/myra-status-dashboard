'use client';

import React from 'react';
import type { EffectiveStatus } from '@/lib/quote/types';
import { STATUS_LABEL } from '@/lib/quote/register';

const TONE: Record<EffectiveStatus, string> = {
  draft: 'mr-badge-neutral',
  sent: 'mr-badge-accent',
  accepted: 'mr-badge-success',
  declined: 'mr-badge-danger',
  expired: 'mr-badge-copper',
};

/** Read-only status badge. Status is changed elsewhere; the register only reports it. */
export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span className={`mr-badge ${TONE[status]}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}
