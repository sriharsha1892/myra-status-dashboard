'use client';

/**
 * Notification Rules Form Component
 *
 * Allows users to configure which events trigger Teams notifications.
 */

import { useState } from 'react';

export interface NotificationRules {
  newTickets: boolean;
  statusChanges: boolean;
  priorityChanges: boolean;
  newComments: boolean;
  assignedTickets: boolean;
  resolvedTickets: boolean;
}

interface NotificationRulesFormProps {
  initialRules?: Partial<NotificationRules>;
  onChange: (rules: NotificationRules) => void;
  disabled?: boolean;
}

const DEFAULT_RULES: NotificationRules = {
  newTickets: true,
  statusChanges: true,
  priorityChanges: true,
  newComments: true,
  assignedTickets: true,
  resolvedTickets: true,
};

export default function NotificationRulesForm({
  initialRules = {},
  onChange,
  disabled = false,
}: NotificationRulesFormProps) {
  const [rules, setRules] = useState<NotificationRules>({
    ...DEFAULT_RULES,
    ...initialRules,
  });

  const handleToggle = (key: keyof NotificationRules) => {
    const newRules = {
      ...rules,
      [key]: !rules[key],
    };
    setRules(newRules);
    onChange(newRules);
  };

  const ruleDefinitions = [
    {
      key: 'newTickets' as keyof NotificationRules,
      title: 'New Tickets',
      description: 'Notify when a new support ticket is created',
      icon: '🎫',
    },
    {
      key: 'statusChanges' as keyof NotificationRules,
      title: 'Status Changes',
      description: 'Notify when ticket status is updated',
      icon: '🔄',
    },
    {
      key: 'priorityChanges' as keyof NotificationRules,
      title: 'Priority Changes',
      description: 'Notify when ticket priority is changed',
      icon: '⚡',
    },
    {
      key: 'newComments' as keyof NotificationRules,
      title: 'New Comments',
      description: 'Notify when comments are added to tickets',
      icon: '💬',
    },
    {
      key: 'assignedTickets' as keyof NotificationRules,
      title: 'Ticket Assignments',
      description: 'Notify when tickets are assigned to team members',
      icon: '👤',
    },
    {
      key: 'resolvedTickets' as keyof NotificationRules,
      title: 'Resolved Tickets',
      description: 'Notify when tickets are marked as resolved',
      icon: '✅',
    },
  ];

  const enabledCount = Object.values(rules).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Notification Rules</h3>
          <p className="text-xs text-gray-600 mt-1">
            Choose which events should trigger Teams notifications
          </p>
        </div>
        <div className="text-xs text-gray-600">
          {enabledCount} of {ruleDefinitions.length} enabled
        </div>
      </div>

      <div className="space-y-3">
        {ruleDefinitions.map((rule) => (
          <label
            key={rule.key}
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              rules[rule.key]
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200 hover:border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center h-5 mt-0.5">
              <input
                type="checkbox"
                checked={rules[rule.key]}
                onChange={() => handleToggle(rule.key)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{rule.icon}</span>
                <span className="text-sm font-medium text-gray-900">
                  {rule.title}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{rule.description}</p>
            </div>
          </label>
        ))}
      </div>

      {enabledCount === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Warning: No notification rules are enabled. You won't receive any Teams notifications.
          </p>
        </div>
      )}

      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> Even with all rules enabled, you can temporarily disable
          notifications by turning off the integration on this page.
        </p>
      </div>
    </div>
  );
}
