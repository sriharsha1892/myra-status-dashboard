'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type ViewMode = 'user' | 'admin';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isAdminView: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>('user');

  // Load view mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('myra_view_mode') as ViewMode | null;
    if (saved === 'admin' || saved === 'user') {
      setViewModeState(saved);
    }
  }, []);

  // Save to localStorage when changed
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('myra_view_mode', mode);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isAdminView: viewMode === 'admin' }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
