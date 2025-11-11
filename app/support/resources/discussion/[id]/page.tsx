'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, MessageCircle, Pin, Loader2, Send, X
} from 'lucide-react';
import VotingButtons from '@/components/resources/VotingButtons';
import ReplyForm from '@/components/resources/ReplyForm';
import toast from 'react-hot-toast';

interface Discussion {
  id: string;
  title: string;
  content: string;
  tags: string[];
  author_id: string;
  author_name: string;
  author_email: string;
  is_pinned: boolean;
  created_at: string;
  upvote_count: number;
}

interface Reply {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_email: string;
  created_at: string;
  upvote_count: number;
}

export default function DiscussionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const discussionId = params.id as string;

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (discussionId) {
      fetchDiscussion();
      fetchReplies();
    }
  }, [discussionId]);

  const fetchDiscussion = async () => {
    try {
      const { data: discussionData, error } = await supabase
        .from('resource_discussions')
        .select('*')
        .eq('id', discussionId)
        .single();

      if (error) throw error;

      // Parse content
      let parsedContent: any = {};
      try {
        parsedContent = typeof discussionData.content === 'string'
          ? JSON.parse(discussionData.content)
          : discussionData.content;
      } catch (e) {
        parsedContent = { title: 'Untitled', content: discussionData.content, tags: [] };
      }

      // Get author info
      const { data: authorData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', discussionData.author_id)
        .single();

      // Get upvote count
      const { count: upvotes } = await supabase
        .from('resource_discussion_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('discussion_id', discussionId)
        .eq('reaction_type', 'upvote');

      setDiscussion({
        id: discussionData.id,
        title: parsedContent.title || 'Untitled Discussion',
        content: parsedContent.content || '',
        tags: parsedContent.tags || [],
        author_id: discussionData.author_id,
        author_name: authorData?.full_name || 'Unknown',
        author_email: authorData?.email || '',
        is_pinned: discussionData.is_pinned,
        created_at: discussionData.created_at,
        upvote_count: upvotes || 0,
      });
    } catch (error) {
      console.error('Error fetching discussion:', error);
      toast.error('Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const { data: repliesData, error } = await supabase
        .from('resource_discussions')
        .select('*')
        .eq('parent_discussion_id', discussionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author info and vote counts for each reply
      const repliesWithDetails = await Promise.all(
        (repliesData || []).map(async (reply: any) => {
          const { data: authorData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', reply.author_id)
            .single();

          const { count: upvotes } = await supabase
            .from('resource_discussion_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('discussion_id', reply.id)
            .eq('reaction_type', 'upvote');

          let parsedContent: any = {};
          try {
            parsedContent = typeof reply.content === 'string'
              ? JSON.parse(reply.content)
              : reply.content;
          } catch (e) {
            parsedContent = { content: reply.content };
          }

          return {
            id: reply.id,
            content: parsedContent.content || parsedContent.title || '',
            author_id: reply.author_id,
            author_name: authorData?.full_name || 'Unknown',
            author_email: authorData?.email || '',
            created_at: reply.created_at,
            upvote_count: upvotes || 0,
          };
        })
      );

      setReplies(repliesWithDetails);
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleReplySuccess = () => {
    setShowReplyForm(false);
    fetchReplies();
    toast.success('Reply posted successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="text-gray-600 font-medium">Loading discussion...</span>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-4">Discussion not found</p>
          <button
            onClick={() => router.push('/support/resources')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/support/resources')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Resources</span>
        </button>

        {/* Discussion Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6">
          <div className="p-8">
            {/* Pinned Badge */}
            {discussion.is_pinned && (
              <div className="flex items-center gap-1.5 mb-4 text-amber-600">
                <Pin className="w-5 h-5" />
                <span className="text-sm font-bold">PINNED BY ADMIN</span>
              </div>
            )}

            {/* Header */}
            <div className="flex gap-6 mb-6">
              {/* Vote Column */}
              <div className="flex-shrink-0">
                <VotingButtons
                  discussionId={discussion.id}
                  initialUpvotes={discussion.upvote_count}
                  size="lg"
                  layout="vertical"
                  onVoteChange={(newCount) => {
                    setDiscussion(prev => prev ? { ...prev, upvote_count: newCount } : null);
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {discussion.title}
                </h1>

                {/* Tags */}
                {discussion.tags && discussion.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {discussion.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-lg font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div
                  className="text-base text-gray-700 leading-relaxed mb-6 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: discussion.content }}
                />

                {/* Author & Meta */}
                <div className="flex items-center gap-3 text-sm text-gray-500 border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(discussion.author_name)}
                    </div>
                    <span className="font-medium text-gray-700">{discussion.author_name}</span>
                  </div>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reply Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-200 hover:scale-105 inline-flex items-center gap-2"
          >
            {showReplyForm ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
            {showReplyForm ? 'Cancel' : 'Add Reply'}
          </button>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 mb-6">
            <ReplyForm
              discussionId={discussion.id}
              onSuccess={handleReplySuccess}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}

        {/* Replies Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Replies ({replies.length})
          </h2>

          {replies.length === 0 ? (
            <div className="bg-white/70 rounded-2xl border border-gray-200 p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">No replies yet</p>
              <p className="text-gray-500">Be the first to share your thoughts!</p>
            </div>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 p-6"
              >
                <div className="flex gap-4">
                  {/* Vote Column */}
                  <div className="flex-shrink-0">
                    <VotingButtons
                      discussionId={reply.id}
                      initialUpvotes={reply.upvote_count}
                      size="md"
                      layout="vertical"
                      onVoteChange={(newCount) => {
                        setReplies(prev =>
                          prev.map(r =>
                            r.id === reply.id ? { ...r, upvote_count: newCount } : r
                          )
                        );
                      }}
                    />
                  </div>

                  {/* Reply Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-base text-gray-700 leading-relaxed mb-3 prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: reply.content }}
                    />

                    {/* Author & Meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xs">
                          {getInitials(reply.author_name)}
                        </div>
                        <span className="font-medium text-gray-700">{reply.author_name}</span>
                      </div>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
