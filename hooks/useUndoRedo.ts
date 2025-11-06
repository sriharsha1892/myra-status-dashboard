import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UndoableAction<T> {
  do: () => Promise<void> | void;
  undo: () => Promise<void> | void;
  description: string;
  navalQuote?: string; // Optional Naval-style wisdom
}

/**
 * Undo/Redo system with Naval-style toast messages
 * "The obstacle is the way" - but we'll give you a way back too
 */
export function useUndoRedo<T>() {
  const [history, setHistory] = useState<UndoableAction<T>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const execute = useCallback(async (action: UndoableAction<T>) => {
    try {
      await action.do();

      // Add to history, removing any "future" actions if we're in the middle
      const newHistory = history.slice(0, currentIndex + 1);
      newHistory.push(action);
      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);

      // Naval-style success message
      const navalWisdom = action.navalQuote || getRandomNavalQuote();
      toast.success(
        <div>
          <div className="font-semibold">{action.description}</div>
          <div className="text-xs opacity-75 mt-1 italic">"{navalWisdom}"</div>
        </div>,
        { duration: 3500 }
      );
    } catch (error) {
      toast.error(`Failed: ${action.description}`);
      throw error;
    }
  }, [history, currentIndex]);

  const undo = useCallback(async () => {
    if (currentIndex < 0) {
      toast('Nothing to undo. Start is the best place to be.', { icon: '🧘' });
      return;
    }

    const action = history[currentIndex];
    try {
      await action.undo();
      setCurrentIndex(currentIndex - 1);

      toast(
        <div>
          <div className="font-semibold">Undid: {action.description}</div>
          <div className="text-xs opacity-75 mt-1 italic">"The obstacle was the undo button"</div>
        </div>,
        { icon: '↩️', duration: 3000 }
      );
    } catch (error) {
      toast.error('Undo failed. Acceptance is key.');
      throw error;
    }
  }, [history, currentIndex]);

  const redo = useCallback(async () => {
    if (currentIndex >= history.length - 1) {
      toast('Nothing to redo. The present is all we have.', { icon: '🧘' });
      return;
    }

    const action = history[currentIndex + 1];
    try {
      await action.do();
      setCurrentIndex(currentIndex + 1);

      toast(
        <div>
          <div className="font-semibold">Redid: {action.description}</div>
          <div className="text-xs opacity-75 mt-1 italic">"Play it again, Sam"</div>
        </div>,
        { icon: '↪️', duration: 3000 }
      );
    } catch (error) {
      toast.error('Redo failed. Let go and move forward.');
      throw error;
    }
  }, [history, currentIndex]);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    execute,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
  };
}

// Naval Ravikant-style quotes for success messages
function getRandomNavalQuote(): string {
  const quotes = [
    "Compounding works",
    "Specific knowledge applied",
    "Leverage achieved",
    "Status: irrelevant. Results: obtained",
    "Desire created, desire fulfilled",
    "The obstacle was the button",
    "Long-term game: played",
    "Wealth created (in data)",
    "Accountability: accepted",
    "Arm candy is the enemy of soulmate",
    "Reading works",
    "Productize yourself",
    "Code is leverage",
    "Escape competition through authenticity",
    "Build, then sell",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}
