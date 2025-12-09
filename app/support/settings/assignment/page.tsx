'use client';

import { useState, useEffect } from 'react';
import type {
  AssignmentRule,
  RuleCondition,
  ConditionField,
  ConditionOperator,
  AssignmentType,
  MatchType,
  FIELD_LABELS,
  OPERATOR_LABELS,
  ASSIGNMENT_TYPE_LABELS,
} from '@/lib/assignment/types';

const fieldLabels: Record<ConditionField, string> = {
  industry: 'Industry',
  company_size: 'Company Size',
  source: 'Lead Source',
  region: 'Region',
  country: 'Country',
  plan_type: 'Plan Type',
  trial_length: 'Trial Length (days)',
  user_count: 'User Count',
  company_name: 'Company Name',
  email_domain: 'Email Domain',
};

const operatorLabels: Record<ConditionOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  in: 'is one of',
  not_in: 'is not one of',
  greater_than: 'is greater than',
  less_than: 'is less than',
  greater_than_or_equal: 'is at least',
  less_than_or_equal: 'is at most',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
};

const assignmentTypeLabels: Record<AssignmentType, string> = {
  user: 'Specific User',
  round_robin: 'Round Robin',
  load_balanced: 'Load Balanced',
};

interface User {
  id: string;
  name: string;
  email: string;
}

export default function AssignmentSettingsPage() {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
    fetchUsers();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/assignment/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules);
      }
    } catch (err) {
      setError('Failed to fetch rules');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const handleToggleActive = async (rule: AssignmentRule) => {
    try {
      const response = await fetch(`/api/assignment/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (err) {
      setError('Failed to update rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/assignment/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (err) {
      setError('Failed to delete rule');
    }
  };

  const handleSaveRule = async (ruleData: Partial<AssignmentRule>) => {
    try {
      const url = editingRule
        ? `/api/assignment/rules/${editingRule.id}`
        : '/api/assignment/rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        setShowEditor(false);
        setEditingRule(null);
        fetchRules();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save rule');
      }
    } catch (err) {
      setError('Failed to save rule');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Smart Assignment Rules
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure rules for automatically assigning new trials to team members
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowEditor(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Rule
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Rules List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No assignment rules</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create rules to automatically assign new trials to your team
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              users={users}
              onEdit={() => {
                setEditingRule(rule);
                setShowEditor(true);
              }}
              onToggleActive={() => handleToggleActive(rule)}
              onDelete={() => handleDelete(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Rule Editor Modal */}
      {showEditor && (
        <RuleEditorModal
          rule={editingRule}
          users={users}
          onClose={() => {
            setShowEditor(false);
            setEditingRule(null);
          }}
          onSave={handleSaveRule}
        />
      )}
    </div>
  );
}

function RuleCard({
  rule,
  users,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  rule: AssignmentRule;
  users: User[];
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const getAssigneeDisplay = () => {
    if (rule.assignment_type === 'user') {
      const user = users.find((u) => u.id === rule.assigned_user_id);
      return user?.name || 'Unknown user';
    }
    if (rule.assignment_type === 'round_robin') {
      return `Round robin (${rule.round_robin_pool.length} users)`;
    }
    if (rule.assignment_type === 'load_balanced') {
      return `Load balanced (${rule.round_robin_pool.length} users)`;
    }
    return 'Unknown';
  };

  return (
    <div className={`rounded-lg border ${rule.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200/50 dark:border-gray-700/50'} bg-white p-4 shadow-sm dark:bg-gray-800 ${!rule.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{rule.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rule.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'}`}>
              {rule.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              Priority: {rule.priority}
            </span>
          </div>
          {rule.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
          )}

          {/* Conditions */}
          <div className="mt-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              Conditions ({rule.match_type === 'all' ? 'ALL must match' : 'ANY can match'})
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {rule.conditions.length === 0 ? (
                <span className="text-sm italic text-gray-400">No conditions (matches all)</span>
              ) : (
                rule.conditions.map((c, i) => (
                  <span key={i} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {fieldLabels[c.field as ConditionField] || c.field} {operatorLabels[c.operator as ConditionOperator] || c.operator} {String(c.value)}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="mt-3">
            <p className="text-xs font-medium uppercase text-gray-500">Assigns to</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{getAssigneeDisplay()}</p>
          </div>

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>Matched {rule.total_matches} times</span>
            {rule.last_matched_at && (
              <span>Last match: {new Date(rule.last_matched_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title={rule.is_active ? 'Deactivate' : 'Activate'}
          >
            {rule.is_active ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function RuleEditorModal({
  rule,
  users,
  onClose,
  onSave,
}: {
  rule: AssignmentRule | null;
  users: User[];
  onClose: () => void;
  onSave: (data: Partial<AssignmentRule>) => void;
}) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [priority, setPriority] = useState(rule?.priority || 100);
  const [matchType, setMatchType] = useState<MatchType>(rule?.match_type || 'all');
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions || []);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(rule?.assignment_type || 'user');
  const [assignedUserId, setAssignedUserId] = useState(rule?.assigned_user_id || '');
  const [roundRobinPool, setRoundRobinPool] = useState<string[]>(rule?.round_robin_pool || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'industry', operator: 'equals', value: '' }]);
  };

  const handleUpdateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleTogglePoolUser = (userId: string) => {
    if (roundRobinPool.includes(userId)) {
      setRoundRobinPool(roundRobinPool.filter((id) => id !== userId));
    } else {
      setRoundRobinPool([...roundRobinPool, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    await onSave({
      name,
      description: description || null,
      priority,
      match_type: matchType,
      conditions,
      assignment_type: assignmentType,
      assigned_user_id: assignmentType === 'user' ? assignedUserId : null,
      round_robin_pool: assignmentType !== 'user' ? roundRobinPool : [],
    });

    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {rule ? 'Edit Rule' : 'Create Rule'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name & Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority (lower = higher)
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Conditions */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Conditions
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as MatchType)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">ALL must match</option>
                    <option value="any">ANY can match</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {conditions.length === 0 ? (
                <p className="text-sm italic text-gray-400">No conditions - rule will match all trials</p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={condition.field}
                        onChange={(e) => handleUpdateCondition(index, { field: e.target.value as ConditionField })}
                        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        {Object.entries(fieldLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) => handleUpdateCondition(index, { operator: e.target.value as ConditionOperator })}
                        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        {Object.entries(operatorLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                        <input
                          type="text"
                          value={String(condition.value || '')}
                          onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(index)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignment Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Assignment Type
              </label>
              <div className="flex gap-4">
                {Object.entries(assignmentTypeLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assignment_type"
                      value={key}
                      checked={assignmentType === key}
                      onChange={() => setAssignmentType(key as AssignmentType)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* User Selection */}
            {assignmentType === 'user' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Assign to User
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  User Pool ({roundRobinPool.length} selected)
                </label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-600">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 rounded p-1 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={roundRobinPool.includes(user.id)}
                        onChange={() => handleTogglePoolUser(user.id)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {user.name} ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : rule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
