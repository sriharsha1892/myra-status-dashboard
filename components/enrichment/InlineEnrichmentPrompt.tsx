/**
 * Inline Enrichment Prompt
 *
 * A subtle, inline prompt that appears when key data is missing.
 * Allows quick data entry without leaving the current page.
 */

'use client';

import { useState } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, XCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES
// =====================================================

interface InlineEnrichmentPromptProps {
  /** Entity ID (org_id or user_id) */
  entityId: string;
  /** Entity type */
  entityType: 'organization' | 'user';
  /** Field to update */
  field: string;
  /** Table to update */
  table: string;
  /** Label for the prompt */
  label: string;
  /** Options for selection */
  options: Array<{
    value: string;
    label: string;
    icon?: 'healthy' | 'warning' | 'at-risk' | 'critical';
    color?: string;
  }>;
  /** Current value (if any) */
  currentValue?: string | null;
  /** Callback after successful update */
  onUpdate?: (newValue: string) => void;
  /** Whether to show even if value exists (for editing) */
  showAlways?: boolean;
}

// Icon components by type
const ICONS = {
  healthy: CheckCircle,
  warning: AlertTriangle,
  'at-risk': AlertCircle,
  critical: XCircle,
};

const COLORS = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  'at-risk': 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  critical: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
};

// =====================================================
// COMPONENT
// =====================================================

export default function InlineEnrichmentPrompt({
  entityId,
  entityType,
  field,
  table,
  label,
  options,
  currentValue,
  onUpdate,
  showAlways = false,
}: InlineEnrichmentPromptProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(currentValue || null);
  const supabase = createClient();

  // Don't show if value exists and showAlways is false
  if (currentValue && !showAlways) {
    return null;
  }

  const handleSelect = async (value: string) => {
    setIsUpdating(true);
    try {
      // Determine the ID field based on entity type
      const idField = entityType === 'organization' ? 'org_id' : 'user_id';

      const { error } = await supabase
        .from(table)
        .update({ [field]: value })
        .eq(idField, entityId);

      if (error) throw error;

      setSelectedValue(value);
      onUpdate?.(value);
      toast.success(`Updated ${label.toLowerCase()}`);
    } catch (error: any) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  // If already selected/saved, show compact display
  if (selectedValue) {
    const selected = options.find(o => o.value === selectedValue);
    const Icon = selected?.icon ? ICONS[selected.icon] : CheckCircle;
    const colorClass = selected?.icon ? COLORS[selected.icon] : COLORS.healthy;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{selected?.label}</span>
        <button
          onClick={() => setSelectedValue(null)}
          className="text-xs opacity-60 hover:opacity-100 ml-1"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">{label}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const Icon = option.icon ? ICONS[option.icon] : null;
          const colorClass = option.icon ? COLORS[option.icon] : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';

          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={isUpdating}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${colorClass} ${
                isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// PRESET PROMPTS
// =====================================================

/**
 * Health Status Prompt - Most common inline enrichment
 */
export function HealthStatusPrompt({
  orgId,
  currentValue,
  onUpdate,
}: {
  orgId: string;
  currentValue?: string | null;
  onUpdate?: (value: string) => void;
}) {
  return (
    <InlineEnrichmentPrompt
      entityId={orgId}
      entityType="organization"
      field="health_status"
      table="trial_organizations"
      label="Set relationship health"
      currentValue={currentValue}
      onUpdate={onUpdate}
      options={[
        { value: 'healthy', label: 'Healthy', icon: 'healthy' },
        { value: 'warning', label: 'Warning', icon: 'warning' },
        { value: 'at-risk', label: 'At-Risk', icon: 'at-risk' },
        { value: 'critical', label: 'Critical', icon: 'critical' },
      ]}
    />
  );
}

/**
 * Deal Momentum Prompt
 */
export function DealMomentumPrompt({
  orgId,
  currentValue,
  onUpdate,
}: {
  orgId: string;
  currentValue?: string | null;
  onUpdate?: (value: string) => void;
}) {
  return (
    <InlineEnrichmentPrompt
      entityId={orgId}
      entityType="organization"
      field="deal_momentum"
      table="trial_organizations"
      label="Current deal momentum?"
      currentValue={currentValue}
      onUpdate={onUpdate}
      options={[
        { value: 'fast_track', label: 'Fast Track', icon: 'healthy' },
        { value: 'steady', label: 'Steady', icon: 'warning' },
        { value: 'stalled', label: 'Stalled', icon: 'at-risk' },
        { value: 'at_risk', label: 'At Risk', icon: 'critical' },
      ]}
    />
  );
}

/**
 * User Influence Prompt - For contact enrichment
 */
export function UserInfluencePrompt({
  userId,
  currentValue,
  onUpdate,
}: {
  userId: string;
  currentValue?: string | null;
  onUpdate?: (value: string) => void;
}) {
  return (
    <InlineEnrichmentPrompt
      entityId={userId}
      entityType="user"
      field="influence"
      table="trial_users"
      label="What's their influence?"
      currentValue={currentValue}
      onUpdate={onUpdate}
      options={[
        { value: 'champion', label: 'Champion', icon: 'healthy' },
        { value: 'decision_maker', label: 'Decision Maker', icon: 'healthy' },
        { value: 'evaluator', label: 'Evaluator', icon: 'warning' },
        { value: 'influencer', label: 'Influencer', icon: 'warning' },
        { value: 'blocker', label: 'Blocker', icon: 'critical' },
      ]}
    />
  );
}
