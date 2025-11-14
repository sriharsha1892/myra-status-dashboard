'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MessageCircle,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  ChevronDown,
  ChevronUp,
  AtSign,
  Paperclip,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: string;
  roadmap_item_id: string;
  parent_comment_id: string | null;
  author_id: string;
  content: string;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  mentions: string[];
  reactions: Record<string, number>;
  created_at: string;
  author?: {
    id: string;
    full_name: string;
    email: string;
  };
  replies?: Comment[];
  userReaction?: string | null;
}

interface RoadmapCommentsProps {
  roadmapItemId: string;
  roadmapTitle: string;
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}

const REACTION_EMOJIS = ['👍', '👎', '❤️', '🎉', '🤔', '👀', '🚀', '💡'];

export default function RoadmapComments({
  roadmapItemId,
  roadmapTitle,
  isOpen = false,
  onClose,
  embedded = false
}: RoadmapCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen || embedded) {
      fetchComments();
      fetchCurrentUser();
      markCommentsAsRead();
      subscribeToComments();
    }
  }, [roadmapItemId, isOpen, embedded]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', user.id)
        .single();

      setCurrentUser(userData);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      // Fetch comments with author info
      const { data: commentsData, error } = await supabase
        .from('roadmap_comments')
        .select(`
          *,
          author:users!roadmap_comments_author_id_fkey(id, full_name, email)
        `)
        .eq('roadmap_item_id', roadmapItemId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user reactions
      if (currentUser && commentsData) {
        const commentIds = commentsData.map(c => c.id);
        const { data: userReactions } = await supabase
          .from('roadmap_comment_reactions')
          .select('comment_id, reaction_type')
          .in('comment_id', commentIds)
          .eq('user_id', currentUser.id);

        // Map user reactions to comments
        const reactionsMap = userReactions?.reduce((acc, r) => {
          acc[r.comment_id] = r.reaction_type;
          return acc;
        }, {} as Record<string, string>) || {};

        // Organize comments into tree structure
        const commentMap = new Map<string, Comment>();
        const rootComments: Comment[] = [];

        commentsData.forEach(comment => {
          const enrichedComment = {
            ...comment,
            userReaction: reactionsMap[comment.id] || null,
            replies: []
          };
          commentMap.set(comment.id, enrichedComment);
        });

        commentMap.forEach(comment => {
          if (comment.parent_comment_id) {
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
              parent.replies!.push(comment);
            }
          } else {
            rootComments.push(comment);
          }
        });

        setComments(rootComments);
      } else if (commentsData) {
        // Organize without reactions
        const commentMap = new Map<string, Comment>();
        const rootComments: Comment[] = [];

        commentsData.forEach(comment => {
          const enrichedComment = {
            ...comment,
            replies: []
          };
          commentMap.set(comment.id, enrichedComment);
        });

        commentMap.forEach(comment => {
          if (comment.parent_comment_id) {
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
              parent.replies!.push(comment);
            }
          } else {
            rootComments.push(comment);
          }
        });

        setComments(rootComments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const markCommentsAsRead = async () => {
    try {
      await supabase.rpc('mark_roadmap_comments_read', {
        p_roadmap_item_id: roadmapItemId
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking comments as read:', error);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`roadmap-comments-${roadmapItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roadmap_comments',
          filter: `roadmap_item_id=eq.${roadmapItemId}`
        },
        () => {
          fetchComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roadmap_comment_reactions'
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitComment = async (parentId: string | null = null) => {
    const content = parentId ? editContent : newComment;
    if (!content.trim() || !currentUser) return;

    setSending(true);
    try {
      // Extract mentions from content (@username patterns)
      const mentionMatches = content.match(/@\w+/g) || [];
      const mentions: string[] = []; // Would need to resolve usernames to IDs

      const { data, error } = await supabase.rpc('post_roadmap_comment', {
        p_roadmap_item_id: roadmapItemId,
        p_content: content,
        p_parent_comment_id: parentId,
        p_mentions: mentions
      });

      if (error) throw error;

      if (parentId) {
        setReplyingTo(null);
        setEditContent('');
      } else {
        setNewComment('');
      }

      toast.success('Comment posted!');
      scrollToBottom();
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error(error.message || 'Failed to post comment');
    } finally {
      setSending(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('roadmap_comments')
        .update({
          content: editContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated');
      fetchComments();
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('Failed to update comment');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('roadmap_comments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleReaction = async (commentId: string, reactionType: string) => {
    if (!currentUser) {
      toast.error('Please sign in to react');
      return;
    }

    try {
      const { error } = await supabase.rpc('toggle_comment_reaction', {
        p_comment_id: commentId,
        p_reaction_type: reactionType
      });

      if (error) throw error;

      fetchComments();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to update reaction');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isAuthor = currentUser?.id === comment.author_id;
    const isEditing = editingComment === comment.id;
    const isReplying = replyingTo === comment.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const showReplies = showAllReplies[comment.id] || depth === 0;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`${depth > 0 ? 'ml-12 border-l-2 border-gray-100 pl-4' : ''}`}
      >
        <div className="group py-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {comment.author?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">
                  {comment.author?.full_name || 'Unknown User'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_edited && (
                  <span className="text-xs text-gray-400 italic">(edited)</span>
                )}
              </div>

              {/* Content */}
              {isEditing ? (
                <div className="mt-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      disabled={sending || !editContent.trim()}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditContent('');
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              )}

              {/* Reactions */}
              {!isEditing && comment.reactions && Object.keys(comment.reactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(comment.reactions).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(comment.id, emoji)}
                      className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                        comment.userReaction === emoji
                          ? 'bg-purple-100 text-purple-700 border border-purple-300'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-medium">{count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              {!isEditing && (
                <div className="flex items-center gap-1 mt-2">
                  {/* Reaction picker */}
                  <div className="relative group/reactions">
                    <button className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50 text-xs">
                      React
                    </button>
                    <div className="absolute bottom-full left-0 mb-1 hidden group-hover/reactions:flex gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                      {REACTION_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(comment.id, emoji)}
                          className="hover:scale-125 transition-transform p-1"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reply */}
                  <button
                    onClick={() => {
                      setReplyingTo(comment.id);
                      setEditContent('');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50 text-xs flex items-center gap-1"
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>

                  {/* Edit/Delete for author */}
                  {isAuthor && (
                    <>
                      <button
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50 text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Reply input */}
              {isReplying && (
                <div className="mt-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder={`Reply to ${comment.author?.full_name}...`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSubmitComment(comment.id)}
                      disabled={sending || !editContent.trim()}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setEditContent('');
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Show/Hide replies toggle */}
              {hasReplies && depth === 0 && (
                <button
                  onClick={() => setShowAllReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showReplies ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          </div>

          {/* Render replies */}
          {hasReplies && (showReplies || depth > 0) && (
            <div className="mt-2">
              {comment.replies!.map(reply => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const content = (
    <div className={`${embedded ? '' : 'flex flex-col h-full'}`}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Comments</h3>
            <p className="text-sm text-gray-500 mt-0.5">{roadmapTitle}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Comments list */}
      <div className={`flex-1 overflow-y-auto ${embedded ? 'max-h-96' : ''} p-4`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to start the discussion!</p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map(comment => renderComment(comment))}
          </AnimatePresence>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-xs text-gray-500 italic">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.shiftKey === false) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Add a comment... (Press Enter to send, Shift+Enter for new line)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={2}
          />
          <button
            onClick={() => handleSubmitComment()}
            disabled={sending || !newComment.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  // Modal view
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}