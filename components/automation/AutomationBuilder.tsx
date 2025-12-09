'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Plus,
  X,
  GripVertical,
  ChevronDown,
  Bell,
  Mail,
  MessageSquare,
  Pencil,
  Ticket,
  Calendar,
  UserPlus,
} from 'lucide-react';
import type {
  AutomationEntityType,
  TriggerType,
  TriggerEvent,
  ConditionGroup,
  Condition,
  AutomationAction,
  ActionType,
  FieldMetadata,
} from '@/lib/automation/types';
import {
  ENTITY_TYPE_LABELS,
  TRIGGER_EVENT_LABELS,
  ACTION_TYPE_LABELS,
  ENTITY_FIELDS,
  ENTITY_EVENTS,
} from '@/lib/automation/types';

// ============================================
// Types
// ============================================

interface AutomationBuilderProps {
  entityType: AutomationEntityType;
  triggerType: TriggerType;
  triggerEvent: TriggerEvent | null;
  conditions: ConditionGroup;
  actions: AutomationAction[];
  onEntityTypeChange: (entityType: AutomationEntityType) => void;
  onTriggerTypeChange: (triggerType: TriggerType) => void;
  onTriggerEventChange: (event: TriggerEvent | null) => void;
  onConditionsChange: (conditions: ConditionGroup) => void;
  onActionsChange: (actions: AutomationAction[]) => void;
}

// ============================================
// Operator Options
// ============================================

const TEXT_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const NUMBER_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'greater_than_or_equals', label: 'is greater than or equal to' },
  { value: 'less_than', label: 'is less than' },
  { value: 'less_than_or_equals', label: 'is less than or equal to' },
];

const DATE_OPERATORS = [
  { value: 'equals', label: 'is' },
  { value: 'before', label: 'is before' },
  { value: 'after', label: 'is after' },
  { value: 'in_last_n_days', label: 'is in last N days' },
  { value: 'in_next_n_days', label: 'is in next N days' },
  { value: 'is_today', label: 'is today' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const ENUM_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'in', label: 'is one of' },
  { value: 'not_in', label: 'is not one of' },
];

const BOOLEAN_OPERATORS = [
  { value: 'equals', label: 'is' },
];

const getOperatorsForFieldType = (fieldType: string) => {
  switch (fieldType) {
    case 'text': return TEXT_OPERATORS;
    case 'number': return NUMBER_OPERATORS;
    case 'date': return DATE_OPERATORS;
    case 'enum': return ENUM_OPERATORS;
    case 'boolean': return BOOLEAN_OPERATORS;
    default: return TEXT_OPERATORS;
  }
};

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  send_notification: <Bell className="w-4 h-4" />,
  send_email: <Mail className="w-4 h-4" />,
  send_teams_message: <MessageSquare className="w-4 h-4" />,
  update_field: <Pencil className="w-4 h-4" />,
  create_ticket: <Ticket className="w-4 h-4" />,
  add_timeline_event: <Calendar className="w-4 h-4" />,
  assign_user: <UserPlus className="w-4 h-4" />,
};

// ============================================
// Main Component
// ============================================

