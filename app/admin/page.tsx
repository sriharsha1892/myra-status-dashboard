'use client';

import { useState, useEffect } from 'react';

interface InternalStatus {
  organization: string;
  status: string;
  message: string;
  timestamp: string;
  updatedBy?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  organization: string;
  status: string;
  message: string;
  updatedBy?: string;
  ipAddress?: string;
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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [organization, setOrganization] = useState<'prodgain' | 'mordor'>('prodgain');
  const [status, setStatus] = useState('operational');
  const [message, setMessage] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentStatuses, setCurrentStatuses] = useState<InternalStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Announcement states
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success' | 'maintenance'>('info');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementCreatedBy, setAnnouncementCreatedBy] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');

  useEffect(() => {
    // Check if already authenticated via sessionStorage
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentStatuses();
      fetchAuditLogs();
      fetchAnnouncements();
    }
  }, [isAuthenticated]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check - in production, this should be hashed server-side
    // Password: myra-admin-2025
    if (passwordInput === 'myra-admin-2025') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

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

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/audit?limit=10');
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements?all=true');
      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnouncementLoading(true);
    setAnnouncementSuccess(false);
    setAnnouncementError('');

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: announcementTitle,
          message: announcementMessage,
          type: announcementType,
          active: announcementActive,
          createdBy: announcementCreatedBy || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setAnnouncementSuccess(true);
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        setAnnouncementType('info');
        setAnnouncementActive(true);
        setAnnouncementCreatedBy('');
        fetchAnnouncements();
        setTimeout(() => setAnnouncementSuccess(false), 3000);
      } else {
        setAnnouncementError(data.error || 'Failed to create announcement');
      }
    } catch (err) {
      setAnnouncementError('Network error. Please try again.');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const toggleAnnouncementActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/announcements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          active: !currentActive
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Failed to update announcement:', err);
    }
  };

  const deleteAnnouncementById = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err);
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
        fetchAuditLogs(); // Refresh audit logs
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

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-white" style={{ maxWidth: '400px', width: '100%', padding: '32px', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#171717', marginBottom: '8px' }}>
              Admin Access
            </h1>
            <p style={{ fontSize: '13px', color: '#737373' }}>
              Enter password to access the admin panel
            </p>
          </div>

          <form onSubmit={handleAuth}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: authError ? '1px solid #ef4444' : '1px solid #e5e5e5',
                  fontSize: '14px',
                  color: '#171717',
                  background: 'white'
                }}
              />
              {authError && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a
              href="/status"
              style={{
                fontSize: '13px',
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              ← Back to Status
            </a>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Audit Log */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginBottom: '16px' }}>
            Recent Activity
          </h2>
          <p style={{ fontSize: '13px', color: '#525252', marginBottom: '16px' }}>
            Last 10 status updates
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#a3a3a3', fontSize: '13px' }}>
                No activity yet
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'white',
                    border: '1px solid #e5e5e5',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#667eea',
                        background: 'rgba(102, 126, 234, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}>
                        {log.organization}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: log.status === 'operational' ? '#10b981' : '#f59e0b',
                        background: log.status === 'operational' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                      }}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#a3a3a3' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#171717', marginBottom: '6px' }}>
                    {log.message}
                  </p>
                  {log.updatedBy && (
                    <p style={{ fontSize: '11px', color: '#737373' }}>
                      Updated by: {log.updatedBy}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Announcements Management */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginBottom: '16px' }}>
            Announcements
          </h2>
          <p style={{ fontSize: '13px', color: '#525252', marginBottom: '20px' }}>
            Create custom announcements and status messages to display on the status page
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Create Announcement Form */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717', marginBottom: '16px' }}>
                Create Announcement
              </h3>
              <form onSubmit={handleAnnouncementSubmit}>
                {/* Title */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="e.g., Scheduled Maintenance"
                    required
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

                {/* Message */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                    Message
                  </label>
                  <textarea
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="e.g., We will be performing scheduled maintenance on Sunday..."
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

                {/* Type */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                    Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { value: 'info', label: 'Info', color: '#3b82f6' },
                      { value: 'warning', label: 'Warning', color: '#f59e0b' },
                      { value: 'success', label: 'Success', color: '#10b981' },
                      { value: 'maintenance', label: 'Maintenance', color: '#8b5cf6' }
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: announcementType === opt.value ? `2px solid ${opt.color}` : '1px solid #e5e5e5',
                          background: announcementType === opt.value ? `${opt.color}10` : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="announcementType"
                          value={opt.value}
                          checked={announcementType === opt.value}
                          onChange={(e) => setAnnouncementType(e.target.value as any)}
                          style={{ accentColor: opt.color }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#171717' }}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Active */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={announcementActive}
                      onChange={(e) => setAnnouncementActive(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#171717' }}>
                      Active (display on status page)
                    </span>
                  </label>
                </div>

                {/* Created By */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={announcementCreatedBy}
                    onChange={(e) => setAnnouncementCreatedBy(e.target.value)}
                    placeholder="e.g., Admin Team"
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
                  disabled={announcementLoading || !announcementTitle || !announcementMessage}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: announcementLoading || !announcementTitle || !announcementMessage ? '#e5e5e5' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: announcementLoading || !announcementTitle || !announcementMessage ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {announcementLoading ? 'Creating...' : 'Create Announcement'}
                </button>

                {/* Success/Error Messages */}
                {announcementSuccess && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#d1fae5',
                    color: '#065f46',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    ✓ Announcement created successfully!
                  </div>
                )}
                {announcementError && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    {announcementError}
                  </div>
                )}
              </form>
            </div>

            {/* Existing Announcements */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717', marginBottom: '16px' }}>
                Existing Announcements ({announcements.length})
              </h3>
              <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
                {announcements.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#a3a3a3', fontSize: '13px' }}>
                    No announcements yet
                  </div>
                ) : (
                  announcements.map((announcement) => {
                    const typeColors = {
                      info: '#3b82f6',
                      warning: '#f59e0b',
                      success: '#10b981',
                      maintenance: '#8b5cf6'
                    };
                    const color = typeColors[announcement.type];

                    return (
                      <div
                        key={announcement.id}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'white',
                          border: `1px solid ${announcement.active ? color : '#e5e5e5'}`,
                          opacity: announcement.active ? 1 : 0.6
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: color,
                                background: `${color}15`,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase'
                              }}>
                                {announcement.type}
                              </span>
                              {announcement.active && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#10b981',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '4px' }}>
                              {announcement.title}
                            </h4>
                            <p style={{ fontSize: '12px', color: '#525252', marginBottom: '6px' }}>
                              {announcement.message}
                            </p>
                            <div style={{ fontSize: '10px', color: '#a3a3a3' }}>
                              Created: {new Date(announcement.createdAt).toLocaleString()}
                              {announcement.createdBy && ` by ${announcement.createdBy}`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                            <button
                              onClick={() => toggleAnnouncementActive(announcement.id, announcement.active)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: announcement.active ? '#fef3c7' : '#d1fae5',
                                color: announcement.active ? '#92400e' : '#065f46',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {announcement.active ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => deleteAnnouncementById(announcement.id)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#fee2e2',
                                color: '#991b1b',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
