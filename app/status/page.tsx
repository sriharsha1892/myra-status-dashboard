'use client';

import { useEffect, useState } from 'react';
import { StatusResponse, ProviderStatus } from '@/lib/types';
import NetworkDiagnostics from '@/components/NetworkDiagnostics';
import AnimatedStat from '@/components/AnimatedStat';
import MiniUptimeChart from '@/components/MiniUptimeChart';

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

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [internalStatuses, setInternalStatuses] = useState<InternalStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateText, setLastUpdateText] = useState('Just now');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());

  const addToast = (message: string, type: Toast['type'], providerId?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, providerId };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const toggleIncident = (incidentId: string) => {
    setExpandedIncidents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(incidentId)) {
        newSet.delete(incidentId);
      } else {
        newSet.add(incidentId);
      }
      return newSet;
    });
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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 60000);

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // R to refresh
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          fetchStatus(true);
        }
      }
      // / to focus search
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape') {
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>Loading status...</p>
        </div>
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
                {lastUpdateText}
              </span>

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', borderRadius: '6px', padding: '2px', gap: '2px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    color: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: viewMode === 'timeline' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    color: viewMode === 'timeline' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Timeline
                </button>
              </div>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <AnimatedStat
              value={operationalCount}
              label="Online"
              color="#10b981"
              delay={0}
            />
            <AnimatedStat
              value={statusData.providers.length}
              label="Total Providers"
              color="#667eea"
              delay={100}
            />
            <AnimatedStat
              value={allIncidents.length}
              label="Incidents (30d)"
              color="#f59e0b"
              delay={200}
            />
            <AnimatedStat
              value={Math.round((operationalCount / statusData.providers.length) * 100)}
              label="Uptime"
              suffix="%"
              color="#10b981"
              delay={300}
            />
          </div>

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Internal Systems
            </h2>
            <a
              href="/admin"
              className="card"
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#667eea',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Update Status
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {internalStatuses.map((status, index) => (
              <InternalStatusItem
                key={status.organization}
                org={status.organization === 'prodgain' ? 'Prodgain' : 'Mordor Intelligence'}
                status={status.status}
                message={status.message}
                isFirst={index === 0}
              />
            ))}
          </div>
        </div>

        {/* AI Infrastructure Providers */}
        {viewMode === 'grid' ? (
          <div>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '16px', letterSpacing: '-0.01em' }}>
              AI Infrastructure Providers
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '16px' }}>
              {statusData.providers.map((providerStatus: any) => (
                <ProviderCard key={providerStatus.provider.id} data={providerStatus} />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '16px', letterSpacing: '-0.01em' }}>
              Incident Timeline
            </h2>
            <div className="card" style={{ padding: '24px' }}>
              {allIncidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M7 13l3 3 7-7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '4px' }}>No Incidents</h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>All systems operating normally</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {allIncidents.slice(0, 20).map((incident: any) => {
                    const isExpanded = expandedIncidents.has(incident.id);
                    const hasUpdates = incident.incident_updates && incident.incident_updates.length > 0;

                    return (
                      <div
                        key={incident.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          overflow: 'hidden',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div
                          onClick={() => hasUpdates && toggleIncident(incident.id)}
                          style={{
                            padding: '16px',
                            cursor: hasUpdates ? 'pointer' : 'default',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => hasUpdates && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.4)' }}>
                                {incident.provider.displayName}
                              </span>
                              <h4 style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)', marginTop: '6px', marginBottom: '4px' }}>
                                {incident.name}
                              </h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                  {new Date(incident.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {hasUpdates && (
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                                    {incident.incident_updates.length} update{incident.incident_updates.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: incident.status === 'resolved' ? '#d1fae5' : incident.status === 'postmortem' ? '#e0e7ff' : '#fee2e2',
                                color: incident.status === 'resolved' ? '#065f46' : incident.status === 'postmortem' ? '#3730a3' : '#991b1b',
                                textTransform: 'capitalize'
                              }}>
                                {incident.status.replace(/_/g, ' ')}
                              </span>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: '#f3f4f6',
                                color: '#4b5563',
                                textTransform: 'capitalize'
                              }}>
                                {incident.impact}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Section - Incident Updates */}
                        {isExpanded && hasUpdates && (
                          <div style={{
                            padding: '0 16px 16px 16px',
                            animation: 'slideInRight 0.3s ease-out',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                          }}>
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {incident.incident_updates.map((update: any, idx: number) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: 'rgba(255, 255, 255, 0.9)',
                                      textTransform: 'capitalize'
                                    }}>
                                      {update.status || 'Update'}
                                    </span>
                                    {update.created_at && (
                                      <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                        {new Date(update.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  <p style={{
                                    fontSize: '12px',
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    lineHeight: 1.5,
                                    margin: 0
                                  }}>
                                    {update.body}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {incident.shortlink && (
                              <div style={{ marginTop: '12px' }}>
                                <a
                                  href={incident.shortlink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '12px',
                                    color: '#667eea',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                  View full incident details →
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: 'Operational', icon: '✓' };
      case 'degraded_performance':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: 'Degraded', icon: '⚠' };
      case 'partial_outage':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', text: 'Partial Outage', icon: '!' };
      case 'major_outage':
        return { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', text: 'Major Outage', icon: '✕' };
      case 'under_maintenance':
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', text: 'Maintenance', icon: '⚙' };
      default:
        return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', text: 'Unknown', icon: '?' };
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

  const hasActiveIncidents = incidents.some(i =>
    i.status !== 'resolved' && i.status !== 'postmortem'
  );

  // Prioritize key services for agentic tasks
  // Note: Most providers don't expose model-level status, only infrastructure components
  const priorityPatterns = [
    // OpenAI core services
    /chat completions/i,
    /completions/i,
    /api/i,
    /realtime/i,
    // Anthropic core services
    /claude api/i,
    /api\.anthropic/i,
    // Google - shows actual model names
    /gemini[\s-]?(2\.0|2|1\.5)[\s-]?(flash|pro)/i,
    /gemini/i,
    /vertex.*api/i,
    // General priority terms
    /\bapi\b/i,
  ];

  const priorityServices: any[] = [];
  const otherServices: any[] = [];

  components.forEach((component: any) => {
    const name = component.name;
    const isPriority = priorityPatterns.some(pattern => pattern.test(name));

    if (isPriority) {
      priorityServices.push(component);
    } else {
      otherServices.push(component);
    }
  });

  // By default show only priority services (up to 8), or if no priority services exist, show first 6
  const displayedServices = showAllServices
    ? [...priorityServices, ...otherServices]
    : priorityServices.length > 0
      ? priorityServices.slice(0, 8)
      : components.slice(0, 6);

  const getStatusConfig = (s: string) => {
    switch(s) {
      case 'operational':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: 'Operational', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' };
      case 'degraded_performance':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: 'Degraded', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' };
      case 'partial_outage':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', text: 'Partial Outage', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' };
      case 'major_outage':
        return { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', text: 'Major Outage', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' };
      default:
        return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', text: 'Unknown', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' };
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
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
            {components.length} {components.length === 1 ? 'service' : 'services'} monitored
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
          {incidents.filter(i => i.status !== 'resolved' && i.status !== 'postmortem').slice(0, 2).map((incident) => (
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
            {displayedServices.map((component) => {
              const compConfig = getStatusConfig(component.status);
              const isPriority = priorityPatterns.some(pattern => pattern.test(component.name));
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
            {!showAllServices && components.length > displayedServices.length && (
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
                Show {components.length - displayedServices.length} other {components.length - displayedServices.length === 1 ? 'service' : 'services'}
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

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <a
          href={provider.statusPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: '#667eea',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            transition: 'gap 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.gap = '8px'}
          onMouseLeave={(e) => e.currentTarget.style.gap = '6px'}
        >
          View official status page
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
