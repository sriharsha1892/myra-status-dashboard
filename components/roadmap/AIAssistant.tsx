'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Brain, Tag, AlertTriangle, FileText,
  Link, CheckCircle, X, ChevronDown, Lightbulb, Zap
} from 'lucide-react';
import {
  suggestTags,
  detectPriority,
  generateSummary,
  findSimilarItems,
  suggestDependencies,
  recommendNextStatus
} from '@/lib/ai/roadmap-ai';
import toast from 'react-hot-toast';

interface RoadmapItem {
  id?: string;
  title: string;
  description: string | null;
  priority?: string;
  status?: string;
  progress_percentage?: number;
}

interface AIAssistantProps {
  item: RoadmapItem;
  allItems?: RoadmapItem[];
  onApplySuggestion?: (type: string, value: any) => void;
  compact?: boolean;
}

export default function AIAssistant({
  item,
  allItems = [],
  onApplySuggestion,
  compact = false
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    tags?: { tags: string[]; confidence: number };
    priority?: { priority: string; reasoning: string; confidence: number };
    summary?: { summary: string; keyPoints: string[]; estimatedEffort: string };
    similar?: Array<{ item: RoadmapItem; similarity: number }>;
    dependencies?: Array<{ item: RoadmapItem; reason: string }>;
    nextStatus?: { status: string; reasoning: string };
  }>({});

  const analyzedItem = async () => {
    setLoading(true);
    try {
      const [tags, priority, summary, similar, dependencies] = await Promise.all([
        suggestTags(item),
        detectPriority(item),
        generateSummary(item),
        findSimilarItems(item, allItems),
        suggestDependencies(item, allItems)
      ]);

      const nextStatus = recommendNextStatus(
        item.status || 'planned',
        item.progress_percentage || 0
      );

      setSuggestions({
        tags,
        priority,
        summary,
        similar: similar.length > 0 ? similar : undefined,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
        nextStatus: nextStatus.status !== item.status ? nextStatus : undefined
      });
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast.error('AI analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && Object.keys(suggestions).length === 0) {
      analyzedItem();
    }
  }, [isOpen]);

  if (compact) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 transition-all duration-200 group"
        title="AI Assistant"
      >
        <Brain className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="relative">
      {/* AI Assistant Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Brain className="w-4 h-4" />
        AI Assistant
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* AI Suggestions Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-96 bg-white rounded-xl shadow-2xl border border-purple-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">AI Suggestions</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Analyzing roadmap item...</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Tag Suggestions */}
                  {suggestions.tags && suggestions.tags.tags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">Suggested Tags</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round((suggestions.tags.confidence || 0) * 100)}% confidence
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.tags.tags.map((tag, index) => (
                          <button
                            key={index}
                            onClick={() => onApplySuggestion?.('tag', tag)}
                            className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs hover:bg-purple-100 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority Suggestion */}
                  {suggestions.priority && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium">Suggested Priority</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round((suggestions.priority.confidence || 0) * 100)}% confidence
                        </span>
                      </div>
                      <button
                        onClick={() => onApplySuggestion?.('priority', suggestions.priority?.priority)}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          suggestions.priority.priority === 'critical'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : suggestions.priority.priority === 'high'
                            ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                            : suggestions.priority.priority === 'medium'
                            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {suggestions.priority.priority?.toUpperCase()}
                      </button>
                      <p className="text-xs text-gray-600 italic">{suggestions.priority.reasoning}</p>
                    </div>
                  )}

                  {/* Summary */}
                  {suggestions.summary && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">AI Summary</span>
                      </div>
                      <p className="text-sm text-gray-700">{suggestions.summary.summary}</p>
                      {suggestions.summary.keyPoints.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-600">Key Points:</p>
                          {suggestions.summary.keyPoints.map((point, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5" />
                              <p className="text-xs text-gray-600">{point}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-purple-500" />
                        <span className="text-xs text-gray-600">
                          Estimated effort: <span className="font-medium">{suggestions.summary.estimatedEffort}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Similar Items */}
                  {suggestions.similar && suggestions.similar.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Similar Items</span>
                      </div>
                      <div className="space-y-2">
                        {suggestions.similar.map((similar, index) => (
                          <div key={index} className="p-2 bg-green-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-green-800 truncate">
                                {similar.item.title}
                              </p>
                              <span className="text-xs text-green-600">
                                {Math.round(similar.similarity * 100)}% match
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dependencies */}
                  {suggestions.dependencies && suggestions.dependencies.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium">Suggested Dependencies</span>
                      </div>
                      <div className="space-y-2">
                        {suggestions.dependencies.map((dep, index) => (
                          <div key={index} className="p-2 bg-indigo-50 rounded-lg">
                            <p className="text-xs font-medium text-indigo-800">{dep.item.title}</p>
                            <p className="text-xs text-indigo-600 mt-1">{dep.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Recommendation */}
                  {suggestions.nextStatus && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-medium">Recommended Status</span>
                      </div>
                      <button
                        onClick={() => onApplySuggestion?.('status', suggestions.nextStatus?.status)}
                        className="w-full px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors"
                      >
                        Move to: {suggestions.nextStatus.status?.toUpperCase()}
                      </button>
                      <p className="text-xs text-gray-600 italic">{suggestions.nextStatus.reasoning}</p>
                    </div>
                  )}

                  {/* No suggestions message */}
                  {Object.keys(suggestions).length === 0 && (
                    <div className="text-center py-4">
                      <Brain className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No AI suggestions available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-500 text-center">
                AI suggestions are based on pattern matching and may not always be accurate
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}