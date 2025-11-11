'use client';

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { LoadingContext as LoadingContextType, LoadingSubContext, LoadingState, LoadingContextValue } from './types';
import { getSequentialLoadingMessage } from './loadingMessages';

// Create context with default values
const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
  rotationInterval?: number; // milliseconds between message rotation
}

export function LoadingProvider({ children, rotationInterval = 2500 }: LoadingProviderProps) {
  const [activeLoading, setActiveLoading] = useState<LoadingState[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [messageRotationKey, setMessageRotationKey] = useState(0);

  // Show loading state and return unique ID
  const showLoading = useCallback((context: LoadingContextType, subContext?: LoadingSubContext): string => {
    const id = `loading-${Date.now()}-${Math.random()}`;
    const newLoadingState: LoadingState = {
      id,
      context,
      subContext,
      startedAt: Date.now(),
    };

    setActiveLoading(prev => [...prev, newLoadingState]);

    // Set initial message
    const message = getSequentialLoadingMessage(context, subContext);
    setCurrentMessage(message);

    return id;
  }, []);

  // Hide loading state by ID
  const hideLoading = useCallback((id: string) => {
    setActiveLoading(prev => prev.filter(state => state.id !== id));
  }, []);

  // Check if any loading is active (optionally for specific context)
  const isLoading = useCallback((context?: LoadingContextType): boolean => {
    if (!context) {
      return activeLoading.length > 0;
    }
    return activeLoading.some(state => state.context === context);
  }, [activeLoading]);

  // Rotate messages for active loading states
  useEffect(() => {
    if (activeLoading.length === 0) {
      setCurrentMessage('');
      return;
    }

    // Get the most recent loading state for message rotation
    const latestLoading = activeLoading[activeLoading.length - 1];

    // Set initial message
    const initialMessage = getSequentialLoadingMessage(
      latestLoading.context,
      latestLoading.subContext
    );
    setCurrentMessage(initialMessage);

    // Rotate messages
    const interval = setInterval(() => {
      if (activeLoading.length > 0) {
        const currentLoading = activeLoading[activeLoading.length - 1];
        const message = getSequentialLoadingMessage(
          currentLoading.context,
          currentLoading.subContext
        );
        setCurrentMessage(message);
        setMessageRotationKey(prev => prev + 1);
      }
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [activeLoading, rotationInterval]);

  const value: LoadingContextValue = {
    activeLoading,
    currentMessage,
    showLoading,
    hideLoading,
    isLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

// Custom hook to use loading context
export function useLoadingContext(): LoadingContextValue {
  const context = React.useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
}

export { LoadingContext };
