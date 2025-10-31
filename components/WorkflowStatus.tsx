'use client';

import React from 'react';
import { ProviderStatus } from '@/lib/types';
import { WORKFLOW_STAGES, getStageStatus } from '@/lib/workflow-config';
import { useViewMode } from '@/contexts/ViewModeContext';

interface WorkflowStatusProps {
  providers: ProviderStatus[];
}

export default function WorkflowStatus({ providers }: WorkflowStatusProps) {
  const { isAdminView } = useViewMode();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#10b981', dot: '#10b981' };
      case 'degraded':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#f59e0b', dot: '#f59e0b' };
      case 'outage':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', dot: '#ef4444' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.4)', text: '#9ca3af', dot: '#9ca3af' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return '✓';
      case 'degraded':
        return '!';
      case 'outage':
        return '✕';
      default:
        return '?';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'outage':
        return 'Outage';
      default:
        return 'Unknown';
    }
  };

  // Calculate overall workflow health
  const stageStatuses = WORKFLOW_STAGES.map(stage => getStageStatus(stage, providers));
  const allOperational = stageStatuses.every(s => s === 'operational');
  const hasOutage = stageStatuses.some(s => s === 'outage');
  const hasDegraded = stageStatuses.some(s => s === 'degraded');

  const overallMessage = allOperational
    ? 'All Research Stages Operational'
    : hasOutage
    ? 'Research Workflow Disrupted'
    : 'Research Workflow Degraded';

  const overallColor = allOperational
    ? getStatusColor('operational')
    : hasOutage
    ? getStatusColor('outage')
    : getStatusColor('degraded');

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Overall Status Header */}
      <div
        style={{
          background: overallColor.bg,
          border: `2px solid ${overallColor.border}`,
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: overallColor.dot,
                boxShadow: `0 0 8px ${overallColor.dot}`,
              }}
            />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                {overallMessage}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                {WORKFLOW_STAGES.length} workflow stages • Last checked: {new Date().toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'GMT'
                })} GMT
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
            {stageStatuses.filter(s => s === 'operational').length}/{WORKFLOW_STAGES.length} stages healthy
          </div>
        </div>
      </div>

      {/* Workflow Stages */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '16px',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}
        >
          Research Workflow Pipeline
        </h3>

        <div style={{ position: 'relative' }}>
          {/* Connecting line */}
          <div
            style={{
              position: 'absolute',
              left: '19px',
              top: '30px',
              bottom: '30px',
              width: '2px',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
            }}
          />

          {WORKFLOW_STAGES.map((stage, index) => {
            const status = getStageStatus(stage, providers);
            const colors = getStatusColor(status);

            return (
              <div
                key={stage.id}
                style={{
                  position: 'relative',
                  marginBottom: index < WORKFLOW_STAGES.length - 1 ? '20px' : '0',
                  paddingLeft: '48px',
                }}
              >
                {/* Stage number badge */}
                <div
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '4px',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: colors.text,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {index + 1}
                </div>

                {/* Stage content */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isAdminView ? '4px' : '0' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                          {stage.name}
                        </div>
                        <div
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            fontSize: '10px',
                            fontWeight: 700,
                            color: colors.text,
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {getStatusText(status)}
                        </div>
                      </div>
                      {isAdminView && (
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.4' }}>
                          {stage.description}
                        </div>
                      )}
                    </div>

                    {isAdminView && (
                      <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'right' }}>
                        <div style={{ marginBottom: '2px' }}>
                          <strong>Services:</strong> {stage.primaryServices.join(', ')}
                        </div>
                        {stage.requiredModels && stage.requiredModels.length > 0 && (
                          <div>
                            <strong>Models:</strong> {stage.requiredModels.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Operational</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Degraded Performance</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Service Outage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
