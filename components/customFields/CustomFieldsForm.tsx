'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2 } from 'lucide-react';
import CustomFieldInput from './CustomFieldInput';
import CustomFieldRenderer from './CustomFieldRenderer';
import type { CustomFieldDefinition, CustomFieldValues, CustomFieldValue, EntityType } from '@/lib/customFields/types';

interface CustomFieldsFormProps {
  entityType: EntityType;
  entityId: string;
  values?: CustomFieldValues;
  definitions?: CustomFieldDefinition[];
  onSave?: (values: CustomFieldValues) => void;
  readOnly?: boolean;
  showTitle?: boolean;
  className?: string;
}

export default function CustomFieldsForm({
  entityType,
  entityId,
  values: initialValues,
  definitions: externalDefinitions,
  onSave,
  readOnly = false,
  showTitle = true,
  className = '',
}: CustomFieldsFormProps) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>(externalDefinitions || []);
  const [values, setValues] = useState<CustomFieldValues>(initialValues || {});
  const [loading, setLoading] = useState(!externalDefinitions);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch definitions if not provided
  useEffect(() => {
    if (!externalDefinitions) {
      fetchDefinitions();
    }
  }, [entityType, externalDefinitions]);

  // Fetch values if not provided
  useEffect(() => {
    if (!initialValues && entityId) {
      fetchValues();
    }
  }, [entityType, entityId, initialValues]);

  const fetchDefinitions = async () => {
    try {
      const response = await fetch(`/api/custom-fields/definitions?entity_type=${entityType}`);
      const data = await response.json();
      if (response.ok) {
        setDefinitions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchValues = async () => {
    try {
      const response = await fetch(
        `/api/custom-fields/values?entity_type=${entityType}&entity_id=${entityId}`
      );
      const data = await response.json();
      if (response.ok) {
        setValues(data.data || {});
      }
    } catch (error) {
      console.error('Error fetching values:', error);
    }
  };

  const handleChange = (fieldKey: string, value: CustomFieldValue) => {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
    // Clear error when field is changed
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const def of definitions) {
      const value = values[def.field_key];

      // Check required fields
      if (def.is_required && (value === null || value === undefined || value === '')) {
        newErrors[def.field_key] = `${def.field_label} is required`;
        continue;
      }

      // Skip validation if empty and not required
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Custom regex validation
      if (def.validation_regex && typeof value === 'string') {
        try {
          const regex = new RegExp(def.validation_regex);
          if (!regex.test(value)) {
            newErrors[def.field_key] = def.validation_message || `${def.field_label} is invalid`;
          }
        } catch {
          // Invalid regex - skip validation
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/custom-fields/values', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          values,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      toast.success('Custom fields saved');
      onSave?.(data.data);
    } catch (error) {
      console.error('Error saving custom fields:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 text-center text-sm text-gray-500 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        Loading custom fields...
      </div>
    );
  }

  if (definitions.length === 0) {
    return null; // No custom fields defined for this entity type
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Custom Fields
          </h3>
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {definitions.map((def) => (
          <div key={def.id}>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              {def.field_label}
              {def.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {def.description && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                {def.description}
              </p>
            )}
            {readOnly ? (
              <CustomFieldRenderer
                definition={def}
                value={values[def.field_key]}
              />
            ) : (
              <CustomFieldInput
                definition={def}
                value={values[def.field_key]}
                onChange={(value) => handleChange(def.field_key, value)}
                error={errors[def.field_key]}
              />
            )}
          </div>
        ))}
      </div>

      {!showTitle && !readOnly && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving Custom Fields...' : 'Save Custom Fields'}
          </button>
        </div>
      )}
    </div>
  );
}
