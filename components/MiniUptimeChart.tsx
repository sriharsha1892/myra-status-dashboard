'use client';

interface MiniUptimeChartProps {
  history: Array<{ timestamp: string; status: string }>;
  height?: number;
  width?: number;
}

export default function MiniUptimeChart({ history, height = 40, width = 200 }: MiniUptimeChartProps) {
  if (!history || history.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>No data</span>
      </div>
    );
  }

  // Sample data points to fit width
  const maxPoints = 50;
  const step = Math.max(1, Math.floor(history.length / maxPoints));
  const sampledData = history.filter((_, i) => i % step === 0).slice(-maxPoints);

  // Calculate uptime percentage for each point
  const dataPoints = sampledData.map((check, index) => {
    const isOperational = check.status === 'operational';
    return {
      x: (index / (sampledData.length - 1 || 1)) * width,
      y: isOperational ? 0 : height,
      status: check.status,
      timestamp: check.timestamp,
    };
  });

  // Create area path
  const createPath = () => {
    if (dataPoints.length === 0) return '';

    const points = dataPoints.map((p) => `${p.x},${p.y}`).join(' L');
    return `M0,${height} L${points} L${width},${height} Z`;
  };

  // Create line path
  const createLine = () => {
    if (dataPoints.length === 0) return '';
    return dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  };

  const uptime = ((dataPoints.filter(p => p.status === 'operational').length / dataPoints.length) * 100).toFixed(1);

  return (
    <div style={{ position: 'relative', width, height, borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.02)' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Gradient definition */}
        <defs>
          <linearGradient id="uptimeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={createPath()}
          fill="url(#uptimeGradient)"
          opacity="0.8"
        />

        {/* Line */}
        <path
          d={createLine()}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Data points - only show failures */}
        {dataPoints.filter(p => p.status !== 'operational').map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#ef4444"
            opacity="1"
            stroke="#fff"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}
