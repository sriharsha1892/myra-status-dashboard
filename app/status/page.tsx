'use client';

import { useEffect, useState } from 'react';
import { StatusResponse, ProviderStatus } from '@/lib/types';
import NetworkDiagnostics from '@/components/NetworkDiagnostics';
import AnimatedStat from '@/components/AnimatedStat';
import MiniUptimeChart from '@/components/MiniUptimeChart';
import SkeletonCard from '@/components/SkeletonCard';
import AnimatedBackground from '@/components/AnimatedBackground';

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

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [internalStatuses, setInternalStatuses] = useState<InternalStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateText, setLastUpdateText] = useState('Just now');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

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
      const [statusResponse, internalResponse] = await Promise.all([
        fetch('/api/status/current'),
        fetch('/api/internal/status')
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
      const response = await fetch('/api/announcements');
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
                  myRA AI Status
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
                myRA AI Status
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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>

        {/* Premium Stats Dashboard */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <AnimatedStat
              value={systemHealth}
              label="System Health"
              suffix="%"
              color={systemHealth >= 95 ? "#10b981" : systemHealth >= 80 ? "#f59e0b" : "#ef4444"}
              delay={0}
            />
            <div className="glass-white" style={{
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '100px',
              opacity: 0,
              animation: 'fadeInUp 0.6s ease-out 0.1s forwards',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current Status
              </div>
              {currentStatus.allOperational ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>All Operational</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {statusData.providers.filter((p: any) => p.provider.priority === 'primary').length} services running normally
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: currentStatus.issueCount === 1 ? '#f59e0b' : '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: currentStatus.issueCount === 1 ? '#f59e0b' : '#ef4444',
                      flexShrink: 0,
                    }} />
                    {currentStatus.issueCount} {currentStatus.issueCount === 1 ? 'Issue' : 'Issues'} Detected
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                    {currentStatus.affectedServices.map((s: any) => s.name).join(', ')}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              {announcements.map((announcement) => {
                const typeColors = {
                  info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
                  warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
                  success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
                  maintenance: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#a78bfa' }
                };
                const colors = typeColors[announcement.type];
                const icons = {
                  info: 'ℹ️',
                  warning: '⚠️',
                  success: '✅',
                  maintenance: '🔧'
                };

                return (
                  <div
                    key={announcement.id}
                    className="card"
                    style={{
                      padding: '16px 20px',
                      marginBottom: '12px',
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <span style={{ fontSize: '20px', lineHeight: 1 }}>
                        {icons[announcement.type]}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: colors.text,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {announcement.type}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                            {announcement.title}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                          {announcement.message}
                        </div>
                        {announcement.createdBy && (
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                            Posted by {announcement.createdBy} • {new Date(announcement.createdAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Status Message */}
          {!hasIssues ? (
            <div className="card" style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                  All Systems Operational
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  All {statusData.providers.length} providers running smoothly
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{
              padding: '20px 24px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '4px' }}>
                    Service Disruption Detected
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                    {statusData.providers.length - operationalCount} {statusData.providers.length - operationalCount === 1 ? 'provider' : 'providers'} experiencing issues
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Network Diagnostics */}
        <div style={{ marginBottom: '24px' }}>
          <NetworkDiagnostics />
        </div>

        {/* Internal Systems */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            Internal Systems
          </h2>
          <div className="card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {(() => {
              // Combine all internal statuses into one
              const statusPriority: Record<string, number> = {
                'major_outage': 4,
                'partial_outage': 3,
                'degraded_performance': 2,
                'under_maintenance': 1,
                'operational': 0,
              };

              // Get worst status
              let worstStatus = 'operational';
              let worstPriority = 0;

              internalStatuses.forEach((status) => {
                const priority = statusPriority[status.status] || 0;
                if (priority > worstPriority) {
                  worstStatus = status.status;
                  worstPriority = priority;
                }
              });

              // Combine messages if there are any non-operational statuses
              const messages = internalStatuses
                .filter(s => s.status !== 'operational' && s.message)
                .map(s => s.message);

              const combinedMessage = messages.length > 0
                ? messages.join('. ')
                : 'All systems operational';

              return (
                <InternalStatusItem
                  key="myra-ai"
                  org="myRA AI"
                  status={worstStatus}
                  message={combinedMessage}
                  isFirst={true}
                />
              );
            })()}
          </div>
        </div>

        {/* Core Services - Primary Dependencies */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '16px', letterSpacing: '-0.01em' }}>
            Core Services
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
            gap: '16px'
          }}>
            {statusData.providers
              .filter((p: any) => p.provider.priority === 'primary')
              .map((providerStatus: any) => (
                <ProviderCard key={providerStatus.provider.id} data={providerStatus} />
              ))}
          </div>
        </div>

        {/* Secondary Services - Fallback Options */}
        {statusData.providers.filter((p: any) => p.provider.priority === 'secondary').length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <details style={{ cursor: 'pointer' }}>
              <summary style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '12px',
                letterSpacing: '-0.01em',
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0'
              }}>
                <span style={{ transition: 'transform 0.2s' }}>▸</span>
                Alternative Services
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>
                  ({statusData.providers.filter((p: any) => p.provider.priority === 'secondary').length} services)
                </span>
              </summary>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
                gap: '12px',
                paddingTop: '8px',
                opacity: 0.8
              }}>
                {statusData.providers
                  .filter((p: any) => p.provider.priority === 'secondary')
                  .map((providerStatus: any) => (
                    <div key={providerStatus.provider.id} style={{ transform: 'scale(0.95)' }}>
                      <ProviderCard data={providerStatus} />
                    </div>
                  ))}
              </div>
            </details>
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <div style={{ position: 'fixed', top: '90px', right: '20px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: toast.type === 'success' ? '#d1fae5' : toast.type === 'error' ? '#fee2e2' : toast.type === 'warning' ? '#fef3c7' : '#e0e7ff',
              border: `1px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#667eea'}40`,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.3s ease-out',
              cursor: 'pointer',
              transition: 'all 0.2s'
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
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}>
              {toast.message}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
              Click to view details
            </div>
          </div>
        ))}
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
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            A joint undertaking of Mordor Intelligence and Prodgain
          </p>
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

function InternalStatusItem({ org, status, message, isFirst }: { org: string, status: string, message: string, isFirst: boolean }) {
  const getStatusConfig = (s: string) => {
    switch(s) {
      case 'operational':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: 'All good', icon: '✓' };
      case 'degraded_performance':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: 'Minor delays', icon: '⚠' };
      case 'partial_outage':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', text: 'Some issues', icon: '!' };
      case 'major_outage':
        return { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', text: 'Service down', icon: '✕' };
      case 'under_maintenance':
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', text: 'Scheduled maintenance', icon: '⚙' };
      default:
        return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', text: 'Checking...', icon: '?' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div style={{
      padding: '12px 20px',
      borderTop: isFirst ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(255, 255, 255, 0.04)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>{org}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>{message}</div>
      </div>

      {/* Status badge */}
      <div style={{
        padding: '4px 12px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        {status === 'operational' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" fill="rgba(255, 255, 255, 0.3)" opacity="0.3"/>
            <path d="M3 6l2 2 4-4" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : status === 'degraded_performance' || status === 'under_maintenance' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v5M6 9h.01" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5"/>
            <path d="M4 4l4 4M8 4l-4 4" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {config.text}
        </span>
      </div>
    </div>
  );
}

function ProviderCard({ data }: { data: any }) {
  const { provider, status, components, incidents, history = [], uptimePercentage = 100 } = data;
  const [showAllServices, setShowAllServices] = useState(false);

  const hasActiveIncidents = incidents.some((i: any) =>
    i.status !== 'resolved' && i.status !== 'postmortem'
  );

  // Prioritize key services for agentic tasks - only core API functionality
  // Explicitly exclude voice, images, moderation, assistants, and other non-core services
  const excludePatterns = [
    /voice/i,
    /tts/i,
    /whisper/i,
    /audio/i,
    /dall[-\s]?e/i,
    /image/i,
    /vision/i,
    /moderation/i,
    /assistant/i,
    /fine[-\s]?tun/i,
    /batch/i,
    /file/i,
    /upload/i,
  ];

  const priorityPatterns = [
    // OpenAI core services - ONLY chat completions and embeddings
    /^chat completions$/i,
    /^completions api$/i,
    /^embeddings$/i,
    // Anthropic core services
    /claude api/i,
    /api\.anthropic/i,
    // Google - shows actual model names
    /gemini[\s-]?(2\.0|2|1\.5)[\s-]?(flash|pro)/i,
    /vertex.*api/i,
  ];

  const priorityServices: any[] = [];
  const otherServices: any[] = [];

  components.forEach((component: any) => {
    const name = component.name;

    // Skip if matches any exclude pattern
    const isExcluded = excludePatterns.some(pattern => pattern.test(name));
    if (isExcluded) {
      return; // Don't show at all
    }

    const isPriority = priorityPatterns.some(pattern => pattern.test(name));

    if (isPriority) {
      priorityServices.push(component);
    } else {
      otherServices.push(component);
    }
  });

  // By default show only priority services (up to 8), or if no priority services exist, show first 6
  const allFilteredServices = [...priorityServices, ...otherServices];
  const displayedServices = showAllServices
    ? allFilteredServices
    : priorityServices.length > 0
      ? priorityServices.slice(0, 8)
      : allFilteredServices.slice(0, 6);

  const getStatusConfig = (s: string) => {
    switch(s) {
      case 'operational':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: 'All systems normal', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' };
      case 'degraded_performance':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: 'Running slowly', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' };
      case 'partial_outage':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', text: 'Some features affected', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' };
      case 'major_outage':
        return { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', text: 'Service unavailable', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' };
      default:
        return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', text: 'Checking status...', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div id={`provider-${provider.id}`} className="card" style={{
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      border: hasActiveIncidents ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.12)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 12px 40px rgba(31, 38, 135, 0.25)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.15)';
    }}
    >
      {/* Header with gradient accent */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '4px', letterSpacing: '-0.01em' }}>
            {provider.displayName}
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            {priorityServices.length + otherServices.length} monitored
          </p>
        </div>
        <div style={{
          padding: '6px 14px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          fontSize: '12px',
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.95)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          {statusConfig.text}
        </div>
      </div>

      {/* 24-Hour Uptime Timeline */}
      {history.length > 0 && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            minWidth: '100px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span>24h Uptime</span>
            <div style={{
              fontSize: '20px',
              fontWeight: 800,
              color: uptimePercentage >= 99 ? '#10b981' : uptimePercentage >= 95 ? '#f59e0b' : '#ef4444',
            }}>
              {uptimePercentage}%
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <MiniUptimeChart history={history} width={400} height={48} />
          </div>
        </div>
      )}

      {/* Active Incidents */}
      {hasActiveIncidents && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 3v3M6 8h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Incidents
            </span>
          </div>
          {incidents.filter((i: any) => i.status !== 'resolved' && i.status !== 'postmortem').slice(0, 2).map((incident: any) => (
            <div key={incident.id} style={{ fontSize: '12px', color: '#dc2626', marginLeft: '28px', marginBottom: '4px' }}>
              • {incident.name}
            </div>
          ))}
        </div>
      )}

      {/* Services - Visual Status Cards */}
      {components.length > 0 && (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            {displayedServices.map((component: any) => {
              const compConfig = getStatusConfig(component.status);
              const isPriority = priorityPatterns.some((pattern: RegExp) => pattern.test(component.name));
              return (
                <div
                  key={component.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: isPriority ? 600 : 500 }}>
                      {component.name}
                    </span>
                    {isPriority && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#667eea',
                          background: 'rgba(102, 126, 234, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          border: '1px solid rgba(102, 126, 234, 0.2)',
                        }}
                        title="Priority model for agentic tasks"
                      >
                        Priority
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {component.status === 'operational' ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" fill="rgba(255, 255, 255, 0.3)" opacity="0.3"/>
                        <path d="M3 6l2 2 4-4" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : component.status === 'degraded_performance' ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2v5M6 9h.01" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5"/>
                        <path d="M4 4l4 4M8 4l-4 4" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {compConfig.text}
                    </span>
                  </div>
                </div>
              );
            })}
            {!showAllServices && allFilteredServices.length > displayedServices.length && (
              <button
                onClick={() => setShowAllServices(true)}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#667eea',
                  fontWeight: 600,
                  textAlign: 'center',
                  background: 'rgba(102, 126, 234, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                }}
              >
                Show {allFilteredServices.length - displayedServices.length} more
              </button>
            )}
            {showAllServices && otherServices.length > 0 && (
              <button
                onClick={() => setShowAllServices(false)}
                style={{
                  padding: '8px 14px',
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer'
                }}
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
