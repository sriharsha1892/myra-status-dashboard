export default function SkeletonCard() {
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    >
      {/* Provider header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          {/* Provider name */}
          <div
            style={{
              height: '20px',
              width: '120px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          {/* Status text */}
          <div
            style={{
              height: '14px',
              width: '100px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
            }}
          />
        </div>
        {/* Status badge */}
        <div
          style={{
            height: '24px',
            width: '80px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
          }}
        />
      </div>

      {/* Uptime skeleton */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              height: '12px',
              width: '80px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
            }}
          />
          <div
            style={{
              height: '16px',
              width: '50px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      {/* Services monitored skeleton */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              height: '12px',
              width: '100px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
            }}
          />
          <div
            style={{
              height: '16px',
              width: '30px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
