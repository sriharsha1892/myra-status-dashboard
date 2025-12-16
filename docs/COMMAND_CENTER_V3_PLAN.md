# Command Center V3 - Flexible Command Flow

## Overview

Transform the rigid one-shot parsing flow into an intelligent, user-correctable system.

---

## Architecture Changes

### 1. Smart Field Normalization Layer

**Location**: `lib/command/fieldNormalizer.ts`

```typescript
// Normalize synonyms and aliases before action execution
const FIELD_ALIASES = {
  // Value fields
  'contract_value': 'deal_value',
  'price': 'deal_value',
  'amount': 'deal_value',
  'value': 'deal_value',

  // Status fields
  'closed': 'won',
  'signed': 'won',
  'converted': 'won',
  'churned': 'lost',
  'cancelled': 'lost',

  // Action synonyms
  'remove': 'delete',
  'trash': 'delete',
  'add': 'create',
};

// Normalize parsed fields before passing to action
export function normalizeFields(parsed: ParsedCommand): ParsedCommand {
  // Map field names to canonical versions
  // Handle value conversions (76000 vs "76K" vs "$76,000")
}
```

**Benefits**:
- Works transparently with existing code
- No UI changes needed
- Immediate improvement

---

### 2. Editable Action Preview

**Location**: `components/command/v2/EditableActionPreview.tsx`

```
┌─────────────────────────────────────────────────────────┐
│ [DollarSign] Update Deal                    [92% conf]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Organization:  [Cereal Docks      ▼]  ← dropdown       │
│                                                         │
│  Deal Status:   [won ▼]  ← editable dropdown            │
│                                                         │
│  Deal Value:    [$76,000_____]  ← editable input        │
│                                                         │
│              [✓ Confirm]  [✗ Skip]  [? Wrong action?]   │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Inline editing of extracted fields
- Org/user dropdowns with search
- "Wrong action?" button to switch action type
- Real-time validation

**Implementation**:
```typescript
interface EditableField {
  name: string;
  type: 'text' | 'number' | 'dropdown' | 'org' | 'user';
  value: any;
  options?: string[];  // For dropdowns
  onChange: (value: any) => void;
}

// Each action defines its editable fields
const ACTION_FIELDS: Record<CommandAction, EditableField[]> = {
  UPDATE_DEAL: [
    { name: 'org', type: 'org', ... },
    { name: 'deal_status', type: 'dropdown', options: ['won', 'lost', 'negotiating', ...] },
    { name: 'deal_value', type: 'number', ... },
  ],
  // ...
};
```

---

### 3. Multi-turn Clarification System

**Location**: `lib/command/clarificationEngine.ts`

When confidence < 70% or ambiguity detected:

```
User: "Update Cereal Docks as won"

AI: I understood this as UPDATE_DEAL for Cereal Docks.

    ┌─────────────────────────────────────────────┐
    │ What would you like to update?              │
    │                                             │
    │ ○ Deal status to "won"                      │
    │ ○ Stage to "customer" (trial converted)    │
    │ ○ Both - won deal AND became customer       │
    │                                             │
    │ Deal value: [____________] (optional)       │
    └─────────────────────────────────────────────┘
```

**Implementation**:
```typescript
interface ClarificationQuestion {
  id: string;
  question: string;
  options: ClarificationOption[];
  allowFreeText?: boolean;
  freeTextPlaceholder?: string;
}

interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  resultingFields: Partial<ParsedCommand['fields']>;
}

// Generate clarification questions based on ambiguity
function generateClarifications(parsed: ParsedCommand): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  // Ambiguous action (won = UPDATE_DEAL or UPDATE_STAGE?)
  if (parsed.fields.deal_status === 'won' && !parsed.fields.deal_value) {
    questions.push({
      id: 'clarify_won',
      question: 'What should be updated?',
      options: [
        { id: 'deal', label: 'Deal status only', resultingFields: { deal_status: 'won' } },
        { id: 'stage', label: 'Stage to customer', resultingFields: { lifecycle_stage: 'customer' } },
        { id: 'both', label: 'Both deal and stage', resultingFields: { ... } },
      ],
      allowFreeText: true,
      freeTextPlaceholder: 'Enter deal value (optional)',
    });
  }

  return questions;
}
```

---

### 4. Conversation State Machine

**Location**: `lib/command/conversationStateMachine.ts`

```
States:
  IDLE → PARSING → PREVIEW → CLARIFYING → EXECUTING → DONE
                     ↓           ↑
                   EDITING ──────┘

Transitions:
  - User input → PARSING
  - Parse complete (high confidence) → PREVIEW
  - Parse complete (low confidence) → CLARIFYING
  - User clicks field → EDITING
  - User answers clarification → reparse → PREVIEW
  - User confirms → EXECUTING
  - Execution complete → DONE (with undo option)
```

```typescript
interface ConversationState {
  phase: 'idle' | 'parsing' | 'preview' | 'clarifying' | 'editing' | 'executing' | 'done';
  originalInput: string;
  parsedCommand: ParsedCommand | null;
  clarifications: ClarificationQuestion[];
  userAnswers: Record<string, any>;
  editedFields: Partial<ParsedCommand['fields']>;
  executionResult: ExecutionResult | null;
}
```

---

## Implementation Order

### Phase 1: Field Normalization (Low effort, immediate impact)
1. Create `lib/command/fieldNormalizer.ts`
2. Add field alias mappings
3. Integrate into action executor
4. Add value parsing (76000, "76K", "$76,000" → 76000)

### Phase 2: Editable Preview (Medium effort)
1. Create `EditableActionPreview.tsx` component
2. Define editable fields per action type
3. Add org/user search dropdowns
4. Add "Wrong action?" flow
5. Wire up field changes to confirmation

### Phase 3: Clarification Engine (Higher effort)
1. Create `clarificationEngine.ts`
2. Define ambiguity detection rules
3. Create clarification UI component
4. Integrate with conversation flow
5. Add "remember my preference" option

### Phase 4: State Machine (Tie it together)
1. Refactor `useConversation` hook
2. Implement state machine
3. Add undo/redo for edits
4. Add keyboard shortcuts

---

## Quick Wins (Implement First)

### 1. Field Normalizer (30 min)
```typescript
// lib/command/fieldNormalizer.ts
export function normalizeFields(fields: Record<string, any>): Record<string, any> {
  const normalized = { ...fields };

  // contract_value → deal_value
  if (normalized.contract_value !== undefined && normalized.deal_value === undefined) {
    normalized.deal_value = normalized.contract_value;
    delete normalized.contract_value;
  }

  // Parse string values to numbers
  if (typeof normalized.deal_value === 'string') {
    normalized.deal_value = parseMoneyValue(normalized.deal_value);
  }

  return normalized;
}
```

### 2. Add "Wrong action?" button (15 min)
Add to ActionPreview:
```tsx
<button onClick={() => setShowActionPicker(true)}>
  Wrong action?
</button>

{showActionPicker && (
  <ActionPicker
    currentAction={action.action}
    onSelect={(newAction) => {
      // Re-parse with forced action type
      onChangeAction(newAction);
    }}
  />
)}
```

---

## Success Metrics

- **Reduced rejections**: Track how often users reject actions
- **Edit frequency**: How often users edit extracted fields
- **Clarification completion**: Do users answer or abandon?
- **Time to confirm**: Faster with editable preview?
