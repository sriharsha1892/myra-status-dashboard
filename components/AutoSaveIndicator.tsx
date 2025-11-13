import { Check, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

type SaveState = 'idle' | 'saving' | 'saved';

const savingMessages = [
  "Shipping changes...",
  "Scaling update...",
  "Executing save...",
  "Growth tracking...",
];

const savedMessages = [
  "Saved ✓",
  "Shipped ✓",
  "Growth tracked ✓",
  "Executed ✓",
];

interface AutoSaveIndicatorProps {
  state: SaveState;
  className?: string;
}

export function AutoSaveIndicator({ state, className = '' }: AutoSaveIndicatorProps) {
  const [savingMsg] = useState(() => savingMessages[Math.floor(Math.random() * savingMessages.length)]);
  const [savedMsg] = useState(() => savedMessages[Math.floor(Math.random() * savedMessages.length)]);
  const [showSparkle, setShowSparkle] = useState(false);

  useEffect(() => {
    if (state === 'saved') {
      setShowSparkle(true);
      const timer = setTimeout(() => setShowSparkle(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (state === 'idle') return null;

  return (
    <div className={`flex items-center gap-2 text-sm transition-all duration-300 ${className}`}>
      {state === 'saving' && (
        <>
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-blue-600 italic animate-pulse">{savingMsg}</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <div className="relative">
            <Check className="w-4 h-4 text-green-600 animate-[scale-in_0.3s_ease-out]" />
            {showSparkle && (
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-ping" />
            )}
          </div>
          <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent font-medium animate-[fade-in_0.3s_ease-out]">
            {savedMsg}
          </span>
        </>
      )}
    </div>
  );
}

// Add these keyframes to your global CSS or tailwind.config.js:
// @keyframes scale-in {
//   0% { transform: scale(0); }
//   50% { transform: scale(1.2); }
//   100% { transform: scale(1); }
// }
// @keyframes fade-in {
//   0% { opacity: 0; }
//   100% { opacity: 1; }
// }
