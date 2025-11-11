'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';

interface HolographicChartProps {
  data: any[];
  type?: 'bar' | 'line' | 'area';
  dataKey: string;
  xAxisKey: string;
  title?: string;
  subtitle?: string;
  gradient?: string;
  height?: number;
  children?: ReactNode;
  additionalLines?: Array<{ dataKey: string; color: string; name?: string }>;
}

export default function HolographicChart({
  data,
  type = 'bar',
  dataKey,
  xAxisKey,
  title,
  subtitle,
  gradient = 'from-blue-400 to-accent-600',
  height = 300,
  children,
  additionalLines = [],
}: HolographicChartProps) {
  // Custom tooltip with glass effect
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-xl p-4 shadow-2xl"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-semibold text-gray-900">{entry.value}</span>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const chartComponents = (
      <>
        <defs>
          <linearGradient id="holographicGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.8} />
            <stop offset="100%" stopColor="rgb(147, 51, 234)" stopOpacity={0.3} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          stroke="#9CA3AF"
          style={{ fontSize: '12px', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#9CA3AF"
          style={{ fontSize: '12px', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
      </>
    );

    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {chartComponents}
            <Bar
              dataKey={dataKey}
              fill="url(#holographicGradient)"
              radius={[8, 8, 0, 0]}
              filter="url(#glow)"
            />
            {additionalLines.map((line, index) => (
              <Bar
                key={index}
                dataKey={line.dataKey}
                fill={line.color}
                radius={[8, 8, 0, 0]}
                name={line.name}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {chartComponents}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="rgb(59, 130, 246)"
              strokeWidth={3}
              dot={{ r: 5, fill: 'rgb(59, 130, 246)', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: 'rgb(147, 51, 234)' }}
              filter="url(#glow)"
            />
            {additionalLines.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={2}
                dot={{ r: 4, fill: line.color, strokeWidth: 2, stroke: '#fff' }}
                name={line.name}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {chartComponents}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="rgb(59, 130, 246)"
              strokeWidth={3}
              fill="url(#holographicGradient)"
              filter="url(#glow)"
            />
            {additionalLines.map((line, index) => (
              <Area
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={2}
                fill={line.color}
                fillOpacity={0.3}
                name={line.name}
              />
            ))}
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
    >
      {/* Chromatic aberration effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Holographic shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'linear',
          repeatDelay: 5,
        }}
        style={{ transform: 'skewX(-20deg)' }}
      />

      {/* Content */}
      <div className="relative">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-6">
            {title && (
              <motion.h3
                className="text-xl font-bold text-gray-900 mb-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h3>
            )}
            {subtitle && (
              <motion.p
                className="text-sm text-gray-600"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        )}

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        </motion.div>

        {/* Additional content */}
        {children && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {children}
          </motion.div>
        )}
      </div>

      {/* Ambient glow */}
      <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${gradient} rounded-full blur-3xl opacity-20`} />
      <div className={`absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br ${gradient} rounded-full blur-3xl opacity-20`} />
    </motion.div>
  );
}
