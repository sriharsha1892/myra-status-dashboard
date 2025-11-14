# Loading Components

This directory contains all loading-related UI components for consistent loading states across the application.

## Components Overview

### 1. UnifiedLoader (Recommended for most use cases)

**File:** `components/UnifiedLoader.tsx`

A versatile, unified loading component with multiple variants for different use cases.

#### Variants

- **fullscreen**: Full page overlay with rotating quotes (for page navigation)
- **page**: Page section loading (for within page containers)
- **inline**: Inline spinner with message (for component loading)
- **small**: Small spinner only (for buttons/small UI elements)

#### Usage Examples

```tsx
import { UnifiedLoader } from '@/components/loading';

// Full-screen page loading with quotes
<UnifiedLoader variant="fullscreen" showQuotes />

// Page section loading
<UnifiedLoader variant="page" message="Loading dashboard data..." />

// Inline component loading
<UnifiedLoader variant="inline" message="Fetching organizations..." color="accent" />

// Small button spinner
<button disabled>
  <UnifiedLoader variant="small" color="blue" />
  <span className="ml-2">Processing...</span>
</button>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'fullscreen' \| 'page' \| 'inline' \| 'small' | 'inline' | Loading size variant |
| message | string | undefined | Custom message (overrides quotes) |
| showQuotes | boolean | true | Show inspirational quotes |
| className | string | '' | Additional CSS classes |
| color | 'blue' \| 'accent' \| 'success' \| 'warning' \| 'error' | 'blue' | Color theme |

---

### 2. LoadingOverlay

**File:** `components/loading/LoadingOverlay.tsx`

Full-screen loading overlay with Framer Motion animations. Uses LoadingContext for centralized state management.

#### Usage

```tsx
import { LoadingOverlay } from '@/components/loading';
import { useLoadingContext } from '@/lib/loading';

function MyPage() {
  const { isLoading } = useLoadingContext();

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return <div>Page content</div>;
}
```

---

### 3. ChartContainer

**File:** `components/loading/ChartContainer.tsx`

Wrapper component for charts that handles loading states with contextual messages.

#### Usage

```tsx
import { ChartContainer } from '@/components/loading';

<ChartContainer loading={!data} chartType="barChart">
  <BarChart data={data} />
</ChartContainer>
```

---

### 4. NavalLoadingBar

**File:** `components/NavalLoadingBar.tsx`

Top progress bar with philosophical quotes from Naval Ravikant, Steve Jobs, etc.

#### Usage

```tsx
import NavalLoadingBar from '@/components/NavalLoadingBar';

<NavalLoadingBar isLoading={isLoading} context="trials" />
```

#### Contexts

- `users`: User-related loading messages
- `trials`: Trial organization messages
- `data`: Data fetching messages
- `general`: General loading messages

---

### 5. SkeletonLoader

**File:** `components/SkeletonLoader.tsx`

Skeleton loading components for different UI elements.

#### Components

- `SkeletonCard`: Card skeleton with pulse animation
- `SkeletonTable`: Table row skeletons
- `SkeletonHeader`: Header skeleton

#### Usage

```tsx
import { SkeletonCard, SkeletonTable } from '@/components/SkeletonLoader';

{loading ? (
  <div className="grid grid-cols-3 gap-4">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
) : (
  <CardGrid data={data} />
)}
```

---

## When to Use Which Component

### Use **UnifiedLoader**:
- ✅ Page-level loading (fullscreen variant)
- ✅ Section/container loading (page variant)
- ✅ Component-level loading (inline variant)
- ✅ Button/small UI loading (small variant)
- ✅ When you need color theming
- ✅ When you want inspirational quotes

### Use **LoadingOverlay**:
- ✅ When using centralized LoadingContext
- ✅ Complex loading orchestration across components
- ✅ When you need Framer Motion animations

### Use **ChartContainer**:
- ✅ Wrapping chart components
- ✅ Data visualization loading states
- ✅ When you need chart-specific loading messages

### Use **NavalLoadingBar**:
- ✅ Top progress bar during navigation
- ✅ Long-running operations with progress
- ✅ When you want contextual philosophical messages

### Use **SkeletonLoader**:
- ✅ Content placeholder while loading
- ✅ Preventing layout shift
- ✅ List/grid loading states
- ✅ Progressive content reveal

---

## Best Practices

### 1. Consistent Loading Experience

Use the same loading component type throughout a feature:

```tsx
// ✅ Good - Consistent
function TrialsPage() {
  if (loading) return <UnifiedLoader variant="page" />;
  return <TrialsList />;
}

// ❌ Bad - Inconsistent
function TrialsPage() {
  if (loading) return <div className="spinner" />; // Custom spinner
  return <TrialsList />;
}
```

### 2. Contextual Messages

Provide context-specific loading messages:

```tsx
// ✅ Good - Specific context
<UnifiedLoader
  variant="inline"
  message="Calculating engagement scores..."
/>

// ⚠️ Okay - Generic
<UnifiedLoader variant="inline" message="Loading..." />
```

### 3. Skeleton for Content, Spinner for Actions

```tsx
// ✅ Good - Skeleton for content placeholder
{loading ? <SkeletonTable /> : <DataTable data={data} />}

// ✅ Good - Spinner for user-initiated action
<button onClick={handleSave}>
  {saving && <UnifiedLoader variant="small" />}
  Save Changes
</button>
```

### 4. Color Coding

Use appropriate colors for different states:

```tsx
// Success operation
<UnifiedLoader variant="small" color="success" />

// Warning state
<UnifiedLoader variant="small" color="warning" />

// Error retry
<UnifiedLoader variant="small" color="error" />
```

---

## Migration Guide

If you're currently using custom loading spinners, migrate to UnifiedLoader:

### Before:
```tsx
{loading && (
  <div className="flex justify-center py-8">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
)}
```

### After:
```tsx
import { UnifiedLoader } from '@/components/loading';

{loading && <UnifiedLoader variant="inline" />}
```

---

## Contributing

When adding new loading patterns:

1. Consider if it can be a variant of UnifiedLoader
2. If truly unique, create a new component in `components/loading/`
3. Export it from `components/loading/index.ts`
4. Document it in this README
5. Add usage examples
