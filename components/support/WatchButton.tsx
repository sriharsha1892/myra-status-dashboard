'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useWatchers } from '@/hooks/useWatchers';
import toast from 'react-hot-toast';

interface WatchButtonProps {
  ticketId: string;
}

export function WatchButton({ ticketId }: WatchButtonProps) {
  const { isWatching, watch, unwatch, watcherCount, loading } = useWatchers(ticketId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isWatching) {
        await unwatch();
        toast.success('You are no longer watching this ticket');
      } else {
        await watch();
        toast.success('You are now watching this ticket');
      }
    } catch (error) {
      toast.error('Failed to update watch status');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && watcherCount === 0) {
    return (
      <button
        disabled
        className="h-9 px-4 border border-gray-300 bg-gray-50 text-gray-400 text-sm font-medium rounded-lg flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        <span>Loading...</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isSubmitting}
      className={`h-9 px-4 border text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
        isWatching
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isWatching ? (
        <>
          <Eye className="w-4 h-4 fill-current" />
          <span>Watching</span>
        </>
      ) : (
        <>
          <EyeOff className="w-4 h-4" />
          <span>Watch</span>
        </>
      )}
      {watcherCount > 0 && (
        <span className="ml-1 text-xs opacity-75">
          ({watcherCount} {watcherCount === 1 ? 'person' : 'people'})
        </span>
      )}
    </button>
  );
}
