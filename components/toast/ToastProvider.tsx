'use client';

/**
 * Toast Provider Component
 * Wraps react-hot-toast Toaster with custom configuration
 * Includes WCAG 2.1 AA accessibility features
 */

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName="toast-container"
      // Accessibility: role="status" and aria-live for screen readers
      containerStyle={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
      }}
      // Add accessibility attributes to toast container
      containerAriaLabel="Notifications"
      toastOptions={{
        // Default options for all toasts
        className: '',
        duration: 5000,
        style: {
          background: '#ffffff',
          color: '#0f172a',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '2px solid #cbd5e1',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          fontWeight: '500',
        },

        // Default options by type
        success: {
          duration: 5000,
          style: {
            background: '#f0fdf4',
            border: '2px solid #86efac',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.15)',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 6000,
          style: {
            background: '#fef2f2',
            border: '2px solid #fca5a5',
            boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -2px rgba(239, 68, 68, 0.15)',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
        loading: {
          duration: Infinity,
          style: {
            background: '#fef3c7',
            border: '2px solid #fde047',
            boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.2), 0 4px 6px -2px rgba(245, 158, 11, 0.15)',
          },
          iconTheme: {
            primary: '#f59e0b',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
