# useFormValidation Hook - Migration Guide

## Overview

The `useFormValidation` hook is a centralized, reusable form validation solution that eliminates repetitive validation boilerplate across modal forms. It integrates seamlessly with Zod schemas to provide type-safe, real-time validation with automatic error clearing.

**Benefits:**
- ✅ Eliminates ~50 lines of boilerplate per modal
- ✅ Ensures consistent validation patterns across all forms
- ✅ Type-safe with full TypeScript integration
- ✅ Real-time error clearing as users type
- ✅ Centralized validation logic for easier maintenance
- ✅ Reduces code duplication by ~14% on average

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Hook API Reference](#hook-api-reference)
3. [Migration Pattern](#migration-pattern)
4. [Complete Examples](#complete-examples)
5. [Special Cases](#special-cases)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Quick Start

### For New Modals

```typescript
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';
import { mySchema } from '@/lib/validation/schemas/mySchema';

function MyModal() {
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
  } = useFormValidation(mySchema, {
    field1: '',
    field2: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Submit formData...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.field1}
        onChange={(e) => handleInputChange('field1', e.target.value)}
      />
      {errors.field1 && <span className="error">{errors.field1}</span>}
      {/* ... more fields */}
    </form>
  );
}
```

---

## Hook API Reference

### Import

```typescript
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';
```

### Type Signature

```typescript
function useFormValidation<TSchema extends z.ZodSchema>(
  schema: TSchema,
  initialData: z.infer<TSchema>
): {
  formData: z.infer<TSchema>;
  errors: Record<string, string>;
  handleInputChange: (field: string, value: any) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  setFieldValue: (field: string, value: any) => void;
  setFormData: Dispatch<SetStateAction<z.infer<TSchema>>>;
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `z.ZodSchema` | Zod schema for validation |
| `initialData` | `z.infer<TSchema>` | Initial form state matching schema type |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `formData` | `z.infer<TSchema>` | Current form state (typed from schema) |
| `errors` | `Record<string, string>` | Field-level validation errors |
| `handleInputChange` | `(field, value) => void` | Updates field and clears its error |
| `validateForm` | `() => boolean` | Validates entire form, returns true if valid |
| `resetForm` | `() => void` | Resets form to initial state and clears errors |
| `setFieldValue` | `(field, value) => void` | Updates field WITHOUT clearing errors |
| `setFormData` | `Dispatch<SetStateAction<...>>` | Direct form state setter (advanced use) |

---

## Migration Pattern

### Step 1: Identify the Boilerplate to Remove

**BEFORE:**
```typescript
import { useState } from 'react';
import { z } from 'zod';

// Schema definition (can stay in component or move to schema file)
const mySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

// ❌ DELETE THIS SECTION (50+ lines)
const [formData, setFormData] = useState({
  title: '',
  description: '',
});
const [errors, setErrors] = useState<Record<string, string>>({});

const handleInputChange = (field: string, value: string) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
  if (errors[field]) {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }
};

const validateForm = (): boolean => {
  try {
    mySchema.parse(formData);
    setErrors({});
    return true;
  } catch (err) {
    if (err instanceof z.ZodError) {
      const newErrors: Record<string, string> = {};
      err.errors.forEach((error) => {
        if (error.path[0]) {
          const fieldName = error.path[0].toString();
          newErrors[fieldName] = error.message;
        }
      });
      setErrors(newErrors);
    }
    return false;
  }
};

const resetForm = () => {
  setFormData({ title: '', description: '' });
  setErrors({});
};
```

### Step 2: Replace with Hook

**AFTER:**
```typescript
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

// Schema stays the same (or import from schema file)
const mySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

// ✅ REPLACE WITH THIS (Single hook call)
const {
  formData,
  errors,
  handleInputChange,
  validateForm,
  resetForm,
} = useFormValidation(mySchema, {
  title: '',
  description: '',
});
```

### Step 3: Update Imports

Remove unused imports:
```typescript
// ❌ Remove if no longer used
import { useState } from 'react';
import { z } from 'zod'; // Keep only if schema is in component

// ✅ Add this import
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';
```

### Step 4: Verify Form Submission Logic

Ensure `handleSubmit` calls `validateForm()`:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // ✅ Keep this validation check
  if (!validateForm()) {
    return;
  }

  // Rest of submission logic stays the same
  await execute(async () => {
    // ... database operations
  });
};
```

### Step 5: Verify handleClose Logic

Ensure `handleClose` calls `resetForm()`:
```typescript
const handleClose = () => {
  resetForm(); // ✅ This is now provided by the hook
  onClose();
};
```

---

## Complete Examples

### Example 1: Simple Modal (AddTopicModal)

**File:** `/components/AddTopicModal.tsx`

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { useLoadingState } from '@/lib/hooks';
import { createTopicSchema } from '@/lib/validation/schemas/engagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

export default function AddTopicModal({ orgId, isOpen, onClose, onSuccess }) {
  const supabase = createClient();

  // ✅ Use the hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
  } = useFormValidation(createTopicSchema, {
    topic: '',
    category: 'general',
    importance: 'medium',
  });

  const { isLoading, execute } = useLoadingState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Validate with hook
    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        const { error } = await supabase.from('discussion_topics').insert([{
          org_id: orgId,
          topic: formData.topic.trim(),
          category: formData.category,
          importance: formData.importance,
        }]);

        if (error) throw error;
        return { success: true };
      },
      {
        successMessage: 'Topic added successfully',
        errorMessage: 'Failed to add topic',
        onSuccess: () => {
          resetForm(); // ✅ Reset with hook
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'topic_create');
          showErrorWithReport(
            error,
            'topic_create',
            errorDetails.message,
            errorDetails.suggestion,
            user?.email,
            user?.id
          );
        },
      }
    );
  };

  const handleClose = () => {
    resetForm(); // ✅ Reset with hook
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={formData.topic}
          onChange={(e) => handleInputChange('topic', e.target.value)}
          className={errors.topic ? 'border-red-300' : 'border-gray-200'}
        />
        {errors.topic && (
          <p className="text-xs text-red-600">{errors.topic}</p>
        )}

        <select
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
        >
          <option value="general">General</option>
          <option value="technical">Technical</option>
          <option value="business">Business</option>
        </select>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Topic'}
        </button>
      </form>
    </div>
  );
}
```

**Lines Saved:** 41 lines (266 → 225)

---

### Example 2: Modal with Numeric Input (AddTrialExtensionModal)

**File:** `/components/AddTrialExtensionModal.tsx`

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { addDays } from 'date-fns';
import { useLoadingState } from '@/lib/hooks';
import { createTrialExtensionSchema } from '@/lib/validation/schemas/engagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

export default function AddTrialExtensionModal({ orgId, currentExpiryDate, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const supabase = createClient();

  // ✅ Hook handles numeric field types automatically
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
  } = useFormValidation(createTrialExtensionSchema, {
    extend_by_days: 7,  // ✅ Numeric default
    reason: '',
  });

  const { isLoading, execute } = useLoadingState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    await execute(async () => {
      const fromDate = currentExpiryDate ? new Date(currentExpiryDate) : new Date();
      const toDate = addDays(fromDate, formData.extend_by_days);

      const { error } = await supabase.from('trial_extensions').insert({
        org_id: orgId,
        extended_from_date: fromDate.toISOString(),
        extended_to_date: toDate.toISOString(),
        reason: formData.reason || null,
        approved_by: user.id,
      });

      if (error) throw error;
      return { success: true };
    }, {
      successMessage: `Trial extended by ${formData.extend_by_days} days`,
      onSuccess: () => {
        resetForm();
        onClose();
        onSuccess();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ✅ Numeric input with type coercion */}
      <input
        type="number"
        value={formData.extend_by_days}
        onChange={(e) => handleInputChange('extend_by_days', parseInt(e.target.value) || 1)}
      />
      {errors.extend_by_days && <span>{errors.extend_by_days}</span>}

      <textarea
        value={formData.reason}
        onChange={(e) => handleInputChange('reason', e.target.value)}
      />

      <button type="submit" disabled={isLoading}>
        Extend by {formData.extend_by_days} Days
      </button>
    </form>
  );
}
```

