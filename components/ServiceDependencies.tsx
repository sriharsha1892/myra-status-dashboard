'use client';

import React from 'react';
import { ProviderStatus } from '@/lib/types';
import { PROVIDERS } from '@/lib/providers';

interface ServiceDependenciesProps {
  providers: ProviderStatus[];
}

export default function ServiceDependencies({ providers }: ServiceDependenciesProps) {
  // Find services with issues
  const servicesWithIssues = providers.filter(
    (p) => p.status !== 'operational' && p.provider.priority === 'primary'
  );

  if (servicesWithIssues.length === 0) {
    return null; // Don't show if everything is operational
  }

  // For each service with issues, find what depends on it
  const getImpactedServices = (serviceId: string) => {
    return PROVIDERS.filter(
      (p) => p.dependsOn?.includes(serviceId) && p.priority === 'primary'
    );
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: '16px',
          letterSpacing: '-0.01em',
        }}
      >
        Impact Radius
      </h2>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        {servicesWithIssues.map((service) => {
          const impactedServices = getImpactedServices(service.provider.id);
          const hasDownstream = impactedServices.length > 0;

          return (
            <div
              key={service.provider.id}
              style={{
                marginBottom: servicesWithIssues.length > 1 ? '20px' : '0',
                paddingBottom: servicesWithIssues.length > 1 ? '20px' : '0',
                borderBottom:
                  servicesWithIssues.length > 1
                    ? '1px solid rgba(255, 255, 255, 0.05)'
                    : 'none',
              }}
            >
              {/* Affected Service */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: hasDownstream ? '16px' : '0',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background:
                      service.status === 'major_outage'
                        ? '#ef4444'
                        : service.status === 'partial_outage'
                        ? '#f59e0b'
                        : '#f59e0b',
                    boxShadow: '0 0 8px currentColor',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    {service.provider.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginTop: '2px',
                    }}
                  >
                    {service.provider.impacts}
                  </div>
                </div>
              </div>

              {/* Downstream Impact */}
              {hasDownstream && (
                <div
                  style={{
                    marginLeft: '20px',
                    paddingLeft: '20px',
                    borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    May Also Affect
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {impactedServices.map((impacted) => {
                      const impactedStatus = providers.find(
                        (p) => p.provider.id === impacted.id
                      );
                      const isActuallyAffected =
                        impactedStatus && impactedStatus.status !== 'operational';

                      return (
                        <div
                          key={impacted.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: isActuallyAffected
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '6px',
                            border: isActuallyAffected
                              ? '1px solid rgba(245, 158, 11, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isActuallyAffected
                                ? '#f59e0b'
                                : 'rgba(255, 255, 255, 0.3)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '12px',
                              color: isActuallyAffected
                                ? 'rgba(255, 255, 255, 0.9)'
                                : 'rgba(255, 255, 255, 0.6)',
                            }}
                          >
                            {impacted.displayName}
                          </span>
                          {isActuallyAffected && (
                            <span
                              style={{
                                marginLeft: 'auto',
                                fontSize: '10px',
                                color: 'rgba(245, 158, 11, 0.8)',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              Affected
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special message for Platform Infrastructure */}
              {service.provider.id === 'aws' && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.5',
                  }}
                >
                  Platform Infrastructure is the foundation for all services. Issues here
                  may cause slowdowns or interruptions across the entire platform.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
