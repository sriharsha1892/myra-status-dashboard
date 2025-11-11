'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AcceptAnswerButtonProps {
  answerId: string;
  questionId: string;
  questionAuthorId: string;
  isAccepted: boolean;
  onAcceptChange?: (isAccepted: boolean) => void;
}

export default function AcceptAnswerButton({
  answerId,
  questionId,
  questionAuthorId,
  isAccepted: initialIsAccepted,
  onAcceptChange,
}: AcceptAnswerButtonProps) {
  const [isAccepted, setIsAccepted] = useState(initialIsAccepted);
  const [loading, setLoading] = useState(false);
  const [canAccept, setCanAccept] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkUserPermission();
  }, [questionAuthorId]);

  const checkUserPermission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Only the question author can accept answers
      setCanAccept(user.id === questionAuthorId);
    } catch (error) {
      console.error('Error checking permission:', error);
    }
  };

  const handleAccept = async () => {
    if (loading || !canAccept) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to accept answers');
        return;
      }

      // Optimistic UI update
      const previousState = isAccepted;
      setIsAccepted(!isAccepted);

      // Call RPC function to mark answer as accepted/unaccepted
      const { error } = await supabase.rpc('mark_answer_accepted', {
        p_answer_id: answerId,
        p_question_id: questionId,
      });

      if (error) throw error;

      toast.success(
        !previousState
          ? '✅ Answer accepted! The asker will be notified.'
          : 'Answer unmarked as accepted'
      );

      // Notify parent component
      if (onAcceptChange) {
        onAcceptChange(!previousState);
      }
    } catch (error: any) {
      console.error('Error accepting answer:', error);
      toast.error(error.message || 'Failed to accept answer');

      // Revert optimistic update on error
      setIsAccepted(isAccepted);
    } finally {
      setLoading(false);
    }
  };

  // Don't render button if user can't accept
  if (!canAccept) {
    // Still show indicator if answer is accepted
    if (isAccepted) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-100 border border-emerald-300 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">ACCEPTED ANSWER</span>
        </div>
      );
    }
    return null;
  }

  return (
    <button
      onClick={handleAccept}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        isAccepted
          ? 'bg-emerald-100 border border-emerald-300 text-emerald-700 hover:bg-emerald-200'
          : 'bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'
      }`}
      title={
        isAccepted
          ? 'Click to unmark as accepted answer'
          : 'Click to mark as the accepted answer'
      }
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <CheckCircle
          className={`w-4 h-4 ${
            isAccepted ? 'fill-emerald-600 text-emerald-600' : ''
          }`}
        />
      )}
      <span className="text-xs font-bold">
        {isAccepted ? 'ACCEPTED ANSWER' : 'Accept Answer'}
      </span>
    </button>
  );
}
