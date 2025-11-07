'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { StatusResponse, ProviderStatus } from '@/lib/types';
import AnimatedStat from '@/components/AnimatedStat';
import ServiceStatusCard from '@/components/ServiceStatusCard';
import HeroStatusBanner from '@/components/HeroStatusBanner';
import WorkflowStatus from '@/components/WorkflowStatus';
import SkeletonCard from '@/components/SkeletonCard';
import AnimatedBackground from '@/components/AnimatedBackground';
import IncidentHistory from '@/components/IncidentHistory';
import StatusHistory from '@/components/StatusHistory';
import ServiceDependencies from '@/components/ServiceDependencies';
import ActiveIncidentsTimeline from '@/components/ActiveIncidentsTimeline';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { useStatusNotifications } from '@/hooks/useStatusNotifications';
import { ViewModeProvider } from '@/contexts/ViewModeContext';

// Lazy load NetworkDiagnostics for better initial load performance
const NetworkDiagnostics = dynamic(() => import('@/components/NetworkDiagnostics'), {
  loading: () => <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading diagnostics...</div>,
  ssr: false // Don't render on server for performance
});

interface InternalStatus {
  organization: string;
  status: string;
  message: string;
  timestamp: string;
  updatedBy?: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  providerId?: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'maintenance';
  active: boolean;
  createdAt: string;
  createdBy?: string;
  expiresAt?: string;
}

