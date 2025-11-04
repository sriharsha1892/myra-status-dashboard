'use client';

import { useState } from 'react';
import { Mail, Reply, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  timestamp: Date;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
}

interface EmailThreadViewerProps {
  messages: EmailMessage[];
  onReply: (messageId: string) => void;
}

export default function EmailThreadViewer({ messages, onReply }: EmailThreadViewerProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(messages.length > 0 ? [messages[0].id] : [])
  );

  const toggleMessage = (id: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMessages(newExpanded);
  };

  if (messages.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600">No email messages in this thread</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        const isExpanded = expandedMessages.has(message.id);
        const isLatest = index === 0;

        return (
          <div
            key={message.id}
            className={`bg-white border rounded-lg overflow-hidden transition-all ${
              isLatest ? 'border-blue-200 shadow-sm' : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleMessage(message.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-600">
                    {message.from.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {message.from}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="text-sm text-gray-600 truncate">
                      {message.body.split('\n')[0]}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {message.attachments && message.attachments.length > 0 && (
                  <Paperclip className="w-4 h-4 text-gray-400" />
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Body */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">To:</span> {message.to}
                  </div>
                  <div className="prose prose-sm max-w-none">
                    {message.html ? (
                      <div dangerouslySetInnerHTML={{ __html: message.html }} />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-gray-900">
                        {message.body}
                      </pre>
                    )}
                  </div>

                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Attachments ({message.attachments.length})
                      </p>
                      <div className="space-y-2">
                        {message.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Paperclip className="w-4 h-4" />
                            <span>{att.filename}</span>
                            <span className="text-xs text-gray-500">
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reply button */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => onReply(message.id)}
                    className="inline-flex items-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
