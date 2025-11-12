'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Sparkles, Zap, User, Type, FileText } from 'lucide-react';
import MentionTextEditor from '@/components/MentionTextEditor';
import { authenticatedFetch } from '@/lib/api-client';

interface TrialUser {
  user_id: string;
  name: string;
  email: string;
}

interface AddUserActivityModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedActivity {
  user_name: string;
  activity_type: string;
  title: string;
  description: string;
  confidence: number;
}

const ACTIVITY_TYPES = [
  { value: 'login', label: 'Logged In', icon: '🔐' },
  { value: 'question_asked', label: 'Asked Question', icon: '❓' },
  { value: 'report_generated', label: 'Generated Report', icon: '📊' },
  { value: 'ppt_created', label: 'Created PPT', icon: '📽️' },
  { value: 'agent_paused', label: 'Agent Paused', icon: '⏸️' },
  { value: 'initial_contact', label: 'Initial Contact', icon: '👋' },
  { value: 'feature_used', label: 'Used Feature', icon: '⭐' },
  { value: 'feedback', label: 'Gave Feedback', icon: '💬' },
  { value: 'other', label: 'Other Activity', icon: '📝' },
];

export default function AddUserActivityModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: AddUserActivityModalProps) {
  const [mode, setMode] = useState<'quick' | 'parser'>('quick');
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Quick Entry Mode State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [activityType, setActivityType] = useState('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Parser Mode State
  const [parserInput, setParserInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedActivity | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      resetForm();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_users')
        .select('user_id, name, email')
        .eq('org_id', orgId)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const resetForm = () => {
    setMode('quick');
    setSelectedUserId('');
    setActivityType('other');
    setTitle('');
    setDescription('');
    setParserInput('');
    setParsedData(null);
  };

  const handleParseText = async () => {
    if (!parserInput.trim()) {
      toast.error('Please enter some text to parse');
      return;
    }

    setParsing(true);
    try {
      // Call parser API endpoint
      const response = await authenticatedFetch('/api/parse-activity', {
        method: 'POST',
        body: JSON.stringify({
          text: parserInput,
          org_id: orgId,
          available_users: users.map(u => u.name),
        }),
      });

      if (!response.ok) throw new Error('Parsing failed');

      const result = await response.json();

      if (result.success && result.data) {
        setParsedData(result.data);

        // Find matching user
        const matchedUser = users.find(u =>
          u.name.toLowerCase() === result.data.user_name.toLowerCase()
        );

        if (matchedUser) {
          setSelectedUserId(matchedUser.user_id);
        }

        setActivityType(result.data.activity_type);
        setTitle(result.data.title);
        setDescription(result.data.description);

        toast.success(`Parsed with ${Math.round(result.data.confidence * 100)}% confidence`);
      } else {
        throw new Error(result.error || 'Parsing failed');
      }
    } catch (error: any) {
      console.error('Parser error:', error);
      toast.error(error.message || 'Failed to parse text');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('trial_user_activities').insert({
        org_id: orgId,
        user_id: selectedUserId,
        activity_type: activityType,
        title: title.trim(),
        description: description || null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Activity logged successfully');
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast.error(error.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add User Activity Update</h2>
            <p className="text-sm text-gray-500 mt-1">
              Log trial user engagement with AI-powered parsing
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setMode('quick')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
                mode === 'quick'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              Quick Entry
            </button>
            <button
              onClick={() => setMode('parser')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
                mode === 'parser'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Parser
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Parser Mode Input */}
          {mode === 'parser' && !parsedData && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-accent-50 to-indigo-50 border-2 border-accent-200 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-accent-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">AI-Powered Activity Parser</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Paste your notes and let AI extract the user, activity type, and details automatically
                    </p>
                  </div>
                </div>

                <textarea
                  value={parserInput}
                  onChange={(e) => setParserInput(e.target.value)}
                  rows={6}
                  placeholder="Example: John tried out a question on cheese market and generated a PPT&#10;&#10;Or: Sarah asked about aircraft data but the agent paused, though the output format was really structured&#10;&#10;Or: Mike just started with a Hi and never returned"
                  className="w-full px-4 py-3 bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                />

                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={parsing || !parserInput.trim()}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {parsing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Parsing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Parse with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Parsed Results or Quick Entry Fields */}
          {(mode === 'quick' || parsedData) && (
            <>
              {/* User Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Trial User *
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4 text-indigo-600" />
                  Activity Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ACTIVITY_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        activityType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="activityType"
                        value={type.value}
                        checked={activityType === type.value}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-lg">{type.icon}</span>
                      <span className="text-xs font-medium">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Activity Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Asked question about cheese market data"
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description - WYSIWYG Editor */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  Activity Description
                </label>
                <div className="rounded-xl backdrop-blur-sm bg-white border border-gray-200">
                  <MentionTextEditor
                    content={description}
                    onChange={(html) => setDescription(html)}
                    placeholder="Add details about this activity - what happened, outcomes, observations..."
                    minHeight={150}
                  />
                </div>
              </div>

              {/* Parser Confidence Indicator */}
              {parsedData && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-accent-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent-600" />
                    <div>
                      <p className="text-sm font-semibold text-purple-900">
                        AI Parsing Complete
                      </p>
                      <p className="text-xs text-accent-700 mt-1">
                        Confidence: {Math.round(parsedData.confidence * 100)}% • Review and adjust as needed before saving
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedData(null);
                      setParserInput('');
                    }}
                    className="mt-3 text-xs text-accent-700 hover:text-purple-900 font-medium underline"
                  >
                    Parse different text
                  </button>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'quick' && (!selectedUserId || !title.trim()))}
              className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Activity</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
