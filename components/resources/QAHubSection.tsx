'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  HelpCircle, Plus, CheckCircle, TrendingUp, Clock,
  ThumbsUp, MessageCircle, Award, Lightbulb, Brain, Loader2
} from 'lucide-react';
import CreateQuestionModal from './CreateQuestionModal';
import VotingButtons from './VotingButtons';
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
  answer_count: number;
  upvote_count: number;
  has_accepted_answer: boolean;
}

export default function QAHubSection() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'recent' | 'most_voted' | 'unanswered'>('recent');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchQuestions();

    // Set up real-time subscription for new questions
    const channel = supabase
      .channel('qa_hub')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'resource_discussions',
        filter: 'discussion_type=eq.question'
      }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Fetch questions first
      const { data: questionsData, error } = await supabase
        .from('resource_discussions')
        .select(`
          id,
          content,
          author_id,
          created_at
        `)
        .eq('discussion_type', 'question')
        .is('parent_discussion_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      if (!questionsData || questionsData.length === 0) {
        setQuestions([]);
        return;
      }

      // Collect all unique author IDs and question IDs for batch fetching
      const authorIds = [...new Set(questionsData.map(q => q.author_id).filter(Boolean))];
      const questionIds = questionsData.map(q => q.id);

      // Batch fetch all data in parallel (3 queries instead of N*3)
      const [authorsResult, reactionsResult, answersResult] = await Promise.all([
        // Fetch all authors at once
        authorIds.length > 0
          ? supabase.from('users').select('id, full_name, email').in('id', authorIds)
          : Promise.resolve({ data: [] }),
        // Fetch all reactions at once
        supabase.from('resource_discussion_reactions')
          .select('discussion_id')
          .in('discussion_id', questionIds)
          .eq('reaction_type', 'upvote'),
        // Fetch all answers at once
        supabase.from('resource_discussions')
          .select('parent_discussion_id, is_accepted_answer')
          .in('parent_discussion_id', questionIds)
          .eq('discussion_type', 'answer')
      ]);

      // Create lookup maps for O(1) access
      const authorMap = new Map(
        (authorsResult.data || []).map((a: any) => [a.id, { full_name: a.full_name, email: a.email }])
      );

      // Count upvotes per question
      const upvoteMap = new Map<string, number>();
      (reactionsResult.data || []).forEach((r: any) => {
        upvoteMap.set(r.discussion_id, (upvoteMap.get(r.discussion_id) || 0) + 1);
      });

      // Count answers and check for accepted per question
      const answerCountMap = new Map<string, number>();
      const acceptedMap = new Map<string, boolean>();
      (answersResult.data || []).forEach((a: any) => {
        answerCountMap.set(a.parent_discussion_id, (answerCountMap.get(a.parent_discussion_id) || 0) + 1);
        if (a.is_accepted_answer) {
          acceptedMap.set(a.parent_discussion_id, true);
        }
      });

      // Map questions with all the data
      const questionsWithStats = questionsData.map((question: any) => {
        // Parse JSON content
        let parsedContent: any = {};
        try {
          parsedContent = typeof question.content === 'string'
            ? JSON.parse(question.content)
            : question.content;
        } catch (e) {
          parsedContent = { question: 'Untitled', details: question.content, tags: [] };
        }

        const author = authorMap.get(question.author_id);

        return {
          id: question.id,
          question: parsedContent.question || 'Untitled Question',
          details: parsedContent.details || parsedContent.content || '',
          tags: parsedContent.tags || [],
          author_id: question.author_id,
          author_name: author?.full_name || 'Unknown',
          author_email: author?.email || '',
          created_at: question.created_at,
          answer_count: answerCountMap.get(question.id) || 0,
          upvote_count: upvoteMap.get(question.id) || 0,
          has_accepted_answer: acceptedMap.get(question.id) || false,
        };
      });

      // Apply filter sorting
      let sortedQuestions = [...questionsWithStats];
      if (filter === 'most_voted') {
        sortedQuestions.sort((a, b) => b.upvote_count - a.upvote_count);
      } else if (filter === 'unanswered') {
        sortedQuestions = sortedQuestions.filter(q => q.answer_count === 0);
      }
      // 'recent' is already sorted by created_at DESC from query

      setQuestions(sortedQuestions);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions;

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
          <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
          <span className="text-gray-600 font-medium">Loading questions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <Brain className="w-6 h-6 text-pink-600" />
            Questions & Answers
          </h2>
          <p className="text-gray-600 mt-1">
            No such thing as a silly question (except maybe "Can we skip research?") 🤓
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2 shadow-lg shadow-pink-200 hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Ask Question
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setFilter('recent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
            filter === 'recent'
              ? 'bg-pink-50 text-pink-700 border-pink-200'
              : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1.5" />
          Recent
        </button>
        <button
          onClick={() => setFilter('most_voted')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
            filter === 'most_voted'
              ? 'bg-pink-50 text-pink-700 border-pink-200'
              : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1.5" />
          Most Voted
        </button>
        <button
          onClick={() => setFilter('unanswered')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
            filter === 'unanswered'
              ? 'bg-pink-50 text-pink-700 border-pink-200'
              : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
          }`}
        >
          <HelpCircle className="w-4 h-4 inline mr-1.5" />
          Unanswered
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.slice(0, displayLimit).map((question) => (
          <div
            key={question.id}
            onClick={() => router.push(`/support/resources/question/${question.id}`)}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 hover:border-pink-300 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
          >
            <div className="p-6">
              <div className="flex gap-4">
                {/* Vote Column */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <VotingButtons
                    discussionId={question.id}
                    initialUpvotes={question.upvote_count}
                    size="md"
                    layout="vertical"
                    onVoteChange={(newCount) => {
                      // Update local state to reflect new count
                      setQuestions(prev =>
                        prev.map(q =>
                          q.id === question.id
                            ? { ...q, upvote_count: newCount }
                            : q
                        )
                      );
                    }}
                  />
                  <div className="flex flex-col items-center gap-0.5 mt-2">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">{question.answer_count}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Question Title */}
                  <div className="flex items-start gap-3 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-pink-700 transition-colors flex-1">
                      {question.question}
                    </h3>
                    {question.has_accepted_answer && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-lg flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">SOLVED</span>
                      </div>
                    )}
                  </div>

                  {/* Excerpt */}
                  <div
                    className="text-sm text-gray-600 mb-3 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: question.details }}
                  />

                  {/* Tags */}
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {question.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-pink-50 text-pink-700 text-xs rounded-md font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs">
                        {getInitials(question.author_name)}
                      </div>
                      <span className="font-medium text-gray-700">{question.author_name}</span>
                    </div>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredQuestions.length === 0 && !loading && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-12 text-center">
            <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-4xl mb-3">💡</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No questions yet!
            </h3>
            <p className="text-gray-600 mb-6">
              Someone's gotta be the brave soul who asks first. Be a hero!
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ask the First Question
            </button>
          </div>
        )}

        {/* Load More */}
        {filteredQuestions.length > displayLimit && (
          <div className="text-center pt-4">
            <button
              onClick={() => setDisplayLimit(prev => prev + 20)}
              className="px-6 py-2.5 bg-white border-2 border-pink-200 text-pink-700 rounded-xl text-sm font-medium hover:bg-pink-50 transition-colors"
            >
              Show more questions
            </button>
            <p className="text-xs text-gray-500 mt-2">
              🧠 Knowledge is power (and sometimes a competitive advantage!)
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl border border-pink-200 p-4 text-center">
          <Award className="w-8 h-8 text-pink-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-pink-900">127</p>
          <p className="text-xs text-pink-700 font-medium">Questions Solved</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-4 text-center">
          <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-900">89%</p>
          <p className="text-xs text-purple-700 font-medium">Answer Rate</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-4 text-center">
          <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-900">{'< 2h'}</p>
          <p className="text-xs text-blue-700 font-medium">Avg Response Time</p>
        </div>
      </div>

      {/* Fun Tip Box */}
      <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-2xl border border-pink-200 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎯</div>
          <div>
            <h4 className="font-semibold text-pink-900 mb-1">Q&A Pro Tip</h4>
            <p className="text-sm text-pink-700">
              The only bad question is the one you didn't ask. Well, that and "Can we just use Wikipedia as a data source?"
            </p>
          </div>
        </div>
      </div>

      {/* Create Question Modal */}
      <CreateQuestionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchQuestions}
      />
    </div>
  );
}
