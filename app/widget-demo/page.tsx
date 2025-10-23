'use client';

import { useState } from 'react';

export default function WidgetDemoPage() {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const getEmbedCode = () => {
    return `<iframe
  src="http://localhost:3002/widget?size=${size}&theme=${theme}"
  width="${size === 'small' ? '280' : size === 'medium' ? '400' : '600'}"
  height="${size === 'small' ? '120' : size === 'medium' ? '180' : '250'}"
  frameborder="0"
  style="border-radius: 12px; border: 1px solid #e5e7eb;"
></iframe>`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            Embeddable Status Widget
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
            Customize and copy the embed code
          </p>
        </div>

        {/* Controls */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginBottom: '20px' }}>
            Customize Widget
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Size Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                Size
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: size === s ? '2px solid #667eea' : '1px solid #e5e5e5',
                      background: size === s ? '#667eea10' : 'white',
                      color: size === s ? '#667eea' : '#171717',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                Theme
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: theme === t ? '2px solid #667eea' : '1px solid #e5e5e5',
                      background: theme === t ? '#667eea10' : 'white',
                      color: theme === t ? '#667eea' : '#171717',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
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

        {/* Preview */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginBottom: '20px' }}>
            Preview
          </h2>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            background: theme === 'dark' ? '#1f2937' : '#f9fafb',
            borderRadius: '8px',
          }}>
            <iframe
              src={`/widget?size=${size}&theme=${theme}`}
              width={size === 'small' ? '280' : size === 'medium' ? '400' : '600'}
              height={size === 'small' ? '120' : size === 'medium' ? '180' : '250'}
              style={{ border: 'none', borderRadius: '12px' }}
            />
          </div>
        </div>

        {/* Embed Code */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717' }}>
              Embed Code
            </h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(getEmbedCode());
                alert('Copied to clipboard!');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: '#667eea',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Copy Code
            </button>
          </div>
          <pre style={{
            background: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            margin: 0,
          }}>
            <code style={{
              fontSize: '12px',
              color: '#94a3b8',
              fontFamily: 'monospace',
            }}>
              {getEmbedCode()}
            </code>
          </pre>
        </div>

        {/* Quick Guide */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#171717', marginBottom: '12px' }}>
            Widget Sizes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px', color: '#525252' }}>
            <div>
              <strong>Small</strong> (280×120px)<br/>
              Compact status indicator
            </div>
            <div>
              <strong>Medium</strong> (400×180px)<br/>
              Balanced view (recommended)
            </div>
            <div>
              <strong>Large</strong> (600×250px)<br/>
              Detailed with labels
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <a
            href="/status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.85)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#667eea',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            ← Back to Full Status Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
