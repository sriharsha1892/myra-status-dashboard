'use client';

import { useOptimisticState } from '@/hooks/useOptimisticUpdate';
import { motion, AnimatePresence } from 'framer-motion';

interface OptimisticSelectProps {
  value: string;
  options: { value: string; label: string; color?: string }[];
  onUpdate: (value: string) => Promise<void>;
  successMessage?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Select component with optimistic updates and smooth animations
 *
 * Changes appear instantly with a subtle animation, and automatically
 * revert if the API call fails.
 */
export default function OptimisticSelect({
  value: initialValue,
  options,
  onUpdate,
  successMessage,
  className = '',
  disabled = false,
}: OptimisticSelectProps) {
  const [value, setValue, { isUpdating }] = useOptimisticState(
    initialValue,
    onUpdate,
    { successMessage }
  );

  const currentOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <motion.select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || isUpdating}
        className={`
          ${className}
          transition-all duration-200
          ${isUpdating ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
          disabled:cursor-not-allowed
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        `}
        whileTap={{ scale: 0.98 }}
        style={{
          backgroundColor: currentOption?.color ? `${currentOption.color}10` : undefined,
          borderColor: currentOption?.color || undefined,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </motion.select>

      {/* Loading indicator */}
      <AnimatePresence>
        {isUpdating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
