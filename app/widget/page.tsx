'use client';

import { useEffect, useState } from 'react';
import { ProviderStatus } from '@/lib/types';

interface WidgetProps {
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
}

export default function WidgetPage() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState<string>('operational');
  const [loading, setLoading] = useState(true);

  // Get query params for widget customization
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const sizeParam = params.get('size') as 'small' | 'medium' | 'large';
    const themeParam = params.get('theme') as 'light' | 'dark';

    if (sizeParam) setSize(sizeParam);
    if (themeParam) setTheme(themeParam);

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status/current');
      const data = await response.json();
      setStatuses(data.providers);
      setOverallStatus(data.overallStatus);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; text: string; icon: string }> = {
      operational: { color: '#10b981', bg: '#d1fae5', text: 'Operational', icon: '✓' },
      degraded_performance: { color: '#f59e0b', bg: '#fef3c7', text: 'Degraded', icon: '⚠' },
      partial_outage: { color: '#ef4444', bg: '#fee2e2', text: 'Partial Outage', icon: '✕' },
      major_outage: { color: '#dc2626', bg: '#fee2e2', text: 'Major Outage', icon: '✕' },
      under_maintenance: { color: '#3b82f6', bg: '#dbeafe', text: 'Maintenance', icon: '🔧' },
      unknown: { color: '#6b7280', bg: '#f3f4f6', text: 'Unknown', icon: '?' },
    };
    return configs[status] || configs.unknown;
  };

  const config = getStatusConfig(overallStatus);

  // Size configurations
  const sizes = {
    small: { width: '280px', height: '120px', fontSize: '11px', iconSize: '14px', padding: '12px' },
    medium: { width: '400px', height: '180px', fontSize: '13px', iconSize: '16px', padding: '16px' },
    large: { width: '600px', height: '250px', fontSize: '14px', iconSize: '18px', padding: '20px' },
  };

  const sizeConfig = sizes[size];

  // Theme configurations
  const themes = {
    light: {
      bg: '#ffffff',
      border: '#e5e7eb',
      text: '#171717',
      mutedText: '#6b7280',
      cardBg: '#f9fafb',
    },
    dark: {
      bg: '#1f2937',
      border: '#374151',
      text: '#f9fafb',
      mutedText: '#9ca3af',
      cardBg: '#111827',
    },
  };

  const themeConfig = themes[theme];

  if (loading) {
    return (
      <div style={{
        width: sizeConfig.width,
        height: sizeConfig.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: themeConfig.bg,
        borderRadius: '12px',
        border: `1px solid ${themeConfig.border}`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <span style={{ color: themeConfig.mutedText, fontSize: sizeConfig.fontSize }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{
      width: sizeConfig.width,
      height: sizeConfig.height,
      background: themeConfig.bg,
      borderRadius: '12px',
      border: `1px solid ${themeConfig.border}`,
      padding: sizeConfig.padding,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: sizeConfig.iconSize,
            height: sizeConfig.iconSize,
            borderRadius: '50%',
            background: config.color,
            boxShadow: `0 0 8px ${config.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'small' ? '8px' : '10px',
            color: 'white',
            fontWeight: 'bold',
          }}>
            {config.icon}
          </div>
          <div>
            <h3 style={{
              fontSize: size === 'small' ? '12px' : sizeConfig.fontSize,
              fontWeight: 700,
              color: themeConfig.text,
              margin: 0,
            }}>
              myRA AI Status
            </h3>
            {size !== 'small' && (
              <p style={{
                fontSize: size === 'medium' ? '10px' : '11px',
                color: themeConfig.mutedText,
                margin: 0,
              }}>
                {config.text}
              </p>
            )}
          </div>
        </div>
        <a
          href="http://localhost:3002/status"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: size === 'small' ? '9px' : '10px',
            color: config.color,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Details →
        </a>
      </div>

      {/* Provider Status List */}
      {size !== 'small' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: size === 'medium' ? '6px' : '8px',
          maxHeight: size === 'medium' ? '100px' : '150px',
          overflowY: 'auto',
        }}>
          {statuses.slice(0, size === 'medium' ? 5 : 8).map((providerStatus) => {
            const statusConfig = getStatusConfig(providerStatus.status);
            return (
              <div
                key={providerStatus.provider.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: size === 'medium' ? '6px 8px' : '8px 10px',
                  background: themeConfig.cardBg,
                  borderRadius: '6px',
                  border: `1px solid ${themeConfig.border}`,
                }}
              >
                <span style={{
                  fontSize: sizeConfig.fontSize,
                  color: themeConfig.text,
                  fontWeight: 500,
                }}>
                  {providerStatus.provider.displayName}
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: statusConfig.color,
                    boxShadow: `0 0 6px ${statusConfig.color}`,
                  }} />
                  {size === 'large' && (
                    <span style={{
                      fontSize: '10px',
                      color: statusConfig.color,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      {statusConfig.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer for small widget */}
      {size === 'small' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '8px',
        }}>
          <div style={{ fontSize: '11px', color: themeConfig.text, fontWeight: 500 }}>
            {statuses.filter(s => s.status === 'operational').length}/{statuses.length} services operational
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '4px',
          }}>
            {statuses.slice(0, 5).map((providerStatus) => {
              const statusConfig = getStatusConfig(providerStatus.status);
              return (
                <div
                  key={providerStatus.provider.id}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: statusConfig.color,
                    boxShadow: `0 0 4px ${statusConfig.color}`,
                  }}
                  title={providerStatus.provider.displayName}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Attribution */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: sizeConfig.padding,
        right: sizeConfig.padding,
        fontSize: '9px',
        color: themeConfig.mutedText,
        textAlign: 'center',
        borderTop: `1px solid ${themeConfig.border}`,
        paddingTop: '6px',
      }}>
        Powered by myRA AI
      </div>
    </div>
  );
}
