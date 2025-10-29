'use client';

import React from 'react';

interface UptimeSparklineProps {
  incidents?: any[];
  currentStatus: string;
}

export default function UptimeSparkline({ incidents = [], currentStatus }: UptimeSparklineProps) {
  // Generate 7-day status history
  const generateStatusHistory = () => {
    const days = 7;
    const now = new Date();
    const statusHistory: { date: Date; status: string }[] = [];

    // Create array for last 7 days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // Default to operational
      let dayStatus = 'operational';

      // Check if there were any incidents on this day
      if (incidents && incidents.length > 0) {
        for (const incident of incidents) {
          const incidentStart = new Date(incident.created_at);
          const incidentEnd = incident.resolved_at
            ? new Date(incident.resolved_at)
            : new Date(); // Still ongoing

          incidentStart.setHours(0, 0, 0, 0);
          incidentEnd.setHours(23, 59, 59, 999);

          // Check if incident overlaps with this day
          if (date >= incidentStart && date <= incidentEnd) {
            // Use worst status if multiple incidents
            if (incident.impact === 'critical' || incident.impact === 'major') {
              dayStatus = 'major_outage';
            } else if (dayStatus !== 'major_outage' && (incident.impact === 'minor' || incident.status === 'investigating')) {
              dayStatus = 'degraded_performance';
            }
          }
        }
      }

      // Today gets current status
      if (i === 0) {
        dayStatus = currentStatus;
      }

      statusHistory.push({ date, status: dayStatus });
    }

    return statusHistory;
  };

  const history = generateStatusHistory();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return '#10b981';
      case 'degraded_performance':
      case 'partial_outage':
        return '#f59e0b';
      case 'major_outage':
        return '#ef4444';
      case 'under_maintenance':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded_performance':
        return 'Degraded';
      case 'partial_outage':
        return 'Partial Outage';
      case 'major_outage':
        return 'Major Outage';
      case 'under_maintenance':
        return 'Maintenance';
      default:
        return 'Unknown';
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', marginLeft: '4px' }}>
      {history.map((day, index) => (
        <div
          key={index}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: day.status === 'operational'
              ? 'rgba(16, 185, 129, 0.3)'
              : day.status === 'major_outage'
              ? 'rgba(239, 68, 68, 0.6)'
              : 'rgba(245, 158, 11, 0.5)',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          title={`${day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${getStatusLabel(day.status)}`}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = getStatusColor(day.status);
            e.currentTarget.style.transform = 'scale(1.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = day.status === 'operational'
              ? 'rgba(16, 185, 129, 0.3)'
              : day.status === 'major_outage'
              ? 'rgba(239, 68, 68, 0.6)'
              : 'rgba(245, 158, 11, 0.5)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />
      ))}
    </div>
  );
}