**Key Point:** The hook works with any data type - strings, numbers, booleans, dates, etc.

---

### Example 3: Modal with Conditional Logic (UpdateDealStatusModal)

**File:** `/components/UpdateDealStatusModal.tsx`

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLoadingState } from '@/lib/hooks';
import { updateDealStatusSchema } from '@/lib/validation/schemas/deals';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

export default function UpdateDealStatusModal({ orgId, currentStatus, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const supabase = createClient();

  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
  } = useFormValidation(updateDealStatusSchema, {
    status: currentStatus || 'prospecting',
    reason: '',
    won_value: '',
    lost_reason: '',
  });

  const { isLoading, execute } = useLoadingState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Zod schema handles conditional validation
    // Schema validates won_value is required if status = 'won'
    // Schema validates lost_reason is required if status = 'lost'
    if (!validateForm()) return;

    await execute(async () => {
      const updateData: any = {
        deal_status: formData.status,
        updated_by: user?.id,
      };

      if (formData.status === 'won' && formData.won_value) {
        updateData.won_value = parseFloat(formData.won_value);
        updateData.won_at = new Date().toISOString();
      }

      if (formData.status === 'lost' && formData.lost_reason) {
        updateData.lost_reason = formData.lost_reason;
        updateData.lost_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('trial_organizations')
        .update(updateData)
        .eq('org_id', orgId);

      if (error) throw error;
      return { success: true };
    }, {
      successMessage: 'Deal status updated successfully',
      onSuccess: () => {
        resetForm();
        onClose();
        onSuccess();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <select
        value={formData.status}
        onChange={(e) => handleInputChange('status', e.target.value)}
      >
        <option value="prospecting">Prospecting</option>
        <option value="qualified">Qualified</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>

      {/* ✅ Conditional fields - validation handled by schema */}
      {formData.status === 'won' && (
        <div>
          <input
            type="number"
            value={formData.won_value}
            onChange={(e) => handleInputChange('won_value', e.target.value)}
            placeholder="Deal value"
          />
          {errors.won_value && <span>{errors.won_value}</span>}
        </div>
      )}

      {formData.status === 'lost' && (
        <div>
          <textarea
            value={formData.lost_reason}
            onChange={(e) => handleInputChange('lost_reason', e.target.value)}
            placeholder="Reason for loss"
          />
          {errors.lost_reason && <span>{errors.lost_reason}</span>}
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        Update Status
      </button>
    </form>
  );
}
```

**Key Point:** Conditional validation is defined in the Zod schema using `.superRefine()`, not in the component.

---

## Special Cases

### Case 1: Programmatic Form Updates (e.g., AI Assistant)

**Scenario:** You need to programmatically update form data from outside user input (e.g., AI suggestions, pre-filling from URL params).

**Solution:** Use `setFormData` exposed by the hook.

**Example:** `/components/AddRoadmapItemModal.tsx`

```typescript
import { useEffect } from 'react';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';
import AIAssistant from './roadmap/AIAssistant';

export default function AddRoadmapItemModal({ orgId, initialDate, isOpen, onClose, onSuccess }) {
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
    setFormData, // ✅ Expose for programmatic updates
  } = useFormValidation(createRoadmapItemSchema, {
    title: '',
    description: '',
    status: 'planned',
    priority: 'medium',
    target_date: '',
  });

  // ✅ Pre-fill date when modal opens
  useEffect(() => {
    if (isOpen && initialDate) {
      setFormData((prev) => ({ ...prev, target_date: initialDate }));
    }
  }, [isOpen, initialDate, setFormData]); // ✅ Include setFormData in deps

  return (
    <form>
      <input
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
      />

      {/* ✅ AI Assistant can update form programmatically */}
      {formData.title && (
        <AIAssistant
          item={{
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            status: formData.status,
          }}
          onApplySuggestion={(type, value) => {
            // ✅ Programmatic update via handleInputChange
            if (type === 'priority') handleInputChange('priority', value);
            else if (type === 'status') handleInputChange('status', value);
          }}
        />
      )}

      <button type="submit">Add Item</button>
    </form>
  );
}
```

**Important:** Always include `setFormData` in `useEffect` dependency arrays to satisfy React's exhaustive-deps rule.

---

### Case 2: Complex Forms with react-hook-form

**Scenario:** Very complex forms with nested objects, arrays, or field dependencies.

**Alternative Pattern:** Use `react-hook-form` + `zodResolver`

**Example:** `/components/AddMeetingNoteModal.tsx` (NOT migrated - intentionally kept)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  participants: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
  })),
  agenda: z.array(z.string()),
  notes: z.string(),
});

export default function AddMeetingNoteModal() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  // Complex form logic with useFieldArray, watch, etc.
}
```

**When to use react-hook-form instead:**
- Forms with arrays of fields (dynamic add/remove)
- Forms with deep nesting (nested objects)
- Forms requiring field watchers with complex dependencies
- Forms with 10+ fields and complex validation rules

---

### Case 3: Multi-Step Forms

**Scenario:** Wizard-style forms with multiple steps.

**Solution:** Use `setFieldValue` to update fields across steps without clearing errors.

```typescript
const {
  formData,
  errors,
  handleInputChange,
  validateForm,
  resetForm,
  setFieldValue, // ✅ Use for programmatic updates
} = useFormValidation(multiStepSchema, initialData);

const [currentStep, setCurrentStep] = useState(1);

const goToNextStep = () => {
  // Validate current step fields only
  const currentStepValid = validateCurrentStep();
  if (currentStepValid) {
    setCurrentStep(step => step + 1);
  }
};

const validateCurrentStep = (): boolean => {
  // Custom validation for current step
  try {
    if (currentStep === 1) {
      step1Schema.parse(formData);
    } else if (currentStep === 2) {
      step2Schema.parse(formData);
    }
    return true;
  } catch {
    return false;
  }
};
```

---

## Troubleshooting

### Issue 1: TypeScript Errors on Field Names

**Problem:**
```typescript
// ❌ TypeScript error: Property 'nonExistentField' does not exist
handleInputChange('nonExistentField', 'value');
```

**Cause:** Field name doesn't match schema definition.

**Solution:** Ensure field names match schema exactly.

```typescript
const schema = z.object({
  title: z.string(), // ✅ Field is 'title', not 'Title' or 'name'
});

// ✅ Correct
handleInputChange('title', value);

// ❌ Wrong
handleInputChange('Title', value); // Case mismatch
handleInputChange('name', value);  // Field doesn't exist
```

---

### Issue 2: Error Not Clearing on Input

**Problem:** Error persists even after user types in field.

**Cause:** Using `setFieldValue` instead of `handleInputChange`.

**Solution:**
```typescript
// ❌ Wrong - doesn't clear errors
onChange={(e) => setFieldValue('title', e.target.value)}

// ✅ Correct - clears errors
onChange={(e) => handleInputChange('title', e.target.value)}
```

---

### Issue 3: Form Not Resetting on Close

**Problem:** Form retains old values when reopened.

**Cause:** `handleClose` not calling `resetForm()`.

**Solution:**
```typescript
// ❌ Wrong
const handleClose = () => {
  onClose();
};

// ✅ Correct
const handleClose = () => {
  resetForm(); // ✅ Clear form and errors
  onClose();
};
```

---

### Issue 4: Validation Passing with Invalid Data

**Problem:** `validateForm()` returns true even with invalid data.

**Cause:** Schema doesn't match form structure or is too permissive.

**Solution:** Ensure schema matches `initialData` structure exactly.

```typescript
// ❌ Wrong - schema doesn't match initialData
const schema = z.object({
  name: z.string().min(1), // Schema uses 'name'
});

const { formData } = useFormValidation(schema, {
  title: '', // ❌ initialData uses 'title'
});

// ✅ Correct - schema matches initialData
const schema = z.object({
  title: z.string().min(1), // ✅ Both use 'title'
});

const { formData } = useFormValidation(schema, {
  title: '',
});
```

---

### Issue 5: React Hook Dependency Warning

**Problem:**
```
React Hook useEffect has a missing dependency: 'setFormData'
```

**Cause:** Using `setFormData` in `useEffect` without including it in dependencies.

**Solution:**
```typescript
// ❌ Wrong - missing dependency
useEffect(() => {
  setFormData(prev => ({ ...prev, field: value }));
}, [isOpen, value]); // ❌ Missing setFormData

// ✅ Correct - include setFormData
useEffect(() => {
  setFormData(prev => ({ ...prev, field: value }));
}, [isOpen, value, setFormData]); // ✅ Complete dependencies
```

---

## Best Practices

### 1. Keep Schemas in Separate Files

**Good:**
```typescript
// /lib/validation/schemas/engagement.ts
export const createTopicSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  category: z.enum(['general', 'technical', 'business']),
});

// /components/AddTopicModal.tsx
import { createTopicSchema } from '@/lib/validation/schemas/engagement';
```

**Benefits:**
- Reusability across components
- Single source of truth for validation rules
- Easier to test
- Better organization

---

### 2. Use Type Inference from Schemas

**Good:**
```typescript
import { z } from 'zod';

const schema = z.object({
  title: z.string(),
  count: z.number(),
});

// ✅ Type inferred automatically from schema
type FormData = z.infer<typeof schema>;
// FormData = { title: string; count: number }

const { formData } = useFormValidation(schema, {
  title: '',
  count: 0,
});
// formData is fully typed as FormData
```

---

### 3. Provide Helpful Error Messages

**Good:**
```typescript
const schema = z.object({
  email: z.string()
    .min(1, 'Email is required')  // ✅ Clear message
    .email('Please enter a valid email address'), // ✅ Specific guidance

  password: z.string()
    .min(8, 'Password must be at least 8 characters') // ✅ Shows requirement
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'), // ✅ Specific rule
});
```

**Bad:**
```typescript
const schema = z.object({
  email: z.string().email(), // ❌ Generic Zod error: "Invalid email"
  password: z.string().min(8), // ❌ Generic: "String must contain at least 8 character(s)"
});
```

---

### 4. Use Conditional Validation with .superRefine()

**Good:**
```typescript
const schema = z.object({
  status: z.enum(['won', 'lost', 'active']),
  won_value: z.string().optional(),
  lost_reason: z.string().optional(),
}).superRefine((data, ctx) => {
  // ✅ Conditional validation in schema
  if (data.status === 'won' && !data.won_value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['won_value'],
      message: 'Won value is required when status is Won',
    });
  }

  if (data.status === 'lost' && !data.lost_reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lost_reason'],
      message: 'Lost reason is required when status is Lost',
    });
  }
});
```

**Bad:**
```typescript
// ❌ Don't validate conditionally in component
const handleSubmit = (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  // ❌ Bad - validation logic in component
  if (formData.status === 'won' && !formData.won_value) {
    toast.error('Won value is required');
    return;
  }
};
```

---

### 5. Always Call resetForm() in handleClose

**Good:**
```typescript
const handleClose = () => {
  resetForm(); // ✅ Always reset on close
  onClose();
};
```

**Why:** Prevents stale data from appearing when modal reopens.

---

### 6. Disable Submit Button During Loading

**Good:**
```typescript
<button
  type="submit"
  disabled={isLoading} // ✅ Prevent double-submit
>
  {isLoading ? 'Saving...' : 'Save'}
</button>
```

---

### 7. Show Field Errors Next to Inputs

**Good:**
```typescript
<div>
  <input
    value={formData.email}
    onChange={(e) => handleInputChange('email', e.target.value)}
    className={errors.email ? 'border-red-300' : 'border-gray-200'} // ✅ Visual feedback
  />
  {errors.email && (
    <p className="mt-1 text-xs text-red-600">{errors.email}</p> // ✅ Show error
  )}
</div>
```

---

### 8. Use Consistent Error Styling

**Good:**
```typescript
// Create reusable error component
const ErrorMessage = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-600">{error}</p>;
};

// Use consistently
<input onChange={(e) => handleInputChange('field', e.target.value)} />
<ErrorMessage error={errors.field} />
```

---

## Migration Checklist

Use this checklist when migrating existing modals:

- [ ] **Import Hook**
  ```typescript
  import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';
  ```

- [ ] **Move/Import Schema**
  - [ ] Schema exists in `/lib/validation/schemas/`
  - [ ] Schema imported into component

- [ ] **Replace State Management**
  - [ ] Remove `useState` for formData
  - [ ] Remove `useState` for errors
  - [ ] Remove `handleInputChange` function
  - [ ] Remove `validateForm` function
  - [ ] Remove `resetForm` function
  - [ ] Replace with `useFormValidation` hook call

- [ ] **Verify Form Submission**
  - [ ] `handleSubmit` calls `validateForm()`
  - [ ] Validation check happens before `execute()`
  - [ ] Form data uses `formData` from hook

- [ ] **Verify Form Reset**
  - [ ] `handleClose` calls `resetForm()`
  - [ ] `onSuccess` callback calls `resetForm()`

- [ ] **Update JSX**
  - [ ] All inputs use `formData.fieldName`
  - [ ] All `onChange` handlers use `handleInputChange('fieldName', value)`
  - [ ] All error displays use `errors.fieldName`
  - [ ] Error styling applied when `errors.fieldName` exists

- [ ] **Clean Up Imports**
  - [ ] Remove unused `useState` import if applicable
  - [ ] Remove unused `z` import if schema is external

- [ ] **Test**
  - [ ] Form validation works
  - [ ] Errors clear on input
  - [ ] Form resets on close
  - [ ] Form submits successfully

---

## Performance Considerations

### The Hook is Lightweight

- **No re-renders:** Only updates state when necessary
- **No memoization needed:** Functions are stable across renders
- **Minimal overhead:** ~120 lines of code, no external dependencies beyond Zod

### When to Avoid

- Forms with 50+ fields (consider splitting into steps)
- Forms re-rendering 100+ times per second (rare edge case)

---

## Comparison: Before vs After

### Code Reduction

| Modal | Before | After | Saved |
|-------|--------|-------|-------|
| AddTrialExtensionModal | 320 | 282 | 38 |
| AddEngagementLogModal | 365 | 327 | 38 |
| LogActivityModal | 280 | 235 | 45 |
| AddSupportQueryModal | 377 | 337 | 40 |
| UpdateDealStatusModal | 477 | 437 | 40 |
| AddFeatureRequestModal | 275 | 234 | 41 |
| AddFollowupModal | 316 | 272 | 44 |
| AddTopicModal | 266 | 225 | 41 |
| TrialHandoffModal | 253 | 213 | 40 |
| AddRoadmapItemModal | 354 | 312 | 42 |
| **Total** | **3,243** | **2,872** | **371** |

**Average reduction:** ~37 lines per modal (~14%)

### Maintainability Improvement

**Before:**
- Validation logic duplicated across 10+ modals
- Bug fixes require updating every modal
- Inconsistent error handling patterns

**After:**
- Single source of truth for validation logic
- Bug fixes update all modals automatically
- Guaranteed consistency across all forms

---

## FAQ

### Q: Can I use this with non-modal forms?

**A:** Yes! The hook works with any form component.

```typescript
function ProfileEditPage() {
  const { formData, errors, handleInputChange, validateForm } =
    useFormValidation(profileSchema, { name: '', email: '' });

  // Use just like in modals
}
```

---

### Q: Can I validate a single field instead of the whole form?

**A:** Yes, create a custom validation function:

```typescript
const { formData } = useFormValidation(schema, initialData);

const validateField = (fieldName: string): boolean => {
  try {
    const fieldSchema = schema.shape[fieldName]; // Get field-specific schema
    fieldSchema.parse(formData[fieldName]);
    return true;
  } catch {
    return false;
  }
};
```

---

### Q: How do I handle async validation (e.g., check if email exists)?

**A:** Use `.superRefine()` with async check before form submission:

```typescript
const schema = z.object({
  email: z.string().email(),
});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  // ✅ Async validation after sync validation passes
  const emailExists = await checkEmailExists(formData.email);
  if (emailExists) {
    toast.error('Email already exists');
    return;
  }

  // Proceed with submission
};
```

---

### Q: Can I use this with file uploads?

**A:** Yes, but handle files separately:

```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null);

const { formData, errors, handleInputChange, validateForm } =
  useFormValidation(schema, { title: '', description: '' });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  // Upload file separately
  if (selectedFile) {
    const fileUrl = await uploadFile(selectedFile);
    formData.file_url = fileUrl;
  }

  // Submit formData
};
```

---

## Summary

The `useFormValidation` hook provides:

✅ **Consistency** - Same pattern across all forms
✅ **Type Safety** - Full TypeScript support with schema inference
✅ **Less Code** - Eliminates ~50 lines of boilerplate per form
✅ **Better UX** - Real-time error clearing as users type
✅ **Maintainability** - Single source of truth for validation logic
✅ **Flexibility** - Works with simple and complex forms

**Use this hook for all new modal forms and consider migrating existing forms to reduce technical debt and improve code quality.**

---

## Additional Resources

- **Zod Documentation:** https://zod.dev/
- **Hook Source Code:** `/lib/validation/hooks/useFormValidation.ts`
- **Schema Examples:** `/lib/validation/schemas/`
- **Migrated Modals:** See `/components/*Modal.tsx` files
- **Migration Analysis:** Run `node scripts/analyze-migrated-modals.js`
- **Code Review:** See `/docs/code-review-phase1-phase2.md`

---

**Last Updated:** Phase 1 & 2 migrations complete (10 modals migrated)
**Maintained By:** Development Team
**Questions?** See troubleshooting section or review migrated modal examples.
