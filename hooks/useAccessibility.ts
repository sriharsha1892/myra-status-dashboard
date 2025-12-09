/**
 * Accessibility Utilities
 *
 * Provides hooks and utilities for WCAG 2.1 AA compliance:
 * - Focus trap for modals
 * - Aria-live announcements for dynamic content
 * - Keyboard navigation helpers
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Focus Trap Hook
 * Traps focus within a container (useful for modals)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previous element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Aria Live Announcer
 * Creates screen reader announcements for dynamic content
 */
class AriaLiveAnnouncer {
  private static instance: AriaLiveAnnouncer;
  private container: HTMLDivElement | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.container = document.createElement('div');
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      this.container.setAttribute('role', 'status');
      this.container.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(this.container);
    }
  }

  static getInstance(): AriaLiveAnnouncer {
    if (!AriaLiveAnnouncer.instance) {
      AriaLiveAnnouncer.instance = new AriaLiveAnnouncer();
    }
    return AriaLiveAnnouncer.instance;
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.container) return;

    this.container.setAttribute('aria-live', priority);
    // Clear and set to trigger announcement
    this.container.textContent = '';
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.textContent = message;
      }
    });
  }
}

/**
 * Hook for aria-live announcements
 */
export function useAriaLive() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    AriaLiveAnnouncer.getInstance().announce(message, priority);
  }, []);

  return { announce };
}

/**
 * Hook for escape key handling (useful for modals)
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}

/**
 * Hook for keyboard list navigation
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    onSelect?: (index: number) => void;
    loop?: boolean;
    orientation?: 'vertical' | 'horizontal';
  } = {}
) {
  const { onSelect, loop = true, orientation = 'vertical' } = options;
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

    if (e.key === prevKey) {
      e.preventDefault();
      if (currentIndex.current > 0) {
        currentIndex.current--;
      } else if (loop) {
        currentIndex.current = items.length - 1;
      }
      items[currentIndex.current]?.focus();
    } else if (e.key === nextKey) {
      e.preventDefault();
      if (currentIndex.current < items.length - 1) {
        currentIndex.current++;
      } else if (loop) {
        currentIndex.current = 0;
      }
      items[currentIndex.current]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(currentIndex.current);
    }
  }, [items, loop, orientation, onSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    currentIndex: currentIndex.current,
    setCurrentIndex: (index: number) => { currentIndex.current = index; },
  };
}

/**
 * Screen reader only text component helper
 */
export const srOnly = {
  className: 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
  style: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: 0,
  },
};
