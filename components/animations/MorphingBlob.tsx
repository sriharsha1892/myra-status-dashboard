'use client';

import { motion } from 'framer-motion';

interface MorphingBlobProps {
  color?: string;
  size?: number; // in pixels, default 400
  delay?: number; // animation delay
  opacity?: number; // 0-1, default 0.2
}

export function MorphingBlob({
  color = '#3b82f6',
  size = 400,
  delay = 0,
  opacity = 0.2,
}: MorphingBlobProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${Math.random() * 80}%`,
        top: `${Math.random() * 80}%`,
      }}
      animate={{
        x: [0, 30, -20, 40, 0],
        y: [0, -40, 30, -20, 0],
        scale: [1, 1.1, 0.9, 1.05, 1],
        rotate: [0, 90, 180, 270, 360],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      <motion.div
        className="w-full h-full rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
        }}
        animate={{
          borderRadius: [
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "30% 60% 70% 40% / 50% 60% 30% 60%",
            "50% 60% 30% 70% / 30% 70% 50% 60%",
            "40% 50% 60% 30% / 70% 40% 60% 50%",
            "60% 40% 30% 70% / 60% 30% 70% 40%",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

// Container component for multiple blobs
export function BlobBackground({ statusColor }: { statusColor?: string }) {
  // Generate complementary colors based on status
  const getColors = () => {
    switch (statusColor) {
      case '#2563eb': // Planned (blue)
        return ['#3b82f6', '#8b5cf6', '#06b6d4'];
      case '#f97316': // In Progress (orange)
        return ['#f97316', '#f59e0b', '#ef4444'];
      case '#059669': // Completed (emerald)
        return ['#10b981', '#14b8a6', '#22c55e'];
      case '#64748b': // Cancelled (slate)
        return ['#64748b', '#94a3b8', '#475569'];
      default:
        return ['#3b82f6', '#8b5cf6', '#06b6d4'];
    }
  };

  const colors = getColors();

  return (
    <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
      <MorphingBlob color={colors[0]} size={300} delay={0} opacity={0.15} />
      <MorphingBlob color={colors[1]} size={250} delay={2} opacity={0.12} />
      <MorphingBlob color={colors[2]} size={200} delay={4} opacity={0.1} />
    </div>
  );
}