function StatusPageContent() {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [internalStatuses, setInternalStatuses] = useState<InternalStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateText, setLastUpdateText] = useState('Just now');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Enable status change notifications
  useStatusNotifications(statusData?.providers || []);

  const addToast = (message: string, type: Toast['type'], providerId?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, providerId };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const fetchStatus = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    try {
      // Add timestamp to prevent browser caching
      const timestamp = Date.now();
      const [statusResponse, internalResponse] = await Promise.all([
        fetch(`/api/status/current?_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }),
        fetch(`/api/internal/status?_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      ]);

      if (!statusResponse.ok) throw new Error('Failed to fetch status');
      const data: StatusResponse = await statusResponse.json();

      // Detect status changes and show toasts
      if (statusData && !isManualRefresh) {
        data.providers.forEach((newProvider: any) => {
          const oldProvider = statusData.providers.find((p: any) => p.provider.id === newProvider.provider.id);
          if (oldProvider && oldProvider.status !== newProvider.status) {
            const statusMap: Record<string, string> = {
              operational: '✅',
              degraded_performance: '⚠️',
              partial_outage: '🔴',
              major_outage: '🚨',
              under_maintenance: '🔧'
            };
            const icon = statusMap[newProvider.status] || '📊';
            const statusText = newProvider.status.replace(/_/g, ' ');
            addToast(
              `${icon} ${newProvider.provider.displayName}: ${statusText}`,
              newProvider.status === 'operational' ? 'success' : newProvider.status.includes('outage') ? 'error' : 'warning',
              newProvider.provider.id
            );
          }
        });
      }

      setStatusData(data);

      if (internalResponse.ok) {
        const internalData = await internalResponse.json();
        if (internalData.success) {
          setInternalStatuses(internalData.statuses);
        }
      }

      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to load status data');
      setLoading(false);
    } finally {
      if (isManualRefresh) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  // Update relative time text
  useEffect(() => {
    if (!statusData) return;

    const updateTimeText = () => {
      const seconds = Math.floor((Date.now() - new Date(statusData.lastUpdated).getTime()) / 1000);
      if (seconds < 10) setLastUpdateText('Just now');
      else if (seconds < 60) setLastUpdateText(`${seconds}s ago`);
      else if (seconds < 3600) setLastUpdateText(`${Math.floor(seconds / 60)}m ago`);
      else setLastUpdateText(`${Math.floor(seconds / 3600)}h ago`);
    };

    updateTimeText();
    const interval = setInterval(updateTimeText, 5000);
    return () => clearInterval(interval);
  }, [statusData]);

  const fetchAnnouncements = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/announcements?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAnnouncements();
    const interval = setInterval(() => {
      fetchStatus();
      fetchAnnouncements();
    }, 60000);

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // R to refresh
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          fetchStatus(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (loading && !statusData) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
        {/* Header */}
        <header style={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'linear-gradient(180deg, rgba(88, 80, 236, 0.04) 0%, rgba(30, 31, 38, 0.95) 100%)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
            <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '-0.01em' }}>
                  myRA AI System Status
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>
                  Loading...
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content with Skeleton Cards */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '16px', letterSpacing: '-0.01em' }}>
              Core Services
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
              gap: '16px'
            }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !statusData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass" style={{ padding: '32px', borderRadius: '16px', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Unable to load status</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px' }}>{error || 'An unknown error occurred'}</p>
          <button
            onClick={() => fetchStatus(true)}
            className="card"
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#667eea',
              border: 'none'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const operationalCount = statusData.providers.filter((p: any) => p.status === 'operational').length;
  const hasIssues = statusData.overallStatus !== 'operational';
  const timeSinceUpdate = Math.round((Date.now() - new Date(statusData.lastUpdated).getTime()) / 1000);

  // Calculate weighted system health based on provider priority
  const calculateSystemHealth = () => {
    const primaryProviders = statusData.providers.filter((p: any) => p.provider.priority === 'primary');
    const secondaryProviders = statusData.providers.filter((p: any) => p.provider.priority === 'secondary');

    const primaryWeight = 0.8;
    const secondaryWeight = 0.2;

    const primaryOperational = primaryProviders.filter((p: any) => p.status === 'operational').length;
    const secondaryOperational = secondaryProviders.filter((p: any) => p.status === 'operational').length;

    const primaryScore = primaryProviders.length > 0 ? (primaryOperational / primaryProviders.length) * primaryWeight : 0;
    const secondaryScore = secondaryProviders.length > 0 ? (secondaryOperational / secondaryProviders.length) * secondaryWeight : 0;

    return Math.round((primaryScore + secondaryScore) * 100);
  };

  // Get current active issues from all providers (prioritize primary)
  const getCurrentStatusData = () => {
    const primaryProviders = statusData.providers.filter((p: any) => p.provider.priority === 'primary');
    const affectedProviders = primaryProviders.filter((p: any) => p.status !== 'operational');

    if (affectedProviders.length === 0) {
      return {
        allOperational: true,
        issueCount: 0,
        affectedServices: [],
      };
    }

    return {
      allOperational: false,
      issueCount: affectedProviders.length,
      affectedServices: affectedProviders.map((p: any) => ({
        name: p.provider.displayName,
        status: p.status,
      })),
    };
  };

  const systemHealth = calculateSystemHealth();
  const currentStatus = getCurrentStatusData();

  // Collect all incidents for timeline view - only show last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const allIncidents = statusData.providers.flatMap((p: any) =>
    p.incidents
      .filter((i: any) => new Date(i.created_at).getTime() > thirtyDaysAgo)
      .map((i: any) => ({ ...i, provider: p.provider }))
  ).sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px', position: 'relative' }}>
      <AnimatedBackground />
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'linear-gradient(180deg, rgba(88, 80, 236, 0.04) 0%, rgba(30, 31, 38, 0.95) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '-0.01em' }}>
                myRA AI System Status
              </h1>
              <a
                href="https://ask-myra.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                }}
              >
                myRA AI
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                {lastUpdateText}
              </span>
              <button
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: refreshing
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  opacity: refreshing ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!refreshing) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = refreshing
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <span style={{
                  display: 'inline-block',
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                }}>
                  ↻
                </span>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px', paddingLeft: '16px', paddingRight: '16px' }}>

        {/* Team Communications Section */}
        <div style={{ marginBottom: '32px' }}>
          {/* Section Header */}
          <div style={{
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(139, 92, 246, 0.3)'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase'
            }}>
              Team Communications
            </h2>
            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              lineHeight: '1.5'
            }}>
              Official updates and announcements from the myRA AI operations team
            </p>
          </div>

          {/* Service Advisory Notice */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '2px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '12px',
                padding: '16px 20px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Icon */}
                <div
                  style={{
                    fontSize: '24px',
                    lineHeight: '1',
                    flexShrink: 0,
                  }}
                >
                  ⚠️
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      Service Advisory
                    </h3>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#f59e0b',
                        color: '#ffffff',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Important Notice
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.85)',
                      margin: '0 0 8px 0',
                      lineHeight: '1.5',
                    }}
                  >
                    We are currently experiencing intermittent service disruptions from several of our upstream infrastructure providers.
                    Our team is actively monitoring the situation and working with our partners to restore full operational capacity.
                    During this period, you may encounter delayed response times or temporary service interruptions. We appreciate your patience
                    and will provide updates as the situation evolves.
                  </p>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Posted: {new Date().toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'GMT'
                    })} GMT</span>
                    <span>•</span>
                    <span>By: myRA AI Operations Team</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Content */}
          {(() => {
            const teamStatus = internalStatuses.find(s => s.organization === 'prodgain');
            return (
              <>
                {/* Team Status Update */}
                {teamStatus && (
                  <div style={{ marginBottom: '16px' }}>
                  {(() => {
                    const getStatusConfig = (s: string) => {
                      switch(s) {
                        case 'operational':
                          return {
                            color: '#10b981',
                            bg: 'rgba(16, 185, 129, 0.15)',
                            border: 'rgba(16, 185, 129, 0.4)',
                            icon: '✓',
                            label: 'All Systems Operational'
                          };
                        case 'degraded_performance':
                          return {
                            color: '#f59e0b',
                            bg: 'rgba(245, 158, 11, 0.15)',
                            border: 'rgba(245, 158, 11, 0.4)',
                            icon: '⚠',
                            label: 'Performance Issues'
                          };
                        case 'partial_outage':
                          return {
                            color: '#ef4444',
                            bg: 'rgba(239, 68, 68, 0.15)',
                            border: 'rgba(239, 68, 68, 0.4)',
                            icon: '!',
                            label: 'Partial Outage'
                          };
                        case 'major_outage':
                          return {
                            color: '#dc2626',
                            bg: 'rgba(220, 38, 38, 0.15)',
                            border: 'rgba(220, 38, 38, 0.4)',
                            icon: '✕',
                            label: 'Major Outage'
                          };
                        case 'under_maintenance':
                          return {
                            color: '#8b5cf6',
                            bg: 'rgba(139, 92, 246, 0.15)',
                            border: 'rgba(139, 92, 246, 0.4)',
                            icon: '🔧',
                            label: 'Scheduled Maintenance'
                          };
                        default:
                          return {
                            color: '#6b7280',
                            bg: 'rgba(107, 114, 128, 0.15)',
                            border: 'rgba(107, 114, 128, 0.4)',
                            icon: '?',
                            label: 'Status Unknown'
                          };
                      }
                    };

                    const config = getStatusConfig(teamStatus.status);
                    const timestamp = new Date(teamStatus.timestamp).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'GMT'
                    }) + ' GMT';

                    return (
                      <div
                        style={{
                          background: config.bg,
                          border: `2px solid ${config.border}`,
                          borderRadius: '12px',
                          padding: '16px 20px',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          {/* Icon */}
                          <div
                            style={{
                              fontSize: '24px',
                              lineHeight: '1',
                              flexShrink: 0,
                            }}
                          >
                            {config.icon}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                                myRA AI Team Update
                              </h3>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: config.color,
                                  color: '#ffffff',
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {config.label}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: '13px',
                                color: 'rgba(255, 255, 255, 0.85)',
                                margin: '0 0 8px 0',
                                lineHeight: '1.5',
                              }}
                            >
                              {teamStatus.message}
                            </p>
                            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>Posted: {timestamp}</span>
                              {teamStatus.updatedBy && (
                                <>
                                  <span>•</span>
                                  <span>By: {teamStatus.updatedBy}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

                {/* Announcements */}
                <AnnouncementBanner />
              </>
            );
          })()}
        </div>

        {/* Infrastructure Status Section */}
        <div style={{ marginTop: '32px', marginBottom: '32px' }}>
          {/* Section Header */}
          <div style={{
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(59, 130, 246, 0.3)'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase'
            }}>
              Infrastructure Status
            </h2>
            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              lineHeight: '1.5'
            }}>
              Real-time monitoring of infrastructure partner health and service dependencies that power myRA AI operations
            </p>
          </div>

          {/* Infrastructure Content */}
          <div style={{
            padding: '24px',
            background: 'rgba(59, 130, 246, 0.03)',
            border: '2px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '16px'
          }}>
            {/* Hero Status Banner */}
            <HeroStatusBanner
              providers={statusData.providers}
              lastUpdated={statusData.lastUpdated}
            />

            {/* Workflow Status - Primary View */}
            <WorkflowStatus providers={statusData.providers} />

            {/* Active Incidents Timeline with Cognitive Severity Assessment */}
            <ActiveIncidentsTimeline providers={statusData.providers} />

            {/* Impact Radius - Shows only when there are issues */}
            <ServiceDependencies providers={statusData.providers} />

            {/* Incident History */}
            <IncidentHistory providers={statusData.providers} />

            {/* Infrastructure Partners Cards */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                  Service Status Details
                </h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
                  Detailed status of individual infrastructure partner services
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
                gap: '16px'
              }}>
                {statusData.providers
                  .filter((p: any) => p.provider.priority === 'primary')
                  .map((providerStatus: any) => (
                    <ServiceStatusCard
                      key={providerStatus.provider.id}
                      providerStatus={providerStatus}
                      onNotificationSubscribe={(message) => addToast(message, 'success')}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Tools Section */}
        <div style={{ marginTop: '32px', marginBottom: '32px' }}>
          {/* Section Header */}
          <div style={{
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(245, 158, 11, 0.3)'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase'
            }}>
              Diagnostic Tools
            </h2>
            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              lineHeight: '1.5'
            }}>
              Connectivity testing and network diagnostics to isolate performance issues between your environment and myRA AI services
            </p>
          </div>

          {/* Diagnostic Content */}
          <details open={showDiagnostics} onToggle={(e: any) => setShowDiagnostics(e.target.open)}>
            <summary
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                marginBottom: '12px',
                cursor: 'pointer',
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 18px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '2px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.2)';
              }}
            >
              <span style={{ transition: 'transform 0.2s', transform: showDiagnostics ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                ▸
              </span>
              Run Network Tests
              <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                {showDiagnostics ? 'Hide' : 'Show'} detailed diagnostics
              </span>
            </summary>
            <div style={{
              marginTop: '12px',
              padding: '20px',
              background: 'rgba(245, 158, 11, 0.03)',
              border: '2px solid rgba(245, 158, 11, 0.15)',
              borderRadius: '12px'
            }}>
              <NetworkDiagnostics />
            </div>
          </details>
        </div>

        {/* Status History */}
        <StatusHistory providers={statusData.providers} />
      </main>

      {/* Toast Notifications */}
      <div style={{ position: 'fixed', top: '90px', right: '20px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
        {toasts.map((toast) => {
          const toastColors = {
            success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#10b981', icon: '✓' },
            error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', icon: '✕' },
            warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#f59e0b', icon: '⚠' },
            info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#3b82f6', icon: 'i' }
          };
          const colors = toastColors[toast.type];

          return (
            <div
              key={toast.id}
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: colors.bg,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                animation: 'slideInRight 0.3s ease-out',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
              onClick={() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
                if (toast.providerId) {
                  document.getElementById(`provider-${toast.providerId}`)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {colors.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}>
                  {toast.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="glass" style={{
        borderTop: '1px solid rgba(255,255,255,0.2)',
        marginTop: '40px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#fff', marginBottom: '6px' }}>
            <strong style={{ fontWeight: 700 }}>myRA AI</strong> Status Dashboard
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
            A joint undertaking of Mordor Intelligence and Prodgain
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
            <a
              href="/widget-demo"
              style={{
                fontSize: '12px',
                color: '#60a5fa',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Embed Widget
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Wrap with ViewModeProvider for admin/user view switching
export default function StatusPage() {
  return (
    <ViewModeProvider>
      <StatusPageContent />
    </ViewModeProvider>
  );
}
