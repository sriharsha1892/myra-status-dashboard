'use client';

import { useState, useEffect } from 'react';

interface NavalLoadingBarProps {
  isLoading: boolean;
  context?: 'users' | 'trials' | 'data' | 'general';
}

/**
 * Loading progress bar with Naval Ravikant-style philosophical humor
 * "Patience is not passivity" - Naval
 */
export default function NavalLoadingBar({ isLoading, context = 'general' }: NavalLoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = getLoadingMessages(context);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setMessageIndex(0);
      return;
    }

    // Simulate progress (never quite reaches 100% until done)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev + 0.5; // Slow down near the end
        if (prev >= 70) return prev + 1;
        return prev + 2;
      });
    }, 200);

    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isLoading, messages.length]);

  // Complete the progress when loading finishes
  useEffect(() => {
    if (!isLoading && progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  }, [isLoading, progress]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      {/* Progress bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />

      {/* Message */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Spinning icon */}
            <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>

            {/* Rotating message */}
            <div key={messageIndex} className="animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="font-medium">{messages[messageIndex]}</span>
            </div>
          </div>

          {/* Progress percentage */}
          <div className="text-sm font-mono text-slate-300">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function getLoadingMessages(context: string): string[] {
  const baseMessages = [
    "Compounding your patience...",
    "Building leverage...",
    "Playing the long game...",
    "Seeking wealth, not status...",
    "Reading between the database rows...",
    "Specific knowledge loading...",
    "Productizing your request...",
    "Escape competition through loading...",
    "Arm candy delayed, soulmate data arriving...",
    "Desire is suffering (but your data isn't)...",
  ];

  const contextMessages = {
    users: [
      "Compounding user value...",
      "Building relationship leverage...",
      "Seeking talent, not resumes...",
      "Specific people loading...",
      "Play long-term games with these people...",
    ],
    trials: [
      "Compounding trial wisdom...",
      "Building product-market leverage...",
      "Validating specific knowledge...",
      "Long-term customers materializing...",
      "Productize, then scale...",
    ],
    data: [
      "Compounding insights...",
      "Mining specific knowledge...",
      "Leverage: database edition...",
      "Reading (your data)...",
      "Code is leverage. Data is fuel...",
    ],
    general: baseMessages,
  };

  return contextMessages[context as keyof typeof contextMessages] || baseMessages;
}
