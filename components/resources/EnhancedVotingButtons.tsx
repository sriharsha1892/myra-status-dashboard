'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThumbsUp, ThumbsDown, HelpCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface EnhancedVotingButtonsProps {
  discussionId: string;
  initialUpvotes: number;
  initialDownvotes?: number;
  initialHelpfulCount?: number;
  isSolved?: boolean;
  isQuestion?: boolean;
  isAnswer?: boolean;
  onVoteChange?: (newUpvoteCount: number) => void;
  onSolvedChange?: (solved: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
}

export default function EnhancedVotingButtons({
  discussionId,
  initialUpvotes,
  initialDownvotes = 0,
  initialHelpfulCount = 0,
  isSolved = false,
  isQuestion = false,
  isAnswer = false,
  onVoteChange,
  onSolvedChange,
  size = 'md',
  layout = 'horizontal',
}: EnhancedVotingButtonsProps) {
  const [upvoteCount, setUpvoteCount] = useState(initialUpvotes);
  const [downvoteCount, setDownvoteCount] = useState(initialDownvotes);
  const [helpfulCount, setHelpfulCount] = useState(initialHelpfulCount);
  const [solved, setSolved] = useState(isSolved);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [userMarkedHelpful, setUserMarkedHelpful] = useState(false);
  const [userCanMarkSolved, setUserCanMarkSolved] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUserReactions();
  }, [discussionId]);

  const fetchUserReactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's reactions
      const { data: reactions } = await supabase
        .from('resource_discussion_reactions')
        .select('reaction_type')
        .eq('discussion_id', discussionId)
        .eq('user_id', user.id);

      if (reactions) {
        reactions.forEach(reaction => {
          if (reaction.reaction_type === 'upvote' || reaction.reaction_type === 'downvote') {
            setUserVote(reaction.reaction_type as 'upvote' | 'downvote');
          } else if (reaction.reaction_type === 'helpful') {
            setUserMarkedHelpful(true);
          }
        });
      }

      // Check if user can mark as solved (question author looking at answers)
      if (isAnswer) {
        const { data: parentQuestion } = await supabase
          .from('resource_discussions')
          .select('author_id, parent_discussion_id')
          .eq('id', discussionId)
          .single();

        if (parentQuestion && parentQuestion.parent_discussion_id) {
          const { data: originalQuestion } = await supabase
            .from('resource_discussions')
            .select('author_id')
            .eq('id', parentQuestion.parent_discussion_id)
            .single();

          if (originalQuestion && originalQuestion.author_id === user.id) {
            setUserCanMarkSolved(true);
          }
        }
      }

      // Check if this answer is marked as solved
      if (isAnswer) {
        const { data: solvedReaction } = await supabase
          .from('resource_discussion_reactions')
          .select('id')
          .eq('discussion_id', discussionId)
          .eq('reaction_type', 'solved')
          .single();

        setSolved(!!solvedReaction);
      }
    } catch (error) {
      console.error('Error fetching user reactions:', error);
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

      // Call enhanced reaction function
      const { error } = await supabase.rpc('toggle_discussion_reaction_enhanced', {
        p_discussion_id: discussionId,
        p_reaction_type: voteType,
      });

      if (error) throw error;

      // Update local state
      if (userVote === voteType) {
        // Remove vote
        setUserVote(null);
        if (voteType === 'upvote') {
          setUpvoteCount(upvoteCount - 1);
        } else {
          setDownvoteCount(downvoteCount - 1);
        }
      } else {
        // Add/change vote
        if (userVote === 'upvote') {
          setUpvoteCount(upvoteCount - 1);
        } else if (userVote === 'downvote') {
          setDownvoteCount(downvoteCount - 1);
        }

        if (voteType === 'upvote') {
          setUpvoteCount(upvoteCount + 1);
        } else {
          setDownvoteCount(downvoteCount + 1);
        }
        setUserVote(voteType);
      }

      if (onVoteChange && voteType === 'upvote') {
        onVoteChange(upvoteCount);
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    } finally {
      setLoading(false);
    }
  };

  const handleHelpful = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to mark as helpful');
        return;
      }

      // Call enhanced reaction function
      const { error } = await supabase.rpc('toggle_discussion_reaction_enhanced', {
        p_discussion_id: discussionId,
        p_reaction_type: 'helpful',
      });

      if (error) throw error;

      // Update local state
      if (userMarkedHelpful) {
        setHelpfulCount(helpfulCount - 1);
        setUserMarkedHelpful(false);
        toast.success('Removed helpful mark');
      } else {
        setHelpfulCount(helpfulCount + 1);
        setUserMarkedHelpful(true);
        toast.success('Marked as helpful!');
      }
    } catch (error: any) {
      console.error('Error marking helpful:', error);
      toast.error('Failed to mark as helpful');
    } finally {
      setLoading(false);
    }
  };

  const handleSolved = async () => {
    if (loading || !userCanMarkSolved) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in');
        return;
      }

      // Call enhanced reaction function
      const { error } = await supabase.rpc('toggle_discussion_reaction_enhanced', {
        p_discussion_id: discussionId,
        p_reaction_type: 'solved',
      });

      if (error) throw error;

      // Update local state
      const newSolved = !solved;
      setSolved(newSolved);

      if (onSolvedChange) {
        onSolvedChange(newSolved);
      }

      toast.success(newSolved ? 'Marked as solution!' : 'Removed solution mark');
    } catch (error: any) {
      console.error('Error marking solved:', error);
      toast.error(error.message || 'Failed to mark as solved');
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

  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} items-center gap-3`}>
      {/* Upvote/Downvote */}
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

      {/* Helpful Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleHelpful();
          }}
          disabled={loading}
          className={`${buttonSizeClasses[size]} hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ${
            userMarkedHelpful ? 'bg-green-100' : ''
          }`}
          title="Mark as helpful"
        >
          <HelpCircle
            className={`${sizeClasses[size]} ${
              userMarkedHelpful
                ? 'text-green-600 fill-green-600'
                : 'text-gray-400 hover:text-green-600'
            } transition-colors`}
          />
        </button>
        {helpfulCount > 0 && (
          <span className={`${textSizeClasses[size]} font-bold text-gray-900`}>
            {helpfulCount}
          </span>
        )}
      </div>

      {/* Solved Button (for answers only) */}
      {isAnswer && userCanMarkSolved && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSolved();
          }}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            solved
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50`}
          title={solved ? 'Unmark as solution' : 'Mark as solution'}
        >
          <CheckCircle2 className={sizeClasses[size]} />
          <span className={textSizeClasses[size]}>
            {solved ? 'Solution' : 'Mark as Solution'}
          </span>
        </button>
      )}

      {/* Solved Indicator (for display only) */}
      {isAnswer && solved && !userCanMarkSolved && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
          <CheckCircle2 className={sizeClasses[size]} />
          <span className={`${textSizeClasses[size]} font-medium`}>Accepted Solution</span>
        </div>
      )}
    </div>
  );
}