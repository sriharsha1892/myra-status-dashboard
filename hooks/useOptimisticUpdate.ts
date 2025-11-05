import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface OptimisticUpdateOptions<T> {
  onUpdate: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook for optimistic UI updates with automatic rollback on error
 *
 * Usage:
 * const { update, isUpdating } = useOptimisticUpdate({
 *   onUpdate: async (newValue) => {
 *     await supabase.from('table').update({ field: newValue })
 *   },
 *   successMessage: 'Updated successfully'
 * });
 *
 * // In your component:
 * <select
 *   value={status}
 *   onChange={(e) => {
 *     const newValue = e.target.value;
 *     setStatus(newValue); // Optimistic update
 *     update(newValue); // API call with auto-rollback
 *   }}
 * />
 */
export function useOptimisticUpdate<T>(options: OptimisticUpdateOptions<T>) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSuccessfulValue, setLastSuccessfulValue] = useState<T | null>(null);

  const update = useCallback(async (newValue: T, rollbackValue?: T) => {
    setIsUpdating(true);

    try {
      // Call the update function
      await options.onUpdate(newValue);

      // Store successful value for potential future rollbacks
      setLastSuccessfulValue(newValue);

      // Show success message
      if (options.successMessage) {
        toast.success(options.successMessage, {
          duration: 2000,
          icon: '✓',
          style: {
            background: '#10B981',
            color: '#fff',
          },
        });
      }

      // Call success callback
      options.onSuccess?.();
    } catch (error) {
      console.error('Optimistic update failed:', error);

      // Show error message
      const errorMsg = options.errorMessage || 'Update failed';
      toast.error(errorMsg, {
        duration: 3000,
        icon: '✕',
      });

      // Call error callback (this should handle rollback in the component)
      options.onError?.(error as Error);

      // Return rollback value if provided
      return rollbackValue || lastSuccessfulValue;
    } finally {
      setIsUpdating(false);
    }
  }, [options, lastSuccessfulValue]);

  return {
    update,
    isUpdating,
  };
}

/**
 * Hook for managing optimistic state with automatic rollback
 *
 * Usage:
 * const [status, setStatus, { isUpdating }] = useOptimisticState(
 *   initialStatus,
 *   async (newStatus) => {
 *     await supabase.from('table').update({ status: newStatus })
 *   },
 *   { successMessage: 'Status updated' }
 * );
 *
 * // Status changes are instant, with automatic rollback on error
 * <select value={status} onChange={(e) => setStatus(e.target.value)}>
 */
export function useOptimisticState<T>(
  initialValue: T,
  onUpdate: (value: T) => Promise<void>,
  options?: Omit<OptimisticUpdateOptions<T>, 'onUpdate'>
) {
  const [value, setValue] = useState<T>(initialValue);
  const [previousValue, setPreviousValue] = useState<T>(initialValue);

  const { update, isUpdating } = useOptimisticUpdate<T>({
    onUpdate,
    onError: (error) => {
      // Rollback to previous value on error
      setValue(previousValue);
      options?.onError?.(error);
    },
    ...options,
  });

  const setOptimisticValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      // Store previous value for rollback
      setPreviousValue(prev);

      // Calculate new value
      const computed = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue;

      // Trigger async update
      update(computed, prev);

      // Return new value immediately (optimistic)
      return computed;
    });
  }, [update]);

  return [value, setOptimisticValue, { isUpdating }] as const;
}
