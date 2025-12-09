'use client';

/**
 * AddTimelineEventModal - Wrapper for QuickEntryForm
 * Provides standard modal interface for the command system
 */

import QuickEntryForm from '@/components/timeline/QuickEntryForm';

interface AddTimelineEventModalProps {
  orgId: string;
  orgName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValues?: {
    event_type?: string;
    event_category?: string;
    title?: string;
    description?: string;
  };
}

export default function AddTimelineEventModal({
  orgId,
  orgName = 'Organization',
  isOpen,
  onClose,
  onSuccess,
  defaultValues,
}: AddTimelineEventModalProps) {
  if (!isOpen) return null;

  // Map defaultValues to QuickEntryForm's prefillData format
  const prefillData = defaultValues ? {
    event_type: defaultValues.event_type,
    event_category: defaultValues.event_category,
    title: defaultValues.title,
    description: defaultValues.description,
  } : undefined;

  return (
    <QuickEntryForm
      orgId={orgId}
      orgName={orgName}
      onClose={onClose}
      onSuccess={onSuccess}
      prefillData={prefillData}
    />
  );
}
