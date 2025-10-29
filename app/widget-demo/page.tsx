'use client';

import { useState } from 'react';

export default function WidgetDemoPage() {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const widgetUrl = `${baseUrl}/widget?size=${size}&theme=${theme}`;

  const embedCode = `<iframe
  src="${widgetUrl}"
  width="${size === 'small' ? '280' : size === 'medium' ? '400' : '600'}"
  height="${size === 'small' ? '120' : size === 'medium' ? '180' : '250'}"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
></iframe>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1f26 0%, #2d2e38 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
          }}>
            Embeddable Status Widget
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            Add real-time status updates to your dashboard, documentation, or website
          </p>
        </div>

        {/* Configuration */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '24px',
          }}>
            Configuration
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {/* Size Selection */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '12px',
              }}>
                Size
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: size === s ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.2)',
                      background: size === s ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: size === s ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '12px',
              }}>
                Theme
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: theme === t ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.2)',
                      background: theme === t ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: theme === t ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '24px',
          }}>
            Live Preview
          </h2>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '24px',
            background: theme === 'light' ? '#f5f5f5' : '#0a0a0a',
            borderRadius: '12px',
            minHeight: '200px',
            alignItems: 'center',
          }}>
            <iframe
              key={`${size}-${theme}`}
              src={widgetUrl}
              width={size === 'small' ? '280' : size === 'medium' ? '400' : '600'}
              height={size === 'small' ? '120' : size === 'medium' ? '180' : '250'}
              style={{
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        </div>

        {/* Embed Code */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#fff',
            }}>
              Embed Code
            </h2>
            <button
              onClick={copyToClipboard}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: copied ? '#10b981' : '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>

          <pre style={{
            background: '#0a0a0a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '20px',
            overflowX: 'auto',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#10b981',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          }}>
            {embedCode}
          </pre>
        </div>

        {/* Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '48px',
        }}>
          {[
            {
              icon: '⚡',
              title: 'Auto-updating',
              description: 'Widget refreshes every 60 seconds to show latest status',
            },
            {
              icon: '🎨',
              title: 'Customizable',
              description: 'Choose from 3 sizes and 2 themes to match your design',
            },
            {
              icon: '🚀',
              title: 'Lightweight',
              description: 'Minimal footprint with no external dependencies',
            },
            {
              icon: '📱',
              title: 'Responsive',
              description: 'Works seamlessly on desktop, tablet, and mobile',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{feature.icon}</div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '8px',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.5',
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Back to Status */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <a
            href="/status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
          >
            ← Back to Status Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
