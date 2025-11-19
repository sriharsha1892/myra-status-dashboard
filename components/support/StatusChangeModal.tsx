'use client';

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  newStatus: string;
  onConfirm: (comment?: string) => void;
}

// Status values must match database CHECK constraint: ('open', 'in_progress', 'resolved', 'closed')
const STATUS_PROMPTS: Record<string, { title: string; placeholder: string; optional: boolean }> = {
  resolved: {
    title: 'Add resolution note?',
    placeholder: 'Describe how this issue was resolved...',
    optional: true,
  },
  closed: {
    title: 'Add closing note?',
    placeholder: 'Add any final notes before closing...',
    optional: true,
  },
  in_progress: {
    title: 'Add a note about progress?',
    placeholder: 'Describe what you\'re working on...',
    optional: true,
  },
};

export function StatusChangeModal({
  isOpen,
  onClose,
  currentStatus,
  newStatus,
  onConfirm,
}: StatusChangeModalProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const prompt = STATUS_PROMPTS[newStatus];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(comment.trim() || undefined);
      setComment('');
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onConfirm(undefined);
    setComment('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change status to ${newStatus}`}
      size="md"
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Changing status from <span className="font-medium">{currentStatus}</span> to{' '}
          <span className="font-medium">{newStatus}</span>
        </div>

        {prompt && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {prompt.title}
                {prompt.optional && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    (Optional)
                  </span>
                )}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={prompt.placeholder}
                rows={4}
                fullWidth
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will be added as a comment on the ticket
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={handleSkip}
                disabled={loading}
              >
                Skip
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirm}
                loading={loading}
                disabled={loading}
              >
                Update Status
              </Button>
            </div>
          </>
        )}

        {!prompt && (
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="md" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              loading={loading}
              disabled={loading}
            >
              Confirm
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
