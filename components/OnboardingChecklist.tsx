'use client';

import { useState, useEffect } from 'react';
import { Check, X, Rocket, TrendingUp, Sparkles } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

const STORAGE_KEY = 'myra_onboarding_checklist';

const initialItems: ChecklistItem[] = [
  {
    id: 'update_trial',
    label: 'Update a trial status',
    description: 'Ship your first trial update',
    completed: false,
  },
  {
    id: 'explore_resources',
    label: 'Explore Resources & Q&A',
    description: 'Scale your knowledge',
    completed: false,
  },
  {
    id: 'post_discussion',
    label: 'Post to team discussions',
    description: 'Share growth insights',
    completed: false,
  },
  {
    id: 'check_dashboard',
    label: 'Check dashboard metrics',
    description: 'Track your momentum',
    completed: false,
  },
];

const progressQuotes = [
  "Let's ship this 🚀",
  "Momentum building 📈",
  "Almost there! Keep shipping 🔥",
  "Done > Perfect. You shipped it! 🎉",
];

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.dismissed) {
        setIsDismissed(true);
      } else if (data.items) {
        setItems(data.items);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, dismissed: isDismissed }));
    }
  }, [items, isDismissed, isLoaded]);

  // Check for completion
  useEffect(() => {
    const completedCount = items.filter(item => item.completed).length;
    if (completedCount === items.length && !showCelebration) {
      setShowCelebration(true);
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setIsDismissed(true);
      }, 3000);
    }
  }, [items, showCelebration]);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (isDismissed || !isLoaded) return null;

  const completedCount = items.filter(item => item.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);
  const currentQuote = progressQuotes[completedCount] || progressQuotes[0];

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden backdrop-blur-sm bg-gradient-to-br from-white/90 to-blue-50/50 border border-blue-200/50 shadow-xl p-6">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Get Started</h3>
            <p className="text-xs text-gray-600">{completedCount}/{items.length} Complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>

        {/* Checklist items */}
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/60 transition-all group text-left"
            >
              {/* Checkbox */}
              <div className={`
                mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                ${item.completed
                  ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-600'
                  : 'border-gray-300 group-hover:border-blue-400'
                }
              `}>
                {item.completed && (
                  <Check className="w-3.5 h-3.5 text-white animate-[scale-in_0.3s_ease-out]" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p className={`text-sm font-medium transition-all ${
                  item.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}>
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer quote */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <p className="text-xs text-blue-600 italic font-medium">{currentQuote}</p>
        </div>
      </div>
    </>
  );
}
