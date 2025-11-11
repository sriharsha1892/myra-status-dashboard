'use client';

import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface SparklineData {
  value: number;
}

interface SparklineClusterProps {
  data: SparklineData[];
  type?: 'line' | 'area';
  color?: string;
  height?: number;
  width?: number | string;
  showTrend?: boolean;
  animated?: boolean;
  strokeWidth?: number;
}

export default function SparklineCluster({
  data,
  type = 'line',
  color = 'rgb(59, 130, 246)',
  height = 40,
  width = '100%',
  showTrend = true,
  animated = true,
  strokeWidth = 2,
}: SparklineClusterProps) {
  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return 0;
    const first = data[0].value;
    const last = data[data.length - 1].value;
    return ((last - first) / first) * 100;
  };

  const trend = calculateTrend();
  const isPositive = trend > 0;
  const isNeutral = Math.abs(trend) < 1;

  // Gradient for area chart
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1, ease: 'easeInOut' },
        opacity: { duration: 0.3 },
      },
    },
  };

  return (
    <motion.div
      className="flex items-center gap-3"
      variants={containerVariants}
      initial={animated ? 'hidden' : 'visible'}
      animate="visible"
    >
      {/* Sparkline chart */}
      <div className="relative" style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={strokeWidth}
                dot={false}
                isAnimationActive={animated}
                animationDuration={1000}
                animationEasing="ease-in-out"
              />
            </LineChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={strokeWidth}
                fill={`url(#${gradientId})`}
                isAnimationActive={animated}
                animationDuration={1000}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>

        {/* Glow effect */}
        <div
          className="absolute inset-0 blur-sm opacity-30 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)` }}
        />
      </div>

      {/* Trend indicator */}
      {showTrend && (
        <motion.div
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
            isNeutral
              ? 'bg-gray-100 text-gray-700'
              : isPositive
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          {!isNeutral && (
            <svg
              className={`w-3 h-3 ${isPositive ? 'rotate-0' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          )}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </motion.div>
      )}
    </motion.div>
  );
}

// Export a mini version for use in tables
export function MiniSparkline({
  data,
  color = 'rgb(59, 130, 246)',
  height = 24,
}: {
  data: SparklineData[];
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ width: 80, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
