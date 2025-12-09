'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, MessageCircle, CheckCircle, Loader2, Send, X, Award, Trash2
} from 'lucide-react';
import VotingButtons from '@/components/resources/VotingButtons';
import AnswerForm from '@/components/resources/AnswerForm';
import AcceptAnswerButton from '@/components/resources/AcceptAnswerButton';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  question: string;
  details: string;
  tags: string[];
  author_id: string;
  author_name: string;
  author_email: string;
  created_at: string;
  upvote_count: number;
  has_accepted_answer: boolean;
}

interface Answer {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_email: string;
  created_at: string;
  upvote_count: number;
  is_accepted_answer: boolean;
}

export default function QuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchCurrentUser();
    if (questionId) {
      fetchQuestion();
      fetchAnswers();
    }
  }, [questionId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    // Check if user is admin or super admin
    if (user) {
      const role = user.user_metadata?.role?.toLowerCase();
      const isSuperAdmin = user.user_metadata?.is_super_admin === true;
      setIsAdmin(role === 'admin' || isSuperAdmin);
    }
  };

  const fetchQuestion = async () => {
    try {
      const { data: questionData, error } = await supabase
        .from('resource_discussions')
        .select('*')
        .eq('id', questionId)
        .eq('discussion_type', 'question')
        .single();

      if (error) throw error;

      // Parse content
      let parsedContent: any = {};
      try {
        parsedContent = typeof questionData.content === 'string'
          ? JSON.parse(questionData.content)
          : questionData.content;
      } catch (e) {
        parsedContent = { question: 'Untitled', details: questionData.content, tags: [] };
      }

      // Get author info
      const { data: authorData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', questionData.author_id)
        .single();

      // Get upvote count
      const { count: upvotes } = await supabase
        .from('resource_discussion_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('discussion_id', questionId)
        .eq('reaction_type', 'upvote');

      // Check if has accepted answer
      const { data: acceptedAnswers } = await supabase
        .from('resource_discussions')
        .select('id')
        .eq('parent_discussion_id', questionId)
        .eq('discussion_type', 'answer')
        .eq('is_accepted_answer', true)
        .limit(1);

      setQuestion({
        id: questionData.id,
        question: parsedContent.question || 'Untitled Question',
        details: parsedContent.details || parsedContent.content || '',
        tags: parsedContent.tags || [],
        author_id: questionData.author_id,
        author_name: authorData?.full_name || 'Unknown',
        author_email: authorData?.email || '',
        created_at: questionData.created_at,
        upvote_count: upvotes || 0,
        has_accepted_answer: (acceptedAnswers && acceptedAnswers.length > 0) || false,
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      toast.error('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const { data: answersData, error } = await supabase
        .from('resource_discussions')
        .select('*')
        .eq('parent_discussion_id', questionId)
        .eq('discussion_type', 'answer')
        .order('is_accepted_answer', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!answersData || answersData.length === 0) {
        setAnswers([]);
        return;
      }

      // Collect all unique author IDs and answer IDs for batch fetching
      const authorIds = [...new Set(answersData.map((a: any) => a.author_id).filter(Boolean))];
      const answerIds = answersData.map((a: any) => a.id);

      // Batch fetch all data in parallel (2 queries instead of N*2)
      const [authorsResult, reactionsResult] = await Promise.all([
        authorIds.length > 0
          ? supabase.from('users').select('id, full_name, email').in('id', authorIds)
          : Promise.resolve({ data: [] }),
        supabase.from('resource_discussion_reactions')
          .select('discussion_id')
          .in('discussion_id', answerIds)
          .eq('reaction_type', 'upvote')
      ]);

      // Create lookup maps for O(1) access
      const authorMap = new Map(
        (authorsResult.data || []).map((a: any) => [a.id, { full_name: a.full_name, email: a.email }])
      );

      // Count upvotes per answer
      const upvoteMap = new Map<string, number>();
      (reactionsResult.data || []).forEach((r: any) => {
        upvoteMap.set(r.discussion_id, (upvoteMap.get(r.discussion_id) || 0) + 1);
      });

      // Map answers with all the data (no more N+1!)
      const answersWithDetails = answersData.map((answer: any) => {
        let parsedContent: any = {};
        try {
          parsedContent = typeof answer.content === 'string'
            ? JSON.parse(answer.content)
            : answer.content;
        } catch (e) {
          parsedContent = { content: answer.content };
        }

        const author = authorMap.get(answer.author_id);

        return {
          id: answer.id,
          content: parsedContent.content || parsedContent.answer || '',
          author_id: answer.author_id,
          author_name: author?.full_name || 'Unknown',
          author_email: author?.email || '',
          created_at: answer.created_at,
          upvote_count: upvoteMap.get(answer.id) || 0,
          is_accepted_answer: answer.is_accepted_answer || false,
        };
      });

      setAnswers(answersWithDetails);
    } catch (error) {
      console.error('Error fetching answers:', error);
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

  const handleAnswerSuccess = () => {
    setShowAnswerForm(false);
    fetchAnswers();
    fetchQuestion();
    toast.success('Answer posted successfully!');
  };

  const handleAcceptAnswer = async (answerId: string) => {
    try {
      // Call the RPC function to accept answer
      const { error } = await supabase.rpc('mark_answer_accepted', {
        p_answer_id: answerId
      });

      if (error) throw error;

      // Refresh data
      fetchQuestion();
      fetchAnswers();
      toast.success('Answer marked as accepted!');
    } catch (error: any) {
      console.error('Error accepting answer:', error);
      toast.error(error.message || 'Failed to accept answer');
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionId) return;

    setDeleting(true);
    try {
      // Get auth headers
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error('You must be logged in to delete');
        return;
      }

      const response = await fetch(`/api/resources/discussions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete question');
      }

      toast.success('Question deleted successfully');
      router.push('/support/resources');
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast.error(error.message || 'Failed to delete question');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    setDeletingAnswerId(answerId);
    try {
      // Get auth headers
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error('You must be logged in to delete');
        return;
      }

      const response = await fetch(`/api/resources/discussions/${answerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete answer');
      }

      toast.success('Answer deleted successfully');
      // Refresh answers and question (in case accepted answer was deleted)
      fetchAnswers();
      fetchQuestion();
    } catch (error: any) {
      console.error('Error deleting answer:', error);
      toast.error(error.message || 'Failed to delete answer');
    } finally {
      setDeletingAnswerId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
          <span className="text-gray-600 font-medium">Loading question...</span>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-4">Question not found</p>
          <button
            onClick={() => router.push('/support/resources')}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  const isQuestionAuthor = currentUserId === question.author_id;

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

        {/* Question Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6">
          <div className="p-8">
            {/* Solved Badge */}
            {question.has_accepted_answer && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-xl mb-4 inline-flex">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">SOLVED</span>
              </div>
            )}

            {/* Header */}
            <div className="flex gap-6 mb-6">
              {/* Vote Column */}
              <div className="flex-shrink-0">
                <VotingButtons
                  discussionId={question.id}
                  initialUpvotes={question.upvote_count}
                  size="lg"
                  layout="vertical"
                  onVoteChange={(newCount) => {
                    setQuestion(prev => prev ? { ...prev, upvote_count: newCount } : null);
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 flex-1">
                    {question.question}
                  </h1>

                  {/* Delete Button (author or admin only) */}
                  {(isQuestionAuthor || isAdmin) && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Tags */}
                {question.tags && question.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {question.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-pink-50 text-pink-700 text-sm rounded-lg font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Details */}
                <div
                  className="text-base text-gray-700 leading-relaxed mb-6 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: question.details }}
                />

                {/* Author & Meta */}
                <div className="flex items-center gap-3 text-sm text-gray-500 border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(question.author_name)}
                    </div>
                    <span className="font-medium text-gray-700">{question.author_name}</span>
                  </div>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAnswerForm(!showAnswerForm)}
            className="px-6 py-3 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-pink-200 hover:scale-105 inline-flex items-center gap-2"
          >
            {showAnswerForm ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
            {showAnswerForm ? 'Cancel' : 'Post Answer'}
          </button>
        </div>

        {/* Answer Form */}
        {showAnswerForm && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 mb-6">
            <AnswerForm
              questionId={question.id}
              onSuccess={handleAnswerSuccess}
              onCancel={() => setShowAnswerForm(false)}
            />
          </div>
        )}

        {/* Answers Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Answers ({answers.length})
          </h2>

          {answers.length === 0 ? (
            <div className="bg-white/70 rounded-2xl border border-gray-200 p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">No answers yet</p>
              <p className="text-gray-500">Be the first to help out!</p>
            </div>
          ) : (
            answers.map((answer) => (
              <div
                key={answer.id}
                className={`bg-white/90 backdrop-blur-sm rounded-2xl border-2 transition-all duration-200 p-6 ${
                  answer.is_accepted_answer
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-gray-200 hover:border-pink-300 hover:shadow-lg'
                }`}
              >
                {/* Accepted Answer Badge */}
                {answer.is_accepted_answer && (
                  <div className="flex items-center gap-2 mb-4 text-emerald-700">
                    <Award className="w-5 h-5" />
                    <span className="text-sm font-bold">ACCEPTED ANSWER</span>
                  </div>
                )}

                <div className="flex gap-4">
                  {/* Vote Column */}
                  <div className="flex-shrink-0">
                    <VotingButtons
                      discussionId={answer.id}
                      initialUpvotes={answer.upvote_count}
                      size="md"
                      layout="vertical"
                      onVoteChange={(newCount) => {
                        setAnswers(prev =>
                          prev.map(a =>
                            a.id === answer.id ? { ...a, upvote_count: newCount } : a
                          )
                        );
                      }}
                    />
                  </div>

                  {/* Answer Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-base text-gray-700 leading-relaxed mb-4 prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: answer.content }}
                    />

                    {/* Actions & Meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs">
                            {getInitials(answer.author_name)}
                          </div>
                          <span className="font-medium text-gray-700">{answer.author_name}</span>
                        </div>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Accept Answer Button (only for question author and if no accepted answer yet) */}
                        {isQuestionAuthor && !question.has_accepted_answer && !answer.is_accepted_answer && (
                          <button
                            onClick={() => handleAcceptAnswer(answer.id)}
                            className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept Answer
                          </button>
                        )}

                        {/* Delete Answer Button (author or admin only) */}
                        {(currentUserId === answer.author_id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteAnswer(answer.id)}
                            disabled={deletingAnswerId === answer.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete answer"
                          >
                            {deletingAnswerId === answer.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Question</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this question? All answers and reactions will also be permanently deleted.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuestion}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
