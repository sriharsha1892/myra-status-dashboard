'use client';

import React, { useState, useEffect } from 'react';
import { ProviderStatus } from '@/lib/types';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getProviderDisplayName } from '@/lib/view-utils';

interface SLADashboardProps {
  providers: ProviderStatus[];
}

interface MonthlyStats {
  month: string;
  uptime: number;
  incidents: number;
  totalDowntime: number;
  slaCompliant: boolean;
  criticalIncidents: number;
}

interface ProviderSLA {
  providerId: string;
  providerName: string;
  providerUserName: string;
  currentMonthUptime: number;
  last3MonthsUptime: number;
  slaTarget: number;
  slaStatus: 'meeting' | 'at-risk' | 'breached';
  monthlyHistory: MonthlyStats[];
}

export default function SLADashboard({ providers }: SLADashboardProps) {
  const { isAdminView } = useViewMode();
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | '3months' | '6months'>('current');
  const [isExpanded, setIsExpanded] = useState(false);

  const SLA_TARGET = 99.9; // 99.9% uptime target

  // Calculate uptime percentage from incidents
  const calculateUptime = (incidents: any[], startDate: Date, endDate: Date): number => {
    if (!incidents || incidents.length === 0) return 100;

    const totalPeriod = endDate.getTime() - startDate.getTime();
    let totalDowntime = 0;

    incidents.forEach((incident) => {
      const incidentStart = new Date(incident.created_at).getTime();
      const incidentEnd = incident.resolved_at
        ? new Date(incident.resolved_at).getTime()
        : endDate.getTime();

      // Check if incident overlaps with the period
      if (incidentStart <= endDate.getTime() && incidentEnd >= startDate.getTime()) {
        const overlapStart = Math.max(incidentStart, startDate.getTime());
        const overlapEnd = Math.min(incidentEnd, endDate.getTime());
        totalDowntime += overlapEnd - overlapStart;
      }
    });

    const uptime = ((totalPeriod - totalDowntime) / totalPeriod) * 100;
    return Math.max(0, Math.min(100, uptime));
  };

  // Generate monthly stats for last 6 months
  const generateMonthlyStats = (providerStatus: ProviderStatus): MonthlyStats[] => {
    const months: MonthlyStats[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const relevantIncidents = (providerStatus.incidents || []).filter((incident) => {
        const incidentDate = new Date(incident.created_at);
        return incidentDate >= monthStart && incidentDate <= monthEnd;
      });

      const uptime = calculateUptime(providerStatus.incidents || [], monthStart, monthEnd);
      const totalDowntime = relevantIncidents.reduce((sum, incident) => {
        const duration = incident.resolved_at
          ? new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()
          : 0;
        return sum + duration;
      }, 0);

      const criticalIncidents = relevantIncidents.filter(
        (i) => i.impact === 'critical' || i.impact === 'major'
      ).length;

      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        uptime: Number(uptime.toFixed(3)),
        incidents: relevantIncidents.length,
        totalDowntime,
        slaCompliant: uptime >= SLA_TARGET,
        criticalIncidents,
      });
    }

    return months;
  };

  // Calculate SLA status for each provider
  const slaData: ProviderSLA[] = providers
    .filter((p) => p.provider.priority === 'primary')
    .map((providerStatus) => {
      const monthlyHistory = generateMonthlyStats(providerStatus);
      const currentMonth = monthlyHistory[monthlyHistory.length - 1];
      const last3Months = monthlyHistory.slice(-3);
      const last3MonthsAvg =
        last3Months.reduce((sum, m) => sum + m.uptime, 0) / last3Months.length;

      let slaStatus: 'meeting' | 'at-risk' | 'breached' = 'meeting';
      if (currentMonth.uptime < SLA_TARGET) {
        slaStatus = 'breached';
      } else if (currentMonth.uptime < SLA_TARGET + 0.05) {
        slaStatus = 'at-risk';
      }

      return {
        providerId: providerStatus.provider.id,
        providerName: providerStatus.provider.displayName,
        providerUserName: providerStatus.provider.userFacingName,
        currentMonthUptime: currentMonth.uptime,
        last3MonthsUptime: Number(last3MonthsAvg.toFixed(3)),
        slaTarget: SLA_TARGET,
        slaStatus,
        monthlyHistory,
      };
    });

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case 'meeting':
        return '#10b981';
      case 'at-risk':
        return '#f59e0b';
      case 'breached':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getSLAStatusLabel = (status: string) => {
    switch (status) {
      case 'meeting':
        return 'Meeting SLA';
      case 'at-risk':
        return 'At Risk';
      case 'breached':
        return 'SLA Breached';
      default:
        return 'Unknown';
    }
  };

  const formatDowntime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const exportMonthlyReport = () => {
    const now = new Date();
    const reportData = slaData.map((provider) => ({
      Provider: getProviderDisplayName(
        { displayName: provider.providerName, userFacingName: provider.providerUserName } as any,
        isAdminView
      ),
      'Current Month Uptime': `${provider.currentMonthUptime}%`,
      '3-Month Average': `${provider.last3MonthsUptime}%`,
      'SLA Target': `${provider.slaTarget}%`,
      'SLA Status': getSLAStatusLabel(provider.slaStatus),
      'Monthly History': provider.monthlyHistory
        .map((m) => `${m.month}: ${m.uptime}% (${m.incidents} incidents)`)
        .join('; '),
    }));

    const csv = [
      Object.keys(reportData[0]).join(','),
      ...reportData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sla-report-${now.getFullYear()}-${now.getMonth() + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const overallSLACompliance =
    (slaData.filter((p) => p.slaStatus === 'meeting').length / slaData.length) * 100;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.95)',
              marginBottom: '8px',
              letterSpacing: '-0.01em',
            }}
          >
            SLA Dashboard & Monthly Reporting
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            Service Level Agreement compliance tracking and monthly performance reports
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isExpanded ? 'Show Summary' : 'Show Details'}
          </button>
          <button
            onClick={exportMonthlyReport}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📊</span>
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Overall Compliance Badge */}
      <div
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${overallSLACompliance >= 90 ? '#10b981' : '#f59e0b'}15 0%, rgba(255,255,255,0.03) 100%)`,
          border: `1px solid ${overallSLACompliance >= 90 ? '#10b981' : '#f59e0b'}40`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
            Overall SLA Compliance
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
            {overallSLACompliance.toFixed(1)}%
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            SLA Target
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
            {SLA_TARGET}%
          </div>
        </div>
      </div>

      {/* Provider SLA Cards */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {slaData.map((provider) => (
          <div
            key={provider.providerId}
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${getSLAStatusColor(provider.slaStatus)}40`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            {/* Provider Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.95)', marginBottom: '4px' }}>
                  {getProviderDisplayName(
                    { displayName: provider.providerName, userFacingName: provider.providerUserName } as any,
                    isAdminView
                  )}
                </h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: `${getSLAStatusColor(provider.slaStatus)}25`,
                  color: getSLAStatusColor(provider.slaStatus),
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {getSLAStatusLabel(provider.slaStatus)}
              </span>
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Current Month</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                  {provider.currentMonthUptime}%
                </div>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>3-Month Avg</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                  {provider.last3MonthsUptime}%
                </div>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>SLA Delta</div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color:
                      provider.currentMonthUptime >= SLA_TARGET ? '#10b981' : '#ef4444',
                  }}
                >
                  {provider.currentMonthUptime >= SLA_TARGET ? '+' : ''}
                  {(provider.currentMonthUptime - SLA_TARGET).toFixed(3)}%
                </div>
              </div>
            </div>

            {/* Monthly History (Expanded View) */}
            {isExpanded && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>
                  6-Month History
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {provider.monthlyHistory.map((month) => (
                    <div
                      key={month.month}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: month.slaCompliant ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${month.slaCompliant ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      }}
                    >
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                        {month.month}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                          {month.incidents} incident{month.incidents !== 1 ? 's' : ''}
                          {month.criticalIncidents > 0 && ` (${month.criticalIncidents} critical)`}
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: month.slaCompliant ? '#10b981' : '#ef4444',
                          }}
                        >
                          {month.uptime}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: '1.5',
        }}
      >
        <strong>SLA Calculation:</strong> Uptime is calculated as (Total Period - Total Downtime) / Total Period × 100.
        The SLA target of {SLA_TARGET}% allows for a maximum of {((1 - SLA_TARGET / 100) * 30 * 24 * 60).toFixed(1)}{' '}
        minutes of downtime per month (30-day period).
      </div>
    </div>
  );
}
