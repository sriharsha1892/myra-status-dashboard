'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FeedbackWidgetProps {
  userId?: string;
}

export default function FeedbackWidget({ userId }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    feedback_type: 'feedback' as 'feedback' | 'support' | 'bug' | 'feature_request',
    subject: '',
    message: '',
  });

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    setLoading(true);

    try {
      // Get user email
      const { data: { user } } = await supabase.auth.getUser();

      // Insert into database
      const { error } = await supabase
        .from('feedback_submissions')
        .insert({
          user_id: userId,
          ...formData,
        });

      if (error) throw error;

      // Send email notification
      await fetch('/api/feedback/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_email: user?.email || 'unknown',
        }),
      });

      toast.success('Thank you for your feedback!');
      setFormData({ feedback_type: 'feedback', subject: '', message: '' });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-200 ${
          isOpen
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
        aria-label={isOpen ? 'Close feedback' : 'Give feedback'}
      >
        {isOpen ? (
          <X className="w-5 h-5" strokeWidth={2} />
        ) : (
          <MessageCircle className="w-5 h-5" strokeWidth={2} />
        )}
      </button>

      {/* Feedback Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Form Panel */}
          <div className="fixed bottom-24 right-6 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
              <h3 className="text-base font-bold text-white">Feedback & Support</h3>
              <p className="text-xs text-blue-100 mt-0.5">Help us improve myRA AI</p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Type
                </label>
                <select
                  value={formData.feedback_type}
                  onChange={(e) => setFormData({ ...formData, feedback_type: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="feedback">General Feedback</option>
                  <option value="support">Support Request</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature_request">Feature Request</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief summary..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Details
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us more..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
