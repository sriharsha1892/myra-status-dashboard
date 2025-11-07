import React from 'react';

const LOADING_QUOTES = [
  {
    text: "If something is important enough, you should try, even if the probable outcome is failure.",
    author: "Elon Musk"
  },
  {
    text: "Seek wealth, not money or status. Wealth is assets that earn while you sleep.",
    author: "Naval Ravikant"
  },
  {
    text: "Competition is for losers. If you want to create value, build a monopoly.",
    author: "Peter Thiel"
  },
  {
    text: "The best way to predict the future is to invent it.",
    author: "Alan Kay"
  },
  {
    text: "Product-market fit is everything. Nothing else matters until you have it.",
    author: "Marc Andreessen"
  },
  {
    text: "Specific knowledge is found by pursuing your genuine curiosity and your innate talents.",
    author: "Naval Ravikant"
  },
  {
    text: "The biggest risk is not taking any risk. In a world that's changing quickly, the only strategy that is guaranteed to fail is not taking risks.",
    author: "Mark Zuckerberg"
  },
  {
    text: "Work like a lion, not like a cow. Lions hunt, feast, then rest. Cows graze all day.",
    author: "Naval Ravikant"
  },
  {
    text: "When something is important enough, you do it even if the odds are not in your favor.",
    author: "Elon Musk"
  },
  {
    text: "The most contrarian thing of all is not to oppose the crowd but to think for yourself.",
    author: "Peter Thiel"
  },
  {
    text: "You want to be rich and anonymous, not poor and famous.",
    author: "Naval Ravikant"
  },
  {
    text: "I think it's very important to have a feedback loop, where you're constantly thinking about what you've done and how you could be doing it better.",
    author: "Elon Musk"
  },
  {
    text: "Escape competition through authenticity. No one can compete with you on being you.",
    author: "Naval Ravikant"
  },
  {
    text: "The next Bill Gates will not build an operating system. The next Larry Page won't make a search engine. If you are copying these guys, you aren't learning from them.",
    author: "Peter Thiel"
  },
  {
    text: "Patience is not waiting passively, it's persistence.",
    author: "Naval Ravikant"
  },
  {
    text: "Your margin is my opportunity.",
    author: "Jeff Bezos"
  },
  {
    text: "We see our customers as invited guests to a party, and we are the hosts. It's our job every day to make every important aspect of the customer experience a little bit better.",
    author: "Jeff Bezos"
  },
  {
    text: "If you're not stubborn, you'll give up on experiments too soon. And if you're not flexible, you'll pound your head against the wall and you won't see a different solution to a problem you're trying to solve.",
    author: "Jeff Bezos"
  },
  {
    text: "Someone's sitting in the shade today because someone planted a tree a long time ago.",
    author: "Warren Buffett"
  },
  {
    text: "The most important investment you can make is in yourself.",
    author: "Warren Buffett"
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett"
  },
  {
    text: "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
    author: "Warren Buffett"
  },
  {
    text: "The difference between successful people and really successful people is that really successful people say no to almost everything.",
    author: "Warren Buffett"
  },
];

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingState({ message = "Loading...", fullScreen = true }: LoadingStateProps) {
  const randomQuote = React.useMemo(
    () => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)],
    []
  );

  const content = (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      {/* Animated spinner with glassmorphism */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />
      </div>

      {/* Loading message */}
      <p className="text-sm text-gray-600 font-medium tracking-tight animate-pulse">
        {message}
      </p>

      {/* Inspirational quote card with glassmorphism */}
      <div className="max-w-md mt-4 p-6 rounded-2xl backdrop-blur-xl bg-white/60 border border-white/40 shadow-xl">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-900 font-medium leading-relaxed">
            "{randomQuote.text}"
          </p>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            <p className="text-xs text-gray-600 font-semibold">— {randomQuote.author}</p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          </div>
        </div>

        {/* Subtle animated background */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-100/50 via-purple-100/30 to-pink-100/50 opacity-0 hover:opacity-100 transition-opacity duration-500 -z-10" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

// Inline loading spinner for smaller components
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div className={`rounded-full border-gray-300 border-t-blue-500 animate-spin ${sizeClasses[size]}`} />
    </div>
  );
}
