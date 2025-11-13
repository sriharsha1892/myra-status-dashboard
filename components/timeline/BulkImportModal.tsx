'use client';

/**
 * BulkImportModal - AI-Powered Timeline Import (Tavus-Inspired Premium UX)
 * 3-Stage Workflow: Paste → Review → Import
 * Handles narrative text from emails, Teams, CRM notes
 * Enhanced with glassmorphism, floating animations, and luminous gradients
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, CheckCircle2, AlertTriangle, XCircle, Edit3, Trash2, Calendar, Sparkles, Check, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import QuickEntryForm from './QuickEntryForm';

// Tavus-inspired keyframe animations
const animations = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-15px) rotate(5deg); }
    66% { transform: translateY(-8px) rotate(-3deg); }
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(148, 163, 184, 0.1); }
    50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.2), 0 0 60px rgba(148, 163, 184, 0.15); }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes typing-dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
  }

  @keyframes scale-in {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .animate-float {
    animation: float 6s ease-in-out infinite;
  }

  .animate-pulse-glow {
    animation: pulse-glow 3s ease-in-out infinite;
  }

  .animate-scale-in {
    animation: scale-in 0.3s ease-out forwards;
  }

  .glassmorphism {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .glassmorphism-dark {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .gradient-blue-slate {
    background: linear-gradient(135deg, #3b82f6 0%, #64748b 100%);
  }

  .gradient-border {
    position: relative;
    background: white;
    border-radius: 12px;
  }

  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    padding: 2px;
    background: linear-gradient(135deg, #3b82f6, #64748b);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  .hover-lift {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .hover-lift:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }
`;

// Inject animations into head
if (typeof document !== 'undefined') {
  const styleId = 'tavus-bulk-import-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = animations;
    document.head.appendChild(style);
  }
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  onImported: () => void;
}

interface ParsedEvent {
  event_timestamp: string;
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
  follow_up_date: string | null;
  parse_confidence: number;
  metadata: {
    original_segment: string;
    llm_suggested_type?: string;
  };
}

type Stage = 'paste' | 'review' | 'confirm';

export default function BulkImportModal({
  isOpen,
  onClose,
  orgId,
  orgName,
  onImported,
}: BulkImportModalProps) {
  const supabase = createClient();

  // Stage management
  const [stage, setStage] = useState<Stage>('paste');

  // Stage 1: Paste
  const [text, setText] = useState('');
  const [dateRangeHint, setDateRangeHint] = useState({
    start: '',
    end: '',
  });

  // Stage 2: Review
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [confidenceSummary, setConfidenceSummary] = useState({ high: 0, medium: 0, low: 0 });
  const [processingTime, setProcessingTime] = useState(0);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // Stage 3: Confirm
  const [importing, setImporting] = useState(false);

  // Loading states
  const [parsing, setParsing] = useState(false);

  // Show quick form for failed events
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickFormPrefill, setQuickFormPrefill] = useState<any>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStage('paste');
      setText('');
      setParsedEvents([]);
      setSelectedEvents(new Set());
    }
  }, [isOpen]);

  // Load recent entries
  useEffect(() => {
    if (isOpen && orgId) {
      loadRecentEntries();
    }
  }, [isOpen, orgId]);

  const loadRecentEntries = async () => {
    try {
      const { data } = await supabase
        .from('trial_timeline_events')
        .select('id, event_timestamp, event_type, title')
        .eq('org_id', orgId)
        .order('event_timestamp', { ascending: false })
        .limit(5);

      if (data) {
        setRecentEntries(data);
      }
    } catch (error) {
      console.error('Error loading recent entries:', error);
    }
  };

  // Stage 1: Parse with AI
  const handleParse = async () => {
    if (!text.trim()) {
      toast.error('Please paste some text to parse');
      return;
    }

    setParsing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/timeline/import/llm-parse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          org_id: orgId,
          date_range_hint: dateRangeHint.start && dateRangeHint.end
            ? {
                start: dateRangeHint.start,
                end: dateRangeHint.end,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse text');
      }

      const data = await response.json();

      setParsedEvents(data.events || []);
      setConfidenceSummary(data.confidence_summary || { high: 0, medium: 0, low: 0 });
      setProcessingTime(data.processing_time_ms || 0);

      // Auto-select high confidence events
      const highConfidenceIndices = new Set<number>();
      data.events.forEach((event: ParsedEvent, idx: number) => {
        if (event.parse_confidence >= 0.8) {
          highConfidenceIndices.add(idx);
        }
      });
      setSelectedEvents(highConfidenceIndices);

      setStage('review');
      toast.success(`Extracted ${data.events.length} events from your notes!`);
    } catch (error: any) {
      console.error('Error parsing text:', error);
      toast.error(error.message || 'Failed to parse text. Please try a smaller section.');
    } finally {
      setParsing(false);
    }
  };

  // Stage 2: Toggle event selection
  const toggleEventSelection = (index: number) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEvents(newSelected);
  };

  // Stage 2: Remove event
  const removeEvent = (index: number) => {
    setParsedEvents(parsedEvents.filter((_, idx) => idx !== index));
    const newSelected = new Set(selectedEvents);
    newSelected.delete(index);
    setSelectedEvents(newSelected);
  };

  // Stage 2: Update event
  const updateEvent = (index: number, updatedEvent: ParsedEvent) => {
    setParsedEvents(parsedEvents.map((event, idx) => idx === index ? updatedEvent : event));
    setEditingEventIndex(null);
  };

  // Stage 2: Send to quick form
  const sendToQuickForm = (event: ParsedEvent, index: number) => {
    setQuickFormPrefill(event);
    setShowQuickForm(true);
    removeEvent(index);
  };

  // Stage 2: Proceed to confirm
  const proceedToConfirm = () => {
    if (selectedEvents.size === 0) {
      toast.error('Please select at least one event to import');
      return;
    }
    setStage('confirm');
  };

  // Stage 3: Import events
  const handleImport = async () => {
    setImporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const eventsToImport = parsedEvents.filter((_, idx) => selectedEvents.has(idx));

      const response = await fetch('/api/timeline/import/confirm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: orgId,
          events: eventsToImport,
          source_type: 'bulk_import_llm',
          raw_text: text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import events');
      }

      const data = await response.json();

      toast.success(`Successfully imported ${data.events_imported || eventsToImport.length} events!`);
      onImported();
      onClose();
    } catch (error: any) {
      console.error('Error importing events:', error);
      toast.error(error.message || 'Failed to import events');
    } finally {
      setImporting(false);
    }
  };

  // Bulk actions
  const selectAllHigh = () => {
    const highIndices = new Set<number>();
    parsedEvents.forEach((event, idx) => {
      if (event.parse_confidence >= 0.8) {
        highIndices.add(idx);
      }
    });
    setSelectedEvents(highIndices);
  };

  const selectAll = () => {
    setSelectedEvents(new Set(parsedEvents.map((_, idx) => idx)));
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
  };

  if (!isOpen) return null;

  // Get confidence tier
  const getConfidenceTier = (confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  // Group events by confidence
  const groupedEvents = {
    high: parsedEvents.map((e, idx) => ({ event: e, index: idx })).filter(({ event }) => getConfidenceTier(event.parse_confidence) === 'high'),
    medium: parsedEvents.map((e, idx) => ({ event: e, index: idx })).filter(({ event }) => getConfidenceTier(event.parse_confidence) === 'medium'),
    low: parsedEvents.map((e, idx) => ({ event: e, index: idx })).filter(({ event }) => getConfidenceTier(event.parse_confidence) === 'low'),
  };

  return (
    <>
      {/* Tavus-inspired glassmorphism backdrop */}
      <div className="fixed inset-0 glassmorphism-dark flex items-center justify-center z-50 p-4">
        <div className="glassmorphism rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in" style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 80px rgba(59, 130, 246, 0.1)' }}>
          {/* Header with luminous gradient (Tavus-inspired texture with professional blue/slate) */}
          <div className="gradient-blue-slate px-6 py-5 flex items-center justify-between text-white relative overflow-hidden shadow-lg">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-slate-500/10 to-blue-500/10 blur-xl"></div>

            <div className="relative z-10">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Sparkles className="w-6 h-6 animate-float" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))' }} />
                AI-Powered Timeline Import
              </h2>
              <p className="text-sm text-blue-100 mt-1 font-medium">{orgName}</p>
            </div>
            <button
              onClick={onClose}
              className="relative z-10 text-white/80 hover:text-white hover:scale-110 transition-all duration-200 p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Premium Progress Indicator */}
          <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50">
            <div className="flex items-center justify-center gap-3">
              <div className={`flex items-center gap-2 transition-all duration-300 ${stage === 'paste' ? 'text-blue-600 font-semibold scale-105' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${stage === 'paste' ? 'bg-gradient-to-r from-blue-500 to-slate-500 text-white shadow-lg' : 'bg-gray-200'}`}>
                  1
                </span>
                <span className="text-sm font-medium">Paste</span>
              </div>
              <div className={`w-16 h-1 rounded-full transition-all duration-500 ${stage !== 'paste' ? 'bg-gradient-to-r from-blue-500 to-slate-500' : 'bg-gray-200'}`} />
              <div className={`flex items-center gap-2 transition-all duration-300 ${stage === 'review' ? 'text-blue-600 font-semibold scale-105' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${stage === 'review' ? 'bg-gradient-to-r from-blue-500 to-slate-500 text-white shadow-lg' : stage === 'confirm' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                  2
                </span>
                <span className="text-sm font-medium">Review</span>
              </div>
              <div className={`w-16 h-1 rounded-full transition-all duration-500 ${stage === 'confirm' ? 'bg-gradient-to-r from-blue-500 to-slate-500' : 'bg-gray-200'}`} />
              <div className={`flex items-center gap-2 transition-all duration-300 ${stage === 'confirm' ? 'text-blue-600 font-semibold scale-105' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${stage === 'confirm' ? 'bg-gradient-to-r from-blue-500 to-slate-500 text-white shadow-lg' : 'bg-gray-200'}`}>
                  3
                </span>
                <span className="text-sm font-medium">Confirm</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Stage 1: Paste */}
            {stage === 'paste' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Paste any format:</strong> Email threads, Teams messages, CRM notes, meeting summaries.
                    AI will extract all timeline events automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Your Notes
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Example:

Output of the call that happened on 28 Oct'25 - Client liked the platform and informed, we need share the trial access b/w Nov'25 (17-21) as she has this window available to use it and she'll run it with few other teams they have and will discuss again in the month of Jan'25 as budgeting will initiated during this period.

As of 13 Nov'25 - due their internal compliance issues, they couldn't explore the full functionalities of the platform. Hence, his activity couldn't be traced at our servers as well + sent a new set of credentials for client to use it on his personal laptop + next follow up scheduled on 14 Nov'25 10 AM CST (9:30 PM IST)."
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {text.length} characters • Est. {Math.ceil(text.length / 200)} events
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range Hint (Optional)
                    </label>
                    <input
                      type="date"
                      value={dateRangeHint.start}
                      onChange={(e) => setDateRangeHint({ ...dateRangeHint, start: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To
                    </label>
                    <input
                      type="date"
                      value={dateRangeHint.end}
                      onChange={(e) => setDateRangeHint({ ...dateRangeHint, end: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stage 2: Review */}
            {stage === 'review' && (
              <div className="space-y-6">
                {/* Premium Summary Cards with Glassmorphism */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="glassmorphism border border-gray-200 rounded-xl p-5 hover-lift cursor-pointer" style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)' }}>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-slate-600 bg-clip-text text-transparent">{parsedEvents.length}</div>
                    <div className="text-xs text-gray-600 font-medium mt-1">Total Events</div>
                  </div>
                  <div className="glassmorphism border-2 border-green-300 rounded-xl p-5 hover-lift cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50" style={{ boxShadow: '0 4px 16px rgba(34, 197, 94, 0.2)' }}>
                    <div className="text-3xl font-bold text-green-600">{confidenceSummary.high}</div>
                    <div className="text-xs text-green-700 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      High Confidence
                    </div>
                  </div>
                  <div className="glassmorphism border-2 border-yellow-300 rounded-xl p-5 hover-lift cursor-pointer bg-gradient-to-br from-yellow-50 to-amber-50" style={{ boxShadow: '0 4px 16px rgba(234, 179, 8, 0.2)' }}>
                    <div className="text-3xl font-bold text-yellow-600">{confidenceSummary.medium}</div>
                    <div className="text-xs text-yellow-700 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Needs Review
                    </div>
                  </div>
                  <div className="glassmorphism border-2 border-red-300 rounded-xl p-5 hover-lift cursor-pointer bg-gradient-to-br from-red-50 to-rose-50" style={{ boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)' }}>
                    <div className="text-3xl font-bold text-red-600">{confidenceSummary.low}</div>
                    <div className="text-xs text-red-700 font-semibold mt-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Low Confidence
                    </div>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-700">
                    <strong>{selectedEvents.size}</strong> of {parsedEvents.length} events selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllHigh}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Select High Confidence
                    </button>
                    <button
                      onClick={selectAll}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* High Confidence Events */}
                {groupedEvents.high.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      HIGH CONFIDENCE ({groupedEvents.high.length})
                    </h3>
                    <div className="space-y-2">
                      {groupedEvents.high.map(({ event, index }) => (
                        <EventCard
                          key={index}
                          event={event}
                          index={index}
                          selected={selectedEvents.has(index)}
                          onToggle={toggleEventSelection}
                          onRemove={removeEvent}
                          onUpdate={updateEvent}
                          isEditing={editingEventIndex === index}
                          onStartEdit={() => setEditingEventIndex(index)}
                          onCancelEdit={() => setEditingEventIndex(null)}
                          tier="high"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Medium Confidence Events */}
                {groupedEvents.medium.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      NEEDS REVIEW ({groupedEvents.medium.length})
                    </h3>
                    <div className="space-y-2">
                      {groupedEvents.medium.map(({ event, index }) => (
                        <EventCard
                          key={index}
                          event={event}
                          index={index}
                          selected={selectedEvents.has(index)}
                          onToggle={toggleEventSelection}
                          onRemove={removeEvent}
                          onUpdate={updateEvent}
                          isEditing={editingEventIndex === index}
                          onStartEdit={() => setEditingEventIndex(index)}
                          onCancelEdit={() => setEditingEventIndex(null)}
                          onSendToQuickForm={sendToQuickForm}
                          tier="medium"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Low Confidence Events */}
                {groupedEvents.low.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      LOW CONFIDENCE ({groupedEvents.low.length})
                    </h3>
                    <div className="space-y-2">
                      {groupedEvents.low.map(({ event, index }) => (
                        <EventCard
                          key={index}
                          event={event}
                          index={index}
                          selected={selectedEvents.has(index)}
                          onToggle={toggleEventSelection}
                          onRemove={removeEvent}
                          onUpdate={updateEvent}
                          isEditing={editingEventIndex === index}
                          onStartEdit={() => setEditingEventIndex(index)}
                          onCancelEdit={() => setEditingEventIndex(null)}
                          onSendToQuickForm={sendToQuickForm}
                          tier="low"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Entries Context */}
                {recentEntries.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Entries (Context)</h3>
                    <div className="space-y-1">
                      {recentEntries.map((entry) => (
                        <div key={entry.id} className="text-xs text-gray-600 flex items-start gap-2">
                          <Calendar className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>
                            {new Date(entry.event_timestamp).toLocaleDateString()}: {entry.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 3: Confirm */}
            {stage === 'confirm' && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Import</h3>
                  <p className="text-gray-700">
                    You've selected <strong>{selectedEvents.size} events</strong> to import to the timeline.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Import Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">High Confidence</div>
                      <div className="text-2xl font-bold text-green-600">
                        {parsedEvents.filter((_, idx) => selectedEvents.has(idx) && parsedEvents[idx].parse_confidence >= 0.8).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Medium Confidence</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {parsedEvents.filter((_, idx) => selectedEvents.has(idx) && parsedEvents[idx].parse_confidence >= 0.5 && parsedEvents[idx].parse_confidence < 0.8).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Low Confidence</div>
                      <div className="text-2xl font-bold text-red-600">
                        {parsedEvents.filter((_, idx) => selectedEvents.has(idx) && parsedEvents[idx].parse_confidence < 0.5).length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Imported events will appear in the timeline immediately. You can edit or delete them later if needed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {stage === 'paste' && 'AI-powered extraction using Gemini Pro'}
              {stage === 'review' && `Processed in ${(processingTime / 1000).toFixed(2)}s`}
              {stage === 'confirm' && 'Click Import to add events to timeline'}
            </div>
            <div className="flex gap-3">
              {stage === 'paste' && (
                <>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleParse}
                    disabled={parsing || !text.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-slate-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-slate-700 disabled:opacity-50 flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                    style={{ boxShadow: parsing ? 'none' : '0 4px 20px rgba(59, 130, 246, 0.3)' }}
                  >
                    {parsing ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-float" />
                        <span className="flex items-center gap-1">
                          AI is analyzing
                          <span className="inline-flex">
                            <span className="animate-pulse" style={{ animationDelay: '0s' }}>.</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Parse with AI →</span>
                      </>
                    )}
                  </button>
                </>
              )}
              {stage === 'review' && (
                <>
                  <button
                    onClick={() => setStage('paste')}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
                  >
                    ← Back to Edit
                  </button>
                  <button
                    onClick={proceedToConfirm}
                    disabled={selectedEvents.size === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Review & Confirm →
                  </button>
                </>
              )}
              {stage === 'confirm' && (
                <>
                  <button
                    onClick={() => setStage('review')}
                    disabled={importing}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    ← Back to Review
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <span>Import {selectedEvents.size} Events</span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Form Modal for Failed Events */}
      {showQuickForm && quickFormPrefill && (
        <QuickEntryForm
          orgId={orgId}
          orgName={orgName}
          onClose={() => {
            setShowQuickForm(false);
            setQuickFormPrefill(null);
          }}
          onSuccess={() => {
            setShowQuickForm(false);
            setQuickFormPrefill(null);
            loadRecentEntries();
          }}
          prefillData={quickFormPrefill}
        />
      )}
    </>
  );
}

// Event Card Component
interface EventCardProps {
  event: ParsedEvent;
  index: number;
  selected: boolean;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updatedEvent: ParsedEvent) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSendToQuickForm?: (event: ParsedEvent, index: number) => void;
  tier: 'high' | 'medium' | 'low';
}

function EventCard({ event, index, selected, onToggle, onRemove, onUpdate, isEditing, onStartEdit, onCancelEdit, onSendToQuickForm, tier }: EventCardProps) {
  const tierColors = {
    high: 'border-green-200 bg-green-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-red-200 bg-red-50',
  };

  const confidencePercent = Math.round(event.parse_confidence * 100);

  // Editing state
  const [editedTitle, setEditedTitle] = useState(event.title);
  const [editedDescription, setEditedDescription] = useState(event.description);
  const [editedDate, setEditedDate] = useState(event.event_timestamp.split('T')[0]);
  const [editedEventType, setEditedEventType] = useState(event.event_type);
  const [editedSentiment, setEditedSentiment] = useState(event.sentiment);

  // Reset editing state when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditedTitle(event.title);
      setEditedDescription(event.description);
      setEditedDate(event.event_timestamp.split('T')[0]);
      setEditedEventType(event.event_type);
      setEditedSentiment(event.sentiment);
    }
  }, [isEditing, event]);

  const handleSave = () => {
    const updatedEvent: ParsedEvent = {
      ...event,
      title: editedTitle,
      description: editedDescription,
      event_timestamp: editedDate + 'T00:00:00Z',
      event_type: editedEventType,
      sentiment: editedSentiment,
    };
    onUpdate(index, updatedEvent);
  };

  return (
    <div className={`border rounded-lg p-4 ${tierColors[tier]} ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(index)}
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          disabled={isEditing}
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* EDIT MODE */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Event Type</label>
                  <input
                    type="text"
                    value={editedEventType}
                    onChange={(e) => setEditedEventType(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sentiment</label>
                  <select
                    value={editedSentiment}
                    onChange={(e) => setEditedSentiment(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* VIEW MODE */
            <>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{event.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onStartEdit}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Edit inline"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {onSendToQuickForm && (
                    <button
                      onClick={() => onSendToQuickForm(event, index)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Edit in quick form"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Remove event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-white border border-gray-300 rounded">
                  {new Date(event.event_timestamp).toLocaleDateString()}
                </span>
                <span className="px-2 py-1 bg-white border border-gray-300 rounded">
                  {event.event_type.replace(/_/g, ' ')}
                </span>
                <span className={`px-2 py-1 rounded ${
                  event.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                  event.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {event.sentiment === 'positive' ? '😊' : event.sentiment === 'negative' ? '☹️' : '😐'} {event.sentiment}
                </span>
                <span className="px-2 py-1 bg-white border border-gray-300 rounded">
                  {confidencePercent}% confident
                </span>
              </div>
              {event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {event.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
