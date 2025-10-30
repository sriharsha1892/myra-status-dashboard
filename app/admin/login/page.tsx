'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store auth token
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_token', data.token);
        router.push('/admin');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1f26 0%, #2d2e38 100%)',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.95)',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Admin Login
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          myRA AI Status Dashboard
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '8px',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '13px',
              marginBottom: '24px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: loading || !password
                ? 'rgba(102, 126, 234, 0.3)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading || !password
                ? 'none'
                : '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!loading && password) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = loading || !password
                ? 'none'
                : '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
        }}>
          <a
            href="/status"
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.5)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            ← Back to Status Page
          </a>
        </div>
      </div>
    </div>
  );
}
