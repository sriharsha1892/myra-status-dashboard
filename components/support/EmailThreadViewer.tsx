'use client';

/**
 * Email Thread Viewer Component
 * Displays email correspondence for a ticket in threaded format
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { sendTicketReply } from '@/lib/email/sender';

interface EmailThread {
  id: string;
  ticket_id: string;
  message_id: string;
  in_reply_to: string | null;
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  attachments: Attachment[];
  received_at: string;
}

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  url?: string;
}

interface EmailThreadViewerProps {
  ticketId: string;
  ticketNumber: string;
  userEmail: string;
}

export default function EmailThreadViewer({
  ticketId,
  ticketNumber,
  userEmail,
}: EmailThreadViewerProps) {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailThread | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadEmailThread();
  }, [ticketId]);

  async function loadEmailThread() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_threads')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('received_at', { ascending: true });

      if (error) throw error;

      setEmails(data || []);
      // Auto-expand the most recent email
      if (data && data.length > 0) {
        setExpandedEmails(new Set([data[data.length - 1].id]));
      }
    } catch (error) {
      console.error('Error loading email thread:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(emailId: string) {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }

  function handleReply(email: EmailThread) {
    setReplyTo(email);
    setShowReplyForm(true);
    setReplyMessage('');
  }

  async function handleSendReply() {
    if (!replyMessage.trim() || !replyTo) return;

    try {
      setSending(true);

      // Send email
      const result = await sendTicketReply(
        ticketId,
        ticketNumber,
        replyTo.from_address,
        `Re: ${replyTo.subject}`,
        replyMessage,
        replyTo.message_id
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Store in email_threads table
      await supabase.from('email_threads').insert({
        ticket_id: ticketId,
        message_id: result.messageId,
        in_reply_to: replyTo.message_id,
        from_address: process.env.NEXT_PUBLIC_EMAIL_FROM_ADDRESS || 'support@myra.ai',
        to_address: replyTo.from_address,
        subject: `Re: ${replyTo.subject}`,
        body_text: replyMessage,
        body_html: null,
        attachments: [],
        received_at: new Date().toISOString(),
      });

      // Also add as comment to ticket
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('ticket_comments').insert({
          ticket_id: ticketId,
          user_id: userData.user.id,
          comment: `[Email Reply]\n${replyMessage}`,
          is_internal: false,
        });
      }

      // Reload thread
      await loadEmailThread();

      // Reset form
      setShowReplyForm(false);
      setReplyTo(null);
      setReplyMessage('');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  }

  function formatEmailAddress(email: string): string {
    // Extract name if in format "Name <email@example.com>"
    const match = email.match(/^"?([^"<]+)"?\s*<?([^>]+)>?$/);
    if (match && match[1] && !match[1].includes('@')) {
      return match[1].trim();
    }
    return email;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading email thread...</div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">No email correspondence yet</div>
        <Button onClick={() => setShowReplyForm(true)}>Send Email</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Email Thread ({emails.length})
        </h3>
        <Button onClick={() => setShowReplyForm(true)} size="sm">
          Reply via Email
        </Button>
      </div>

      {/* Email Thread */}
      <div className="space-y-3">
        {emails.map((email, index) => {
          const isExpanded = expandedEmails.has(email.id);
          const isOutbound = email.from_address.includes(
            process.env.NEXT_PUBLIC_EMAIL_FROM_ADDRESS || 'support@myra.ai'
          );

          return (
            <div
              key={email.id}
              className={`border rounded-lg overflow-hidden transition-all ${
                isOutbound
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              {/* Email Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(email.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                        {formatEmailAddress(email.from_address).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {formatEmailAddress(email.from_address)}
                          </span>
                          {isOutbound && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Sent
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          to {formatEmailAddress(email.to_address)}
                        </div>
                      </div>
                    </div>
                    {!isExpanded && (
                      <div className="text-sm text-gray-600 truncate mt-2">
                        {email.body_text?.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(email.received_at)}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email Body (Expanded) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-white">
                  <div className="p-4">
                    {/* Subject */}
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">Subject</div>
                      <div className="font-medium text-gray-900">{email.subject}</div>
                    </div>

                    {/* Body */}
                    <div className="prose prose-sm max-w-none">
                      {email.body_html ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: email.body_html }}
                          className="email-content"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-700">
                          {email.body_text}
                        </pre>
                      )}
                    </div>

                    {/* Attachments */}
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Attachments ({email.attachments.length})
                        </div>
                        <div className="space-y-2">
                          {email.attachments.map((attachment, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded"
                            >
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                              </svg>
                              <span className="flex-1">{attachment.filename}</span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(attachment.size)}
                              </span>
                              {attachment.url && (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => handleReply(email)}
                        variant="outline"
                        size="sm"
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reply via Email
                </h3>
                <button
                  onClick={() => setShowReplyForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {replyTo && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="text-gray-600">
                    To: {formatEmailAddress(replyTo.from_address)}
                  </div>
                  <div className="text-gray-600">
                    Subject: Re: {replyTo.subject}
                  </div>
                </div>
              )}

              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply..."
                rows={8}
                className="mb-4"
              />

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowReplyForm(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button onClick={handleSendReply} disabled={sending || !replyMessage.trim()}>
                  {sending ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .email-content {
          font-family: inherit;
        }
        .email-content img {
          max-width: 100%;
          height: auto;
        }
        .email-content a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
