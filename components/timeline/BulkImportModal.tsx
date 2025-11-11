'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onImported: () => void;
}

type Step = 'paste' | 'review' | 'importing';

interface ParsedEvent {
  event_timestamp: Date;
  event_type: string;
  event_category: string;
  title: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  mentioned_people: string[];
  mentioned_features: string[];
  follow_up_required: boolean;
  parse_confidence: number;
}

export default function BulkImportModal({ isOpen, onClose, orgId, onImported }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>('paste');
  const [rawText, setRawText] = useState('');
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [painPoints, setPainPoints] = useState<any[]>([]);
  const [learnings, setLearnings] = useState<any[]>([]);
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('Please paste some text to import');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/timeline/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          raw_text: rawText,
          source_type: 'crm_notes',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse');
      }

      setParsedEvents(result.data.events);
      setPainPoints(result.data.pain_points);
      setLearnings(result.data.learnings);
      setOverallConfidence(result.data.overall_confidence);
      setStep('review');
      toast.success(`Parsed ${result.data.events.length} events successfully`);
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || 'Failed to parse notes');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    setStep('importing');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/timeline/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          events: parsedEvents,
          pain_points: painPoints,
          learnings: learnings,
          raw_text: rawText,
          source_type: 'crm_notes',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to import');
      }

      toast.success(`Imported ${result.data.events_imported} events successfully`);
      onImported();
      handleClose();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import events');
      setStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setRawText('');
    setParsedEvents([]);
    setPainPoints([]);
    setLearnings([]);
    setStep('paste');
    setEditingIndex(null);
    onClose();
  };

  const removeEvent = (index: number) => {
    setParsedEvents(parsedEvents.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, updates: Partial<ParsedEvent>) => {
    const updated = [...parsedEvents];
    updated[index] = { ...updated[index], ...updates };
    setParsedEvents(updated);
    setEditingIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Import CRM Notes</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'paste' && 'Paste your detailed CRM notes to automatically extract events'}
              {step === 'review' && `Review ${parsedEvents.length} parsed events before importing`}
              {step === 'importing' && 'Importing events...'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Paste */}
          {step === 'paste' && (
            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Supported Format</p>
                    <p className="text-blue-700">
                      Circle K-style tabular format with <strong>Date</strong>, <strong>Event Title</strong>, and{' '}
                      <strong>Description</strong>. The parser will automatically extract events, people, pain points, and learnings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste CRM Notes
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                    placeholder="Oct 31 2025 6:10 PM    Trial access shared    Nikita issued login credentials...&#10;Oct 31 2025 7:41 PM    Delivery issue    Andrew reported not receiving credentials...&#10;&#10;Pain Points:&#10;- Historic actuals inaccurate&#10;- Data credibility concerns&#10;&#10;Learnings:&#10;- Need better baseline validation"
                  />
                </div>

                <div className="text-xs text-gray-500">
                  Tip: Include dedicated sections for "Pain Points" and "Learnings" for better extraction
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 'review' && (
            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-sm text-blue-600 font-medium">Events</div>
                  <div className="text-2xl font-bold text-blue-900">{parsedEvents.length}</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <div className="text-sm text-amber-600 font-medium">Pain Points</div>
                  <div className="text-2xl font-bold text-amber-900">{painPoints.length}</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-sm text-green-600 font-medium">Learnings</div>
                  <div className="text-2xl font-bold text-green-900">{learnings.length}</div>
                </div>
              </div>

              {/* Events list */}
              <div className="space-y-3">
                {parsedEvents.map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getSentimentColor(event.sentiment)}`}>
                            {event.sentiment}
                          </span>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(event.event_timestamp), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{event.event_category}</span>
                        </div>

                        <h4 className="font-medium text-gray-900 mb-1">{event.title}</h4>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {event.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {event.mentioned_people.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            People: {event.mentioned_people.join(', ')}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-400">
                          Confidence: {(event.parse_confidence * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingIndex(index)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit event"
                        >
                          <Edit3 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => removeEvent(index)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove event"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {parsedEvents.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No events parsed. Try a different format or adjust your notes.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">Importing events...</p>
                <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {step === 'review' && (
              <span>
                Overall confidence: <strong>{(overallConfidence * 100).toFixed(0)}%</strong>
              </span>
            )}
          </div>

          <div className="flex gap-3">
            {step === 'paste' && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleParse}
                  disabled={!rawText.trim() || isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Parse Notes
                    </>
                  )}
                </button>
              </>
            )}

            {step === 'review' && (
              <>
                <button
                  onClick={() => setStep('paste')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={parsedEvents.length === 0 || isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Import {parsedEvents.length} Events
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helper functions for styling
function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-100 text-green-700';
    case 'negative':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'medium':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}
