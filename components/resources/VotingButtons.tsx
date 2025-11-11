'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface VotingButtonsProps {
  discussionId: string;
  initialUpvotes: number;
  initialDownvotes?: number;
  onVoteChange?: (newUpvoteCount: number) => void;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
}

export default function VotingButtons({
  discussionId,
  initialUpvotes,
  initialDownvotes = 0,
  onVoteChange,
  size = 'md',
  layout = 'vertical',
}: VotingButtonsProps) {
  const [upvoteCount, setUpvoteCount] = useState(initialUpvotes);
  const [downvoteCount, setDownvoteCount] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUserVote();
  }, [discussionId]);

  const fetchUserVote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: reactions } = await supabase
        .from('resource_discussion_reactions')
        .select('reaction_type')
        .eq('discussion_id', discussionId)
        .eq('user_id', user.id)
        .in('reaction_type', ['upvote', 'downvote']);

      if (reactions && reactions.length > 0) {
        setUserVote(reactions[0].reaction_type as 'upvote' | 'downvote');
      }
    } catch (error) {
      console.error('Error fetching user vote:', error);
    }
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (loading) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to vote');
        return;
      }

      // Optimistic UI update
      const previousVote = userVote;
      const previousUpvoteCount = upvoteCount;
      const previousDownvoteCount = downvoteCount;

      // Calculate new counts
      let newUpvoteCount = upvoteCount;
      let newDownvoteCount = downvoteCount;

      // If clicking the same vote type, remove the vote
      if (userVote === voteType) {
        setUserVote(null);
        if (voteType === 'upvote') {
          newUpvoteCount = upvoteCount - 1;
          setUpvoteCount(newUpvoteCount);
        } else {
          newDownvoteCount = downvoteCount - 1;
          setDownvoteCount(newDownvoteCount);
        }
      } else {
        // If changing vote type, update both counts
        if (previousVote === 'upvote') {
          newUpvoteCount = upvoteCount - 1;
          setUpvoteCount(newUpvoteCount);
        } else if (previousVote === 'downvote') {
          newDownvoteCount = downvoteCount - 1;
          setDownvoteCount(newDownvoteCount);
        }

        if (voteType === 'upvote') {
          newUpvoteCount++;
          setUpvoteCount(newUpvoteCount);
        } else {
          newDownvoteCount++;
          setDownvoteCount(newDownvoteCount);
        }

        setUserVote(voteType);
      }

      // Call RPC function to toggle vote
      const { error } = await supabase.rpc('toggle_discussion_reaction', {
        p_discussion_id: discussionId,
        p_reaction_type: voteType,
      });

      if (error) throw error;

      // Notify parent component of vote change
      if (onVoteChange && voteType === 'upvote') {
        onVoteChange(newUpvoteCount);
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');

      // Revert optimistic update on error
      setUpvoteCount(upvoteCount);
      setDownvoteCount(downvoteCount);
      fetchUserVote();
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-3">
        {/* Upvote */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVote('upvote');
            }}
            disabled={loading}
            className={`${buttonSizeClasses[size]} hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ${
              userVote === 'upvote' ? 'bg-purple-100' : ''
            }`}
            title="Upvote"
          >
            <ThumbsUp
              className={`${sizeClasses[size]} ${
                userVote === 'upvote'
                  ? 'text-purple-600 fill-purple-600'
                  : 'text-gray-400 hover:text-purple-600'
              } transition-colors`}
            />
          </button>
          <span className={`${textSizeClasses[size]} font-bold text-gray-900`}>
            {upvoteCount}
          </span>
        </div>

        {/* Downvote (optional) */}
        {initialDownvotes !== undefined && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVote('downvote');
              }}
              disabled={loading}
              className={`${buttonSizeClasses[size]} hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ${
                userVote === 'downvote' ? 'bg-red-100' : ''
              }`}
              title="Downvote"
            >
              <ThumbsDown
                className={`${sizeClasses[size]} ${
                  userVote === 'downvote'
                    ? 'text-red-600 fill-red-600'
                    : 'text-gray-400 hover:text-red-600'
                } transition-colors`}
              />
            </button>
            <span className={`${textSizeClasses[size]} font-bold text-gray-900`}>
              {downvoteCount}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Vertical layout (default)
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Upvote */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleVote('upvote');
        }}
        disabled={loading}
        className={`${buttonSizeClasses[size]} hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ${
          userVote === 'upvote' ? 'bg-purple-100' : ''
        }`}
        title="Upvote"
      >
        <ThumbsUp
          className={`${sizeClasses[size]} ${
            userVote === 'upvote'
              ? 'text-purple-600 fill-purple-600'
              : 'text-gray-400 hover:text-purple-600'
          } transition-colors`}
        />
      </button>

      {/* Vote Count */}
      <span className={`${textSizeClasses[size === 'sm' ? 'sm' : size === 'md' ? 'base' : 'lg']} font-bold text-gray-900`}>
        {upvoteCount}
      </span>

      {/* Downvote (optional) */}
      {initialDownvotes !== undefined && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVote('downvote');
            }}
            disabled={loading}
            className={`${buttonSizeClasses[size]} hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ${
              userVote === 'downvote' ? 'bg-red-100' : ''
            }`}
            title="Downvote"
          >
            <ThumbsDown
              className={`${sizeClasses[size]} ${
                userVote === 'downvote'
                  ? 'text-red-600 fill-red-600'
                  : 'text-gray-400 hover:text-red-600'
              } transition-colors`}
            />
          </button>
          <span className={`${textSizeClasses[size]} font-bold text-gray-900`}>
            {downvoteCount}
          </span>
        </>
      )}
    </div>
  );
}
