'use client';

import { useState, useEffect } from 'react';

interface InternalStatus {
  organization: string;
  status: string;
  message: string;
  timestamp: string;
  updatedBy?: string;
}

export default function AdminPage() {
  const [organization, setOrganization] = useState<'prodgain' | 'mordor'>('prodgain');
  const [status, setStatus] = useState('operational');
  const [message, setMessage] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentStatuses, setCurrentStatuses] = useState<InternalStatus[]>([]);

  useEffect(() => {
    fetchCurrentStatuses();
  }, []);

  const fetchCurrentStatuses = async () => {
    try {
      const response = await fetch('/api/internal/status');
      const data = await response.json();
      if (data.success) {
        setCurrentStatuses(data.statuses);
      }
    } catch (err) {
      console.error('Failed to fetch current statuses:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const response = await fetch('/api/internal/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization,
          status,
          message,
          updatedBy: updatedBy || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setMessage('');
        setUpdatedBy('');
        fetchCurrentStatuses();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'operational', label: 'Operational', color: '#10b981' },
    { value: 'degraded_performance', label: 'Degraded Performance', color: '#f59e0b' },
    { value: 'partial_outage', label: 'Partial Outage', color: '#ef4444' },
    { value: 'major_outage', label: 'Major Outage', color: '#dc2626' },
    { value: 'under_maintenance', label: 'Under Maintenance', color: '#3b82f6' }
  ];

  const currentStatus = currentStatuses.find(s => s.organization === organization);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header */}
      <header className="glass" style={{
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
                Internal Status Update
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '4px', fontWeight: 500 }}>
                Update status for Prodgain and Mordor Intelligence
              </p>
            </div>
            <a
              href="/status"
              className="glass-white"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#667eea',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ← Back to Status
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Update Form */}
          <div className="glass-white" style={{ borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginBottom: '20px' }}>
              Post Status Update
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Organization */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                  Organization
                </label>
                <select
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value as 'prodgain' | 'mordor')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e5e5',
                    fontSize: '14px',
                    color: '#171717',
                    background: 'white'
                  }}
                >
                  <option value="prodgain">Prodgain</option>
                  <option value="mordor">Mordor Intelligence</option>
                </select>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                  Status
                </label>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {statusOptions.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: status === opt.value ? `2px solid ${opt.color}` : '1px solid #e5e5e5',
                        background: status === opt.value ? `${opt.color}10` : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={opt.value}
                        checked={status === opt.value}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{ accentColor: opt.color }}
                      />
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: opt.color,
                        boxShadow: `0 0 8px ${opt.color}`
                      }} />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#171717' }}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                  Status Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g., Scheduled maintenance in progress"
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e5e5',
                    fontSize: '14px',
                    color: '#171717',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Updated By */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={updatedBy}
                  onChange={(e) => setUpdatedBy(e.target.value)}
                  placeholder="e.g., John Doe"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e5e5',
                    fontSize: '14px',
                    color: '#171717'
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !message}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: loading || !message ? '#e5e5e5' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading || !message ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? 'Updating...' : 'Update Status'}
              </button>

              {/* Success/Error Messages */}
              {success && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#d1fae5',
                  color: '#065f46',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  ✓ Status updated successfully!
                </div>
              )}
              {error && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Current Status Display */}
          <div className="glass-white" style={{ borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginBottom: '20px' }}>
              Current Status
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              {currentStatuses.map((s) => {
                const statusOpt = statusOptions.find(opt => opt.value === s.status);
                return (
                  <div
                    key={s.organization}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e5e5',
                      background: 'white'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717' }}>
                        {s.organization === 'prodgain' ? 'Prodgain' : 'Mordor Intelligence'}
                      </h3>
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: statusOpt ? `${statusOpt.color}15` : '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: statusOpt?.color || '#6b7280',
                          boxShadow: `0 0 6px ${statusOpt?.color || '#6b7280'}`
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: statusOpt?.color || '#6b7280', textTransform: 'uppercase' }}>
                          {statusOpt?.label || s.status}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#525252', marginBottom: '8px' }}>
                      {s.message}
                    </p>
                    <div style={{ fontSize: '11px', color: '#a3a3a3' }}>
                      Updated: {new Date(s.timestamp).toLocaleString()}
                      {s.updatedBy && ` by ${s.updatedBy}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginBottom: '16px' }}>
            API Documentation
          </h2>
          <p style={{ fontSize: '13px', color: '#525252', marginBottom: '16px' }}>
            You can also update status programmatically using our API:
          </p>
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
            <code style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'pre' }}>
{`POST /api/internal/status
Content-Type: application/json

{
  "organization": "prodgain",
  "status": "operational",
  "message": "All systems running normally",
  "updatedBy": "Your Name"
}`}
            </code>
          </div>
        </div>
      </main>
    </div>
  );
}
