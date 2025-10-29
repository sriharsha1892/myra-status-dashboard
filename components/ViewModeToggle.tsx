'use client';

import { useViewMode } from '@/contexts/ViewModeContext';

export default function ViewModeToggle() {
  const { viewMode, setViewMode, isAdminView } = useViewMode();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={() => setViewMode(isAdminView ? 'user' : 'admin')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: isAdminView ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          border: `1px solid ${isAdminView ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
          borderRadius: '8px',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isAdminView ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isAdminView ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isAdminView ? '#3b82f6' : '#10b981',
            boxShadow: `0 0 8px ${isAdminView ? '#3b82f6' : '#10b981'}`,
          }}
        />
        <span>{isAdminView ? 'Admin View' : 'User View'}</span>
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginLeft: '4px',
          }}
        >
          (Click to {isAdminView ? 'hide' : 'show'} details)
        </span>
      </button>

      {isAdminView && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.4',
          }}
        >
          <strong>Admin Mode:</strong> Showing real provider names, models, and technical details
        </div>
      )}
    </div>
  );
}
