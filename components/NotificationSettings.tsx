'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';

interface NotificationPreferences {
  email?: string;
  services: string[]; // provider IDs
  notifyOnDegraded: boolean;
  notifyOnOutage: boolean;
  notifyOnRecovery: boolean;
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Array<{ id: string; name: string; displayName: string }>;
}

export default function NotificationSettings({ isOpen, onClose, providers }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: '',
    services: [],
    notifyOnDegraded: true,
    notifyOnOutage: true,
    notifyOnRecovery: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load saved preferences
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('notificationPreferences');
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now (will integrate with backend API later)
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences));

      // Call backend API
      await authenticatedFetch('/api/notifications/configure', {
        method: 'POST',
        body: JSON.stringify(preferences),
      });

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => {
        setSaveMessage('');
        onClose();
      }, 2000);
    } catch (error) {
      setSaveMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setPreferences(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(id => id !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(30, 31, 38, 0.98) 0%, rgba(20, 21, 28, 0.98) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>
              Notification Settings
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: '8px 0 0 0' }}>
            Get notified when your monitored services experience issues
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Email */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={preferences.email}
              onChange={(e) => setPreferences(prev => ({ ...prev, email: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
              You'll receive email notifications when your selected services have issues
            </p>
          </div>

          {/* Services to Monitor */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>
              Services to Monitor
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {providers.map(provider => (
                <label
                  key={provider.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: preferences.services.includes(provider.id)
                      ? 'rgba(102, 126, 234, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${preferences.services.includes(provider.id)
                      ? 'rgba(102, 126, 234, 0.3)'
                      : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={preferences.services.includes(provider.id)}
                    onChange={() => toggleService(provider.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                    {provider.displayName}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notification Types */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>
              Notify Me When
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                <input
                  type="checkbox"
                  checked={preferences.notifyOnOutage}
                  onChange={(e) => setPreferences(prev => ({ ...prev, notifyOnOutage: e.target.checked }))}
                  style={{ cursor: 'pointer' }}
                />
                Service has an outage
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                <input
                  type="checkbox"
                  checked={preferences.notifyOnDegraded}
                  onChange={(e) => setPreferences(prev => ({ ...prev, notifyOnDegraded: e.target.checked }))}
                  style={{ cursor: 'pointer' }}
                />
                Service is degraded
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                <input
                  type="checkbox"
                  checked={preferences.notifyOnRecovery}
                  onChange={(e) => setPreferences(prev => ({ ...prev, notifyOnRecovery: e.target.checked }))}
                  style={{ cursor: 'pointer' }}
                />
                Service recovers
              </label>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: saveMessage.includes('success') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${saveMessage.includes('success') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: '#fff',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {saveMessage}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !preferences.email}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: (!preferences.email || saving)
                  ? 'rgba(102, 126, 234, 0.3)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (!preferences.email || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
