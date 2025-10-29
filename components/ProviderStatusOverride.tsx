'use client';

import { useState, useEffect } from 'react';
import { PROVIDERS } from '@/lib/providers';
import { Provider } from '@/lib/types';

interface ProviderOverride {
  providerId: string;
  status: string;
  message: string;
  overrideUntil?: string;
  updatedBy?: string;
  active: boolean;
}

export default function ProviderStatusOverride() {
  const [selectedProvider, setSelectedProvider] = useState<string>(PROVIDERS[0].id);
  const [status, setStatus] = useState('operational');
  const [message, setMessage] = useState('');
  const [overrideUntil, setOverrideUntil] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeOverrides, setActiveOverrides] = useState<ProviderOverride[]>([]);

  useEffect(() => {
    fetchActiveOverrides();
  }, []);

  const fetchActiveOverrides = async () => {
    try {
      const response = await fetch('/api/provider-overrides');
      const data = await response.json();
      if (data.success) {
        setActiveOverrides(data.overrides || []);
      }
    } catch (err) {
      console.error('Failed to fetch overrides:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const response = await fetch('/api/provider-overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: selectedProvider,
          status,
          message,
          overrideUntil: overrideUntil || undefined,
          updatedBy: updatedBy || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setMessage('');
        setOverrideUntil('');
        setUpdatedBy('');
        fetchActiveOverrides();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to create override');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeOverride = async (providerId: string) => {
    if (!confirm('Are you sure you want to remove this override?')) {
      return;
    }

    try {
      const response = await fetch(`/api/provider-overrides?providerId=${providerId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchActiveOverrides();
      }
    } catch (err) {
      console.error('Failed to remove override:', err);
    }
  };

  const statusOptions = [
    { value: 'operational', label: 'Operational', color: '#10b981' },
    { value: 'degraded_performance', label: 'Degraded Performance', color: '#f59e0b' },
    { value: 'partial_outage', label: 'Partial Outage', color: '#ef4444' },
    { value: 'major_outage', label: 'Major Outage', color: '#dc2626' },
    { value: 'under_maintenance', label: 'Under Maintenance', color: '#3b82f6' },
  ];

  const selectedProviderData = PROVIDERS.find((p) => p.id === selectedProvider);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', marginBottom: '8px' }}>
          Provider Status Override
        </h2>
        <p style={{ fontSize: '13px', color: '#525252' }}>
          Manually override provider status. This takes precedence over automated status checks.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Override Form */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717', marginBottom: '20px' }}>
            Create Override
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Provider Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e5e5',
                  fontSize: '14px',
                  color: '#171717',
                  background: 'white',
                }}
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.displayName}
                  </option>
                ))}
              </select>
              {selectedProviderData && (
                <p style={{ fontSize: '12px', color: '#737373', marginTop: '6px' }}>
                  User-facing name: {selectedProviderData.userFacingName}
                </p>
              )}
            </div>

            {/* Status */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                Override Status
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
                      transition: 'all 0.2s',
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
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: opt.color,
                        boxShadow: `0 0 8px ${opt.color}`,
                      }}
                    />
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
                Override Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g., Manually set to degraded due to customer reports"
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
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Override Until */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>
                Override Until (Optional)
              </label>
              <input
                type="datetime-local"
                value={overrideUntil}
                onChange={(e) => setOverrideUntil(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e5e5',
                  fontSize: '14px',
                  color: '#171717',
                }}
              />
              <p style={{ fontSize: '11px', color: '#737373', marginTop: '4px' }}>
                Leave empty for indefinite override
              </p>
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
                placeholder="e.g., Admin Team"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e5e5',
                  fontSize: '14px',
                  color: '#171717',
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
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Creating Override...' : 'Create Override'}
            </button>

            {/* Success/Error Messages */}
            {success && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#d1fae5',
                  color: '#065f46',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                ✓ Override created successfully!
              </div>
            )}
            {error && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Active Overrides */}
        <div className="glass-white" style={{ borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717', marginBottom: '16px' }}>
            Active Overrides ({activeOverrides.filter((o) => o.active).length})
          </h3>

          <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {activeOverrides.filter((o) => o.active).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#a3a3a3', fontSize: '13px' }}>
                No active overrides
              </div>
            ) : (
              activeOverrides
                .filter((o) => o.active)
                .map((override) => {
                  const provider = PROVIDERS.find((p) => p.id === override.providerId);
                  const statusOpt = statusOptions.find((s) => s.value === override.status);

                  return (
                    <div
                      key={override.providerId}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        background: 'white',
                        border: `1px solid ${statusOpt?.color || '#e5e5e5'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#171717', marginBottom: '4px' }}>
                            {provider?.displayName}
                          </h4>
                          <div
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: statusOpt ? `${statusOpt.color}15` : '#f5f5f5',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <div
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: statusOpt?.color || '#6b7280',
                                boxShadow: `0 0 6px ${statusOpt?.color || '#6b7280'}`,
                              }}
                            />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: statusOpt?.color || '#6b7280', textTransform: 'uppercase' }}>
                              {statusOpt?.label || override.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeOverride(override.providerId)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <p style={{ fontSize: '13px', color: '#525252', marginBottom: '8px' }}>{override.message}</p>
                      <div style={{ fontSize: '11px', color: '#a3a3a3' }}>
                        {override.updatedBy && `By ${override.updatedBy} • `}
                        {override.overrideUntil && `Until ${new Date(override.overrideUntil).toLocaleString()}`}
                        {!override.overrideUntil && 'Indefinite'}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>ℹ️</div>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#171717', marginBottom: '4px' }}>
              About Provider Overrides
            </h4>
            <p style={{ fontSize: '12px', color: '#525252', lineHeight: '1.5' }}>
              Manual overrides take precedence over automated status checks from provider APIs. Use this when you need to manually set a provider's status based on internal knowledge, customer reports, or other factors not reflected in the provider's official status page. The override indicator will be displayed to admins in the status dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
