'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThumbsUp, MessageCircle, Users } from 'lucide-react';
import VoteCommentModal from './VoteCommentModal';
import toast from 'react-hot-toast';

interface FeatureRequestVotingProps {
  featureRequestId: string;
  initialVotes: number;
  title: string;
  onVoteChange?: (newVoteCount: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showVoters?: boolean;
}

interface Voter {
  user_id: string;
  comment: string | null;
  created_at: string;
}

export default function FeatureRequestVoting({
  featureRequestId,
  initialVotes,
  title,
  onVoteChange,
  size = 'md',
  showVoters = false
}: FeatureRequestVotingProps) {
  const [voteCount, setVoteCount] = useState(initialVotes);
  const [userVoted, setUserVoted] = useState(false);
  const [userComment, setUserComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showVotersList, setShowVotersList] = useState(false);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [pendingVoteAction, setPendingVoteAction] = useState<'vote' | 'unvote' | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchVoteStatus();
    if (showVoters) {
      fetchVoters();
    }
  }, [featureRequestId]);

  const fetchVoteStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has voted
      const { data: vote } = await supabase
        .from('feature_request_votes')
        .select(`
          id,
          feature_request_vote_comments (
            comment
          )
        `)
        .eq('feature_request_id', featureRequestId)
        .eq('user_id', user.id)
        .single();

      if (vote) {
        setUserVoted(true);
        setUserComment(vote.feature_request_vote_comments?.[0]?.comment || null);
      }
    } catch (error) {
      console.error('Error fetching vote status:', error);
    }
  };

  const fetchVoters = async () => {
    try {
      const { data } = await supabase
        .from('feature_request_votes')
        .select(`
          user_id,
          created_at,
          feature_request_vote_comments (
            comment
          )
        `)
        .eq('feature_request_id', featureRequestId)
        .order('created_at', { ascending: false });

      if (data) {
        setVoters(data.map(v => ({
          user_id: v.user_id,
          comment: v.feature_request_vote_comments?.[0]?.comment || null,
          created_at: v.created_at
        })));
      }
    } catch (error) {
      console.error('Error fetching voters:', error);
    }
  };

  const handleVoteClick = () => {
    const action = userVoted ? 'unvote' : 'vote';
    setPendingVoteAction(action);
    setShowCommentModal(true);
  };

  const handleVoteWithComment = async (comment: string) => {
    setShowCommentModal(false);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to vote');
        return;
      }

      // Call the toggle vote RPC function
      const { data, error } = await supabase.rpc('toggle_feature_vote', {
        p_feature_id: featureRequestId,
        p_comment: comment || null
      });

      if (error) throw error;

      // Update local state based on response
      const newVoteCount = data.vote_count;
      const wasAdded = data.action === 'added';

      setVoteCount(newVoteCount);
      setUserVoted(wasAdded);
      setUserComment(wasAdded ? comment : null);

      // Notify parent component
      if (onVoteChange) {
        onVoteChange(newVoteCount);
      }

      // Refresh voters list if shown
      if (showVoters) {
        fetchVoters();
      }

      // Show success message
      toast.success(wasAdded ? 'Vote added!' : 'Vote removed');

      // Set up real-time subscription for vote updates
      const channel = supabase
        .channel(`feature-votes-${featureRequestId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feature_request_votes',
            filter: `feature_request_id=eq.${featureRequestId}`
          },
          () => {
            // Refresh vote count when changes occur
            fetchVoteCount();
            if (showVoters) {
              fetchVoters();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    } finally {
      setLoading(false);
      setPendingVoteAction(null);
    }
  };

  const fetchVoteCount = async () => {
    try {
      const { data } = await supabase
        .from('feature_requests')
        .select('votes')
        .eq('id', featureRequestId)
        .single();

      if (data) {
        setVoteCount(data.votes);
      }
    } catch (error) {
      console.error('Error fetching vote count:', error);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Vote Button */}
        <button
          onClick={handleVoteClick}
          disabled={loading}
          className={`
            ${sizeClasses[size]}
            flex items-center gap-2 rounded-lg font-medium transition-all
            ${userVoted
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <ThumbsUp
            className={`
              ${iconSizeClasses[size]}
              ${userVoted ? 'fill-current' : ''}
            `}
          />
          <span>{voteCount}</span>
          {userVoted && <span className="text-xs">(Voted)</span>}
        </button>

        {/* Show Comments Button */}
        {voters.some(v => v.comment) && (
          <button
            onClick={() => setShowVotersList(!showVotersList)}
            className={`
              ${sizeClasses[size]}
              flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors
            `}
            title="View vote comments"
          >
            <MessageCircle className={iconSizeClasses[size]} />
            <span className="text-xs">
              {voters.filter(v => v.comment).length}
            </span>
          </button>
        )}

        {/* Voters Count */}
        {showVoters && voters.length > 0 && (
          <button
            onClick={() => setShowVotersList(!showVotersList)}
            className={`
              ${sizeClasses[size]}
              flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors
            `}
            title="View all voters"
          >
            <Users className={iconSizeClasses[size]} />
            <span className="text-xs">{voters.length}</span>
          </button>
        )}
      </div>

      {/* Voters List Dropdown */}
      {showVotersList && voters.length > 0 && (
        <div className="absolute z-10 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-900">Voters ({voters.length})</h4>
            <button
              onClick={() => setShowVotersList(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {voters.map((voter, index) => (
              <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                <div className="text-sm text-gray-600">
                  User {voter.user_id.slice(0, 8)}...
                </div>
                {voter.comment && (
                  <div className="mt-1 text-sm text-gray-500 italic">
                    "{voter.comment}"
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(voter.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vote Comment Modal */}
      <VoteCommentModal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setPendingVoteAction(null);
        }}
        onConfirm={handleVoteWithComment}
        title={title}
        isVoting={loading}
        existingComment={userComment || ''}
        voteAction={pendingVoteAction === 'vote' ? 'vote' : 'unvote'}
      />
    </>
  );
}