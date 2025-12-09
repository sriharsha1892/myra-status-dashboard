/**
 * Keyboard navigation hook for Enrichment UI
 * Supports arrow keys, number shortcuts, Enter/Escape
 */

import { useEffect, useCallback } from 'react';

interface UseKeyboardNavOptions {
  questionCount: number;
  currentIndex: number;
  choiceCount: number;
  selectedChoiceIndex: number;
  isEnabled: boolean;
  onNavigate: (index: number) => void;
  onChoiceSelect: (index: number) => void;
  onConfirm: () => void;
  onSkip: () => void;
}

export function useKeyboardNav({
  questionCount,
  currentIndex,
  choiceCount,
  selectedChoiceIndex,
  isEnabled,
  onNavigate,
  onChoiceSelect,
  onConfirm,
  onSkip,
}: UseKeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEnabled) return;

      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        // Question navigation (vertical)
        case 'ArrowUp':
        case 'k': // vim-style
          e.preventDefault();
          onNavigate(Math.max(0, currentIndex - 1));
          break;

        case 'ArrowDown':
        case 'j': // vim-style
          e.preventDefault();
          onNavigate(Math.min(questionCount - 1, currentIndex + 1));
          break;

        // Choice navigation (horizontal)
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          if (choiceCount > 0) {
            const newIndex = selectedChoiceIndex <= 0 ? choiceCount - 1 : selectedChoiceIndex - 1;
            onChoiceSelect(newIndex);
          }
          break;

        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (choiceCount > 0) {
            onChoiceSelect((selectedChoiceIndex + 1) % choiceCount);
          }
          break;

        // Number shortcuts for direct choice selection (1-4)
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          const choiceNum = parseInt(e.key) - 1;
          if (choiceNum < choiceCount) {
            onChoiceSelect(choiceNum);
          }
          break;

        // Confirm action
        case 'Enter':
          if (selectedChoiceIndex >= 0) {
            e.preventDefault();
            onConfirm();
          }
          break;

        // Skip shortcut
        case 's':
          e.preventDefault();
          onSkip();
          break;

        // Clear selection
        case 'Escape':
          e.preventDefault();
          onChoiceSelect(-1);
          break;
      }
    },
    [
      isEnabled,
      questionCount,
      currentIndex,
      choiceCount,
      selectedChoiceIndex,
      onNavigate,
      onChoiceSelect,
      onConfirm,
      onSkip,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardNav;
