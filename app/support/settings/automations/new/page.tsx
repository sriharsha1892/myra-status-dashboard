'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import AutomationBuilder from '@/components/automation/AutomationBuilder';
import type {
  AutomationEntityType,
  TriggerType,
  TriggerEvent,
  ConditionGroup,
  AutomationAction,
} from '@/lib/automation/types';

export default function NewAutomationPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<AutomationEntityType>('trial_organizations');
  const [triggerType, setTriggerType] = useState<TriggerType>('event');
  const [triggerEvent, setTriggerEvent] = useState<TriggerEvent | null>(null);
  const [conditions, setConditions] = useState<ConditionGroup>({ logic: 'AND', conditions: [] });
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [cooldownMinutes, setCooldownMinutes] = useState(60);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the automation');
      return;
    }

    if (triggerType === 'event' && !triggerEvent) {
      toast.error('Please select a trigger event');
      return;
    }

    if (actions.length === 0) {
      toast.error('Please add at least one action');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        entity_type: entityType,
        is_active: isActive,
        trigger_type: triggerType,
        trigger_event: triggerType === 'event' ? triggerEvent : undefined,
        schedule_cron: triggerType === 'schedule' ? '*/15 * * * *' : undefined,
        conditions,
        actions,
        cooldown_minutes: cooldownMinutes,
      };

      const response = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create automation');
      }

      toast.success('Automation created successfully');
      router.push('/support/settings/automations');
    } catch (error) {
      console.error('Error creating automation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role !== 'Admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-sm text-gray-500">Unauthorized - Admin access required</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Automation</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Automation'}
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Alert on expiring trials"
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">Active</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-slate-300">Cooldown:</label>
                <input
                  type="number"
                  value={cooldownMinutes}
                  onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                  min="0"
                  className="w-20 h-8 px-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Builder */}
        <AutomationBuilder
          entityType={entityType}
          triggerType={triggerType}
          triggerEvent={triggerEvent}
          conditions={conditions}
          actions={actions}
          onEntityTypeChange={setEntityType}
          onTriggerTypeChange={setTriggerType}
          onTriggerEventChange={setTriggerEvent}
          onConditionsChange={setConditions}
          onActionsChange={setActions}
        />
      </div>
    </div>
  );
}
