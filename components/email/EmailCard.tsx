'use client';

import { useState } from 'react';
import type {
  ParsedEmailWithRelations,
  EmailActionItem,
  SENTIMENT_COLORS,
  URGENCY_COLORS,
  ACTION_TYPE_LABELS,
} from '@/lib/email/types';

interface EmailCardProps {
  email: ParsedEmailWithRelations;
  onActionUpdate?: (itemId: string, status: string) => void;
  onLinkOrg?: (emailId: string) => void;
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const urgencyColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const actionTypeLabels: Record<string, string> = {
  follow_up: 'Follow-up',
  meeting: 'Meeting',
  task: 'Task',
  deadline: 'Deadline',
  question: 'Question',
  other: 'Other',
};

export function EmailCard({ email, onActionUpdate, onLinkOrg }: EmailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {email.subject || '(No subject)'}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              From: {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {formatDate(email.email_date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {email.sentiment && (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${sentimentColors[email.sentiment]}`}>
                {email.sentiment}
              </span>
            )}
            {email.urgency_level && (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${urgencyColors[email.urgency_level]}`}>
                {email.urgency_level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {email.summary && (
        <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Summary:</strong> {email.summary}
          </p>
        </div>
      )}

      {/* Key Topics */}
      {email.key_topics && email.key_topics.length > 0 && (
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {email.key_topics.map((topic, i) => (
              <span
                key={i}
                className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {email.action_items && email.action_items.length > 0 && (
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Action Items ({email.action_items.length})
          </h4>
          <ul className="space-y-2">
            {email.action_items.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                onUpdate={onActionUpdate}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Entities */}
      {email.extracted_entities && (
        <div className="p-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <span>Extracted Entities</span>
            <svg
              className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {/* Organizations */}
              {email.extracted_entities.organizations && email.extracted_entities.organizations.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Organizations</h5>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {email.extracted_entities.organizations.map((org, i) => (
                      <span
                        key={i}
                        className={`rounded px-2 py-0.5 text-xs ${
                          org.matched_org_id
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {org.name}
                        {org.matched_org_id && ' (matched)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* People */}
              {email.extracted_entities.people && email.extracted_entities.people.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">People</h5>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {email.extracted_entities.people.map((person, i) => (
                      <span
                        key={i}
                        className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                      >
                        {person.name}
                        {person.role && ` (${person.role})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitors */}
              {email.extracted_entities.competitors && email.extracted_entities.competitors.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Competitors</h5>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {email.extracted_entities.competitors.map((comp, i) => (
                      <span
                        key={i}
                        className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        title={comp.context || undefined}
                      >
                        {comp.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              {email.extracted_entities.dates && email.extracted_entities.dates.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Important Dates</h5>
                  <div className="mt-1 space-y-1">
                    {email.extracted_entities.dates.map((date, i) => (
                      <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{date.text}</span>
                        {date.context && <span className="ml-2 text-gray-500">- {date.context}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionItemRow({
  item,
  onUpdate,
}: {
  item: EmailActionItem;
  onUpdate?: (itemId: string, status: string) => void;
}) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <li className="flex items-center gap-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
      <input
        type="checkbox"
        checked={item.status === 'completed'}
        onChange={(e) => {
          if (onUpdate) {
            onUpdate(item.id, e.target.checked ? 'completed' : 'pending');
          }
        }}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <p className={`text-sm ${item.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
          {item.action_text}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          {item.action_type && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-600">
              {actionTypeLabels[item.action_type] || item.action_type}
            </span>
          )}
          {item.assignee && <span>Assignee: {item.assignee}</span>}
          {item.due_date && <span>Due: {item.due_date}</span>}
        </div>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[item.status]}`}>
        {item.status}
      </span>
    </li>
  );
}
