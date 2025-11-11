'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { ReactNode, useRef } from 'react';

interface MetricCard3DProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  gradient?: string;
  glowColor?: string;
  children?: ReactNode;
}

export default function MetricCard3D({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient = 'from-blue-500 to-accent-600',
  glowColor = 'rgba(59, 130, 246, 0.3)',
  children,
}: MetricCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse position tracking for 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring animations for smooth following
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), {
    stiffness: 100,
    damping: 15,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), {
    stiffness: 100,
    damping: 15,
  });

  // Glow position
  const glowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), {
    stiffness: 100,
    damping: 20,
  });
  const glowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), {
    stiffness: 100,
    damping: 20,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseXNormalized = (e.clientX - centerX) / (rect.width / 2);
    const mouseYNormalized = (e.clientY - centerY) / (rect.height / 2);

    mouseX.set(mouseXNormalized);
    mouseY.set(mouseYNormalized);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-2xl"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        {/* Animated glow effect */}
        <motion.div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px circle at ${glowX}% ${glowY}%, ${glowColor}, transparent 40%)`,
          }}
        />

        {/* Gradient border accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />

        {/* Content */}
        <div className="relative p-6 transform-gpu" style={{ transform: 'translateZ(20px)' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
              <motion.div
                className="text-3xl font-bold text-gray-900"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                {value}
              </motion.div>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>

            {/* Icon with gradient background */}
            <motion.div
              className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
              style={{ transform: 'translateZ(40px)' }}
              whileHover={{ rotate: 360, transition: { duration: 0.6 } }}
            >
              <Icon className="w-6 h-6 text-white" />
            </motion.div>
          </div>

          {/* Trend indicator */}
          {trend && (
            <motion.div
              className="flex items-center gap-2 mb-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div
                className={`text-sm font-semibold ${
                  trend.value > 0
                    ? 'text-green-600'
                    : trend.value < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </div>
              <div className="text-xs text-gray-500">{trend.label}</div>
            </motion.div>
          )}

          {/* Additional content */}
          {children && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {children}
            </motion.div>
          )}
        </div>

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'linear',
            repeatDelay: 2,
          }}
          style={{ transform: 'skewX(-20deg)' }}
        />
      </motion.div>
    </motion.div>
  );
}