export default function AutomationBuilder({
  entityType,
  triggerType,
  triggerEvent,
  conditions,
  actions,
  onEntityTypeChange,
  onTriggerTypeChange,
  onTriggerEventChange,
  onConditionsChange,
  onActionsChange,
}: AutomationBuilderProps) {
  const fields = ENTITY_FIELDS[entityType] || [];
  const events = ENTITY_EVENTS[entityType] || [];

  // ============================================
  // Condition Handlers
  // ============================================

  const addCondition = () => {
    const defaultField = fields[0];
    const newCondition: Condition = {
      id: `cond_${Date.now()}`,
      field: defaultField?.key || '',
      fieldType: (defaultField?.type || 'text') as 'text' | 'number' | 'date' | 'enum' | 'boolean',
      operator: 'equals',
      value: undefined,
    };
    onConditionsChange({
      ...conditions,
      conditions: [...conditions.conditions, newCondition],
    });
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions.conditions];
    newConditions[index] = { ...newConditions[index], ...updates } as Condition;
    onConditionsChange({ ...conditions, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    onConditionsChange({
      ...conditions,
      conditions: conditions.conditions.filter((_, i) => i !== index),
    });
  };

  const handleFieldChange = (index: number, fieldKey: string) => {
    const field = fields.find(f => f.key === fieldKey);
    if (field) {
      const operators = getOperatorsForFieldType(field.type);
      const newConditions = [...conditions.conditions];
      newConditions[index] = {
        id: newConditions[index].id,
        field: fieldKey,
        fieldType: field.type,
        operator: operators[0]?.value,
        value: undefined,
      } as Condition;
      onConditionsChange({ ...conditions, conditions: newConditions });
    }
  };

  // ============================================
  // Action Handlers
  // ============================================

  const addAction = () => {
    const newAction: AutomationAction = {
      id: `action_${Date.now()}`,
      type: 'send_notification',
      config: {
        channel: 'in_app',
        recipients: 'owner',
        message_template: '',
      },
    };
    onActionsChange([...actions, newAction]);
  };

  const updateAction = (index: number, updates: Partial<AutomationAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    onActionsChange(newActions);
  };

  const removeAction = (index: number) => {
    onActionsChange(actions.filter((_, i) => i !== index));
  };

  const handleActionTypeChange = (index: number, type: ActionType) => {
    // Reset config based on action type
    let config: AutomationAction['config'];
    switch (type) {
      case 'send_notification':
        config = { channel: 'in_app', recipients: 'owner', message_template: '' };
        break;
      case 'send_email':
        config = { recipients: 'owner', subject_template: '', body_template: '' };
        break;
      case 'send_teams_message':
        config = { webhook_url: '', message_template: '' };
        break;
      case 'update_field':
        config = { field: '', value: '' };
        break;
      case 'create_ticket':
        config = { title_template: '', description_template: '', priority: 'medium', assign_to: 'owner' };
        break;
      case 'add_timeline_event':
        config = { event_type: '', description_template: '' };
        break;
      case 'assign_user':
        config = { strategy: 'round_robin' };
        break;
      default:
        config = { channel: 'in_app', recipients: 'owner', message_template: '' };
    }
    updateAction(index, { type, config } as { type: ActionType; config: AutomationAction['config'] });
  };

  // ============================================
  // Drag & Drop
  // ============================================

  const handleConditionDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(conditions.conditions);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    onConditionsChange({ ...conditions, conditions: items });
  };

  const handleActionDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(actions);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    onActionsChange(items);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-8">
      {/* Entity Type & Trigger */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          When should this automation run?
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => onEntityTypeChange(e.target.value as AutomationEntityType)}
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Trigger Type
            </label>
            <select
              value={triggerType}
              onChange={(e) => onTriggerTypeChange(e.target.value as TriggerType)}
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="event">When an event occurs</option>
              <option value="schedule">On a schedule</option>
            </select>
          </div>
        </div>

        {triggerType === 'event' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Trigger Event
            </label>
            <select
              value={triggerEvent || ''}
              onChange={(e) => onTriggerEventChange(e.target.value as TriggerEvent || null)}
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an event...</option>
              {events.map((event) => (
                <option key={event} value={event}>{TRIGGER_EVENT_LABELS[event]}</option>
              ))}
            </select>
          </div>
        )}

        {triggerType === 'schedule' && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Scheduled automations run every 15 minutes and check all matching entities.
            </p>
          </div>
        )}
      </div>

      {/* Conditions */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Conditions
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Only run when these conditions are met
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Match</span>
            <select
              value={conditions.logic}
              onChange={(e) => onConditionsChange({ ...conditions, logic: e.target.value as 'AND' | 'OR' })}
              className="h-8 px-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="AND">All conditions (AND)</option>
              <option value="OR">Any condition (OR)</option>
            </select>
          </div>
        </div>

        <DragDropContext onDragEnd={handleConditionDragEnd}>
          <Droppable droppableId="conditions">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {conditions.conditions.map((condition, index) => {
                  const field = fields.find(f => f.key === condition.field);
                  const operators = getOperatorsForFieldType(field?.type || 'text');
                  const needsValue = !['is_empty', 'is_not_empty', 'is_today'].includes(condition.operator);

                  return (
                    <Draggable key={condition.id} draggableId={condition.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                            snapshot.isDragging
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50'
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab text-gray-400">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <select
                            value={condition.field}
                            onChange={(e) => handleFieldChange(index, e.target.value)}
                            className="h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            {fields.map((f) => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>

                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, { operator: e.target.value as Condition['operator'] })}
                            className="h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            {operators.map((op) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>

                          {needsValue && (
                            field?.type === 'enum' && field.options ? (
                              <select
                                value={(condition.value as string) || ''}
                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                className="flex-1 h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              >
                                <option value="">Select...</option>
                                {field.options.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : field?.type === 'boolean' ? (
                              <select
                                value={String(condition.value ?? '')}
                                onChange={(e) => updateCondition(index, { value: e.target.value === 'true' })}
                                className="flex-1 h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              >
                                <option value="">Select...</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            ) : field?.type === 'number' ? (
                              <input
                                type="number"
                                value={(condition.value as number) ?? ''}
                                onChange={(e) => updateCondition(index, { value: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="Value"
                                className="flex-1 h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                            ) : field?.type === 'date' ? (
                              condition.operator.includes('n_days') ? (
                                <input
                                  type="number"
                                  value={(condition.value as number) ?? ''}
                                  onChange={(e) => updateCondition(index, { value: e.target.value ? Number(e.target.value) : undefined })}
                                  placeholder="Days"
                                  min="1"
                                  className="flex-1 h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                />
                              ) : (
                                <input
                                  type="date"
                                  value={(condition.value as string) || ''}
                                  onChange={(e) => updateCondition(index, { value: e.target.value })}
                                  className="flex-1 h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                />
                              )
                            ) : (
                              <input
                                type="text"
                                value={(condition.value as string) || ''}
                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                placeholder="Value"
                                className="flex-1 h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                            )
                          )}

                          <button
                            onClick={() => removeCondition(index)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button
          onClick={addCondition}
          className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Condition
        </button>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Actions
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            What should happen when conditions are met?
          </p>
        </div>

        <DragDropContext onDragEnd={handleActionDragEnd}>
          <Droppable droppableId="actions">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {actions.map((action, index) => (
                  <Draggable key={action.id} draggableId={action.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border rounded-lg transition-colors ${
                          snapshot.isDragging
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-slate-700">
                          <div {...provided.dragHandleProps} className="cursor-grab text-gray-400">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-gray-400">
                              {ACTION_ICONS[action.type]}
                            </span>
                            <select
                              value={action.type}
                              onChange={(e) => handleActionTypeChange(index, e.target.value as ActionType)}
                              className="h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => removeAction(index)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Action Config */}
                        <div className="p-4">
                          <ActionConfigEditor
                            type={action.type}
                            config={action.config}
                            fields={fields}
                            onChange={(config) => updateAction(index, { config })}
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {actions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <p className="text-sm">No actions configured yet</p>
          </div>
        )}

        <button
          onClick={addAction}
          className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Action
        </button>
      </div>
    </div>
  );
}

// ============================================
// Action Config Editor
// ============================================

interface ActionConfigEditorProps {
  type: ActionType;
  config: AutomationAction['config'];
  fields: FieldMetadata[];
  onChange: (config: AutomationAction['config']) => void;
}

function ActionConfigEditor({ type, config, fields, onChange }: ActionConfigEditorProps) {
  const updateConfig = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates });
  };

  switch (type) {
    case 'send_notification':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Channel</label>
              <select
                value={(config as { channel?: string }).channel || 'in_app'}
                onChange={(e) => updateConfig({ channel: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="in_app">In-App</option>
                <option value="email">Email</option>
                <option value="teams">Teams</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Recipients</label>
              <select
                value={(config as { recipients?: string }).recipients || 'owner'}
                onChange={(e) => updateConfig({ recipients: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="owner">Owner</option>
                <option value="account_manager">Account Manager</option>
                <option value="assignee">Assignee</option>
                <option value="admins">All Admins</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Message Template
              <span className="text-gray-400 font-normal ml-1">(use {`{{field_name}}`} for variables)</span>
            </label>
            <textarea
              value={(config as { message_template?: string }).message_template || ''}
              onChange={(e) => updateConfig({ message_template: e.target.value })}
              placeholder="e.g., Trial for {{org_name}} is expiring soon"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      );

    case 'send_teams_message':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Webhook URL</label>
            <input
              type="url"
              value={(config as { webhook_url?: string }).webhook_url || ''}
              onChange={(e) => updateConfig({ webhook_url: e.target.value })}
              placeholder="https://outlook.office.com/webhook/..."
              className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Message Template</label>
            <textarea
              value={(config as { message_template?: string }).message_template || ''}
              onChange={(e) => updateConfig({ message_template: e.target.value })}
              placeholder="e.g., Alert: {{org_name}} needs attention"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      );

    case 'update_field':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Field</label>
            <select
              value={(config as { field?: string }).field || ''}
              onChange={(e) => updateConfig({ field: e.target.value })}
              className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Select field...</option>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">New Value</label>
            <input
              type="text"
              value={String((config as { value?: unknown }).value || '')}
              onChange={(e) => updateConfig({ value: e.target.value })}
              placeholder="New value"
              className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      );

    case 'create_ticket':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Title Template</label>
            <input
              type="text"
              value={(config as { title_template?: string }).title_template || ''}
              onChange={(e) => updateConfig({ title_template: e.target.value })}
              placeholder="e.g., Follow up with {{org_name}}"
              className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Description Template</label>
            <textarea
              value={(config as { description_template?: string }).description_template || ''}
              onChange={(e) => updateConfig({ description_template: e.target.value })}
              placeholder="Ticket description..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Priority</label>
              <select
                value={(config as { priority?: string }).priority || 'medium'}
                onChange={(e) => updateConfig({ priority: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Assign To</label>
              <select
                value={(config as { assign_to?: string }).assign_to || 'owner'}
                onChange={(e) => updateConfig({ assign_to: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="owner">Owner</option>
                <option value="account_manager">Account Manager</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'add_timeline_event':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Event Type</label>
            <input
              type="text"
              value={(config as { event_type?: string }).event_type || ''}
              onChange={(e) => updateConfig({ event_type: e.target.value })}
              placeholder="e.g., automation_triggered"
              className="w-full h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Description Template</label>
            <textarea
              value={(config as { description_template?: string }).description_template || ''}
              onChange={(e) => updateConfig({ description_template: e.target.value })}
              placeholder="Event description..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      );

    default:
      return (
        <p className="text-sm text-gray-500">Configuration not available for this action type.</p>
      );
  }
}
