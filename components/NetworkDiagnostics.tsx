'use client';

import { useState } from 'react';

interface EndpointTest {
  name: string;
  url: string;
  latency: number | null;
  status: 'idle' | 'testing' | 'success' | 'error';
  error?: string;
}

interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  color: string;
  text: string;
  emoji: string;
}

export default function NetworkDiagnostics() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [endpoints, setEndpoints] = useState<EndpointTest[]>([
    { name: 'Your Connection', url: '/api/status/current', latency: null, status: 'idle' },
    { name: 'Global CDN', url: 'https://www.cloudflare.com/cdn-cgi/trace', latency: null, status: 'idle' },
    { name: 'Status Server', url: '/api/announcements', latency: null, status: 'idle' },
  ]);

  const getConnectionQuality = (): ConnectionQuality => {
    const successfulTests = endpoints.filter(e => e.status === 'success' && e.latency !== null);

    if (successfulTests.length === 0) {
      return { level: 'offline', color: '#ef4444', text: 'No Connection', emoji: '🔴' };
    }

    const avgLatency = successfulTests.reduce((sum, e) => sum + (e.latency || 0), 0) / successfulTests.length;

    if (avgLatency < 100) {
      return { level: 'excellent', color: '#10b981', text: 'Excellent', emoji: '🟢' };
    } else if (avgLatency < 200) {
      return { level: 'good', color: '#22c55e', text: 'Good', emoji: '🟢' };
    } else if (avgLatency < 400) {
      return { level: 'fair', color: '#f59e0b', text: 'Fair', emoji: '🟡' };
    } else {
      return { level: 'poor', color: '#f97316', text: 'Poor', emoji: '🟠' };
    }
  };

  const testEndpoint = async (endpoint: EndpointTest): Promise<EndpointTest> => {
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint.url, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal,
        mode: endpoint.url.startsWith('/') ? 'same-origin' : 'cors',
      });

      clearTimeout(timeout);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (response.ok || endpoint.url.includes('cloudflare.com')) {
        return { ...endpoint, latency, status: 'success' };
      } else {
        return { ...endpoint, latency, status: 'error', error: `HTTP ${response.status}` };
      }
    } catch (error: any) {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      return {
        ...endpoint,
        latency: latency > 5000 ? null : latency,
        status: 'error',
        error: error.name === 'AbortError' ? 'Timeout' : 'Connection Failed'
      };
    }
  };

  const runDiagnostics = async () => {
    setIsTesting(true);

    // Reset all endpoints
    setEndpoints(prev => prev.map(e => ({ ...e, latency: null, status: 'testing' as const, error: undefined })));

    // Test all endpoints in parallel
    const results = await Promise.all(
      endpoints.map(endpoint => testEndpoint(endpoint))
    );

    setEndpoints(results);
    setIsTesting(false);
  };

  const quality = getConnectionQuality();
  const hasResults = endpoints.some(e => e.status !== 'idle');

  return (
    <div className="glass-white" style={{
      borderRadius: '12px',
      overflow: 'hidden',
      border: hasResults && !isTesting ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: hasResults && !isTesting ? '0 0 20px rgba(102, 126, 234, 0.2)' : undefined,
    }}>
      {/* Compact Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          background: isExpanded ? 'rgba(102, 126, 234, 0.08)' : hasResults ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.06)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = hasResults ? 'rgba(102, 126, 234, 0.04)' : 'transparent';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: hasResults ? quality.color : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: isTesting ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}>
            {isTesting ? '⚡' : hasResults ? quality.emoji : '🌐'}
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>
              Network Connection Test
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>
              {isTesting ? 'Testing your connection speed...' : hasResults ? `${quality.text} connection detected` : 'Diagnose network connectivity'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!hasResults && !isTesting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                runDiagnostics();
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
              }}
            >
              Test Now
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasResults && !isTesting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                runDiagnostics();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: '#667eea',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5568d3';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Retest
            </button>
          )}

          <div style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
          }}>
            ▼
          </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {!hasResults ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌐</div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px' }}>
                Test your network connection to diagnose potential issues
              </p>
              <button
                onClick={runDiagnostics}
                disabled={isTesting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#667eea',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isTesting ? 'not-allowed' : 'pointer',
                  opacity: isTesting ? 0.6 : 1,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  if (!isTesting) {
                    e.currentTarget.style.background = '#5568d3';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#667eea';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isTesting ? 'Testing...' : 'Run Network Test'}
              </button>
            </div>
          ) : (
            <div>
              {/* Results Summary */}
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                background: `${quality.color}15`,
                border: `1px solid ${quality.color}40`,
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '24px' }}>{quality.emoji}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>
                      {quality.text} Connection
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>
                      {endpoints.filter(e => e.status === 'success').length} of {endpoints.length} endpoints reachable
                    </div>
                  </div>
                </div>
              </div>

              {/* Endpoint Results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {endpoints.map((endpoint, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: endpoint.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : endpoint.status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                      border: `1px solid ${endpoint.status === 'success' ? 'rgba(16, 185, 129, 0.3)' : endpoint.status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '16px' }}>
                        {endpoint.status === 'testing' ? '⚡' : endpoint.status === 'success' ? '✅' : endpoint.status === 'error' ? '❌' : '⚪'}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}>
                          {endpoint.name}
                        </div>
                        {endpoint.error && (
                          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>
                            {endpoint.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: endpoint.status === 'success' ? '#10b981' : endpoint.status === 'error' ? '#ef4444' : '#94a3b8',
                    }}>
                      {endpoint.status === 'testing' ? '...' : endpoint.latency !== null ? `${endpoint.latency}ms` : '-'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {quality.level === 'poor' || quality.level === 'offline' ? (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24', marginBottom: '4px' }}>
                    ⚠️ Connection Issues Detected
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
                    Your network connection appears to be slow or unstable. If you're experiencing issues with the status dashboard, it may be due to your local network connection rather than the services themselves.
                  </div>
                </div>
              ) : (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
                    ✓ Your network connection is working well. If you see issues with any services above, they are likely experiencing actual problems.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
