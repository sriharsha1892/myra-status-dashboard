'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

export function MiniSparkline({
  data,
  color = '#FF6B6B',
  className = ''
}: MiniSparklineProps) {
  // Convert data array to recharts format
  const chartData = data.map((value, index) => ({
    index,
    value
  }));

  // Determine trend direction
  const isPositive = data.length >= 2 && data[data.length - 1] > data[0];

  return (
    <div className={`w-16 h-8 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#10b981' : color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
