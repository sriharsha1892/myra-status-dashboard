'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {  MessageSquare, Plus, TrendingUp, Clock, Users,
  ThumbsUp, MessageCircle, Pin, Coffee, Sparkles, Loader2
} from 'lucide-react';
import CreateDiscussionModal from './CreateDiscussionModal';
import VotingButtons from './VotingButtons';
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
  reply_count: number;
}

export default function CommunityFeedSection() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'trending' | 'recent' | 'following'>('trending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchDiscussions();

    // Set up real-time subscription for new discussions
    const channel = supabase
      .channel('community_discussions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'resource_discussions',
        filter: 'discussion_type=eq.comment'
      }, () => {
        fetchDiscussions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      // Fetch discussions with author info and stats
      const { data: discussionsData, error } = await supabase
        .from('resource_discussions')
        .select(`
          id,
          content,
          author_id,
          is_pinned,
          created_at
        `)
        .eq('discussion_type', 'comment')
        .is('parent_discussion_id', null)
        .order(filter === 'recent' ? 'created_at' : 'created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Parse content and fetch stats for each discussion
      const discussionsWithStats = await Promise.all(
        (discussionsData || []).map(async (discussion: any) => {
          // Parse JSON content
          let parsedContent: any = {};
          try {
            parsedContent = typeof discussion.content === 'string'
              ? JSON.parse(discussion.content)
              : discussion.content;
          } catch (e) {
            parsedContent = { title: 'Untitled', content: discussion.content, tags: [] };
          }

          // Get author info
          const { data: authorData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', discussion.author_id)
            .single();

          // Get vote count
          const { count: upvotes } = await supabase
            .from('resource_discussion_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('discussion_id', discussion.id)
            .eq('reaction_type', 'upvote');

          // Get reply count
          const { count: replies } = await supabase
            .from('resource_discussions')
            .select('*', { count: 'exact', head: true })
            .eq('parent_discussion_id', discussion.id);

          return {
            id: discussion.id,
            title: parsedContent.title || 'Untitled Discussion',
            content: parsedContent.content || parsedContent.details || '',
            tags: parsedContent.tags || [],
            author_id: discussion.author_id,
            author_name: authorData?.full_name || 'Unknown',
            author_email: authorData?.email || '',
            is_pinned: discussion.is_pinned,
            created_at: discussion.created_at,
            upvote_count: upvotes || 0,
            reply_count: replies || 0,
          };
        })
      );

      // Sort by trending (upvotes) if that's the filter
      if (filter === 'trending') {
        discussionsWithStats.sort((a, b) => b.upvote_count - a.upvote_count);
      }

      // Move pinned to top
      discussionsWithStats.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });

      setDiscussions(discussionsWithStats);
    } catch (error: any) {
      console.error('Error fetching discussions:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const filteredDiscussions = discussions;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="text-gray-600 font-medium">Loading discussions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Team Discussions
          </h2>
          <p className="text-gray-600 mt-1">
            Where great ideas meet better coffee ☕
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2 shadow-lg shadow-purple-200 hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Start Discussion
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setFilter('trending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
            filter === 'trending'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1.5" />
          Trending
        </button>
        <button
          onClick={() => setFilter('recent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
            filter === 'recent'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1.5" />
          Recent
        </button>
      </div>

      {/* Discussion Feed */}
      <div className="space-y-4">
        {filteredDiscussions.map((discussion) => (
          <div
            key={discussion.id}
            onClick={() => router.push(`/support/resources/discussion/${discussion.id}`)}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
          >
            <div className="p-6">
              {/* Pinned Badge */}
              {discussion.is_pinned && (
                <div className="flex items-center gap-1.5 mb-3 text-amber-600">
                  <Pin className="w-4 h-4" />
                  <span className="text-xs font-bold">PINNED BY ADMIN</span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getInitials(discussion.author_name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                        {discussion.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-700 font-medium">{discussion.author_name}</span>
                        <span className="text-xs text-gray-500">
                          • {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="text-sm text-gray-600 mb-3 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: discussion.content }}
                  />

                  {/* Tags */}
                  {discussion.tags && discussion.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {discussion.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex items-center gap-4">
                    <VotingButtons
                      discussionId={discussion.id}
                      initialUpvotes={discussion.upvote_count}
                      size="sm"
                      layout="horizontal"
                      onVoteChange={(newCount) => {
                        // Update local state to reflect new count
                        setDiscussions(prev =>
                          prev.map(d =>
                            d.id === discussion.id
                              ? { ...d, upvote_count: newCount }
                              : d
                          )
                        );
                      }}
                    />
                    <div className="flex items-center gap-1.5 text-gray-600 hover:text-purple-600 transition-colors cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{discussion.reply_count} replies</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredDiscussions.length === 0 && !loading && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-12 text-center">
            <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-4xl mb-3">☕</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Quiet in here...
            </h3>
            <p className="text-gray-600 mb-6">
              Like a Monday morning before the coffee kicks in. Start a discussion!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Break the Ice
            </button>
          </div>
        )}
      </div>

      {/* Fun Tip Box */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">Pro Tip</h4>
            <p className="text-sm text-purple-700">
              Use @mentions to get someone's attention faster than a "Can we hop on a quick call?" Slack message!
            </p>
          </div>
        </div>
      </div>

      {/* Create Discussion Modal */}
      <CreateDiscussionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchDiscussions}
      />
    </div>
  );
}
