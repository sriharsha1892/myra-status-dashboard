'use client';

import { motion } from 'framer-motion';

interface GradientMeshBgProps {
  variant?: 'warm' | 'cool' | 'purple' | 'sunrise' | 'ocean';
  intensity?: 'subtle' | 'medium' | 'vibrant';
  animated?: boolean;
  className?: string;
}

const gradientConfigs = {
  warm: {
    colors: ['#FFE5B4', '#FFD700', '#FF6B6B', '#FFA07A', '#FFDAB9'],
    positions: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
  },
  cool: {
    colors: ['#E0F7FA', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4'],
    positions: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
  },
  purple: {
    colors: ['#E1BEE7', '#BA68C8', '#9C27B0', '#7B1FA2', '#4A148C'],
    positions: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
  },
  sunrise: {
    colors: ['#FFF3E0', '#FFE082', '#FF6F00', '#FF5722', '#FF9100'],
    positions: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
  },
  ocean: {
    colors: ['#E0F2F1', '#80CBC4', '#00897B', '#00695C', '#004D40'],
    positions: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
  },
};

const intensityOpacity = {
  subtle: 0.3,
  medium: 0.5,
  vibrant: 0.7,
};

export default function GradientMeshBg({
  variant = 'warm',
  intensity = 'subtle',
  animated = true,
  className = '',
}: GradientMeshBgProps) {
  const config = gradientConfigs[variant];
  const opacity = intensityOpacity[intensity];

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-left':
        return 'top-0 left-0';
      case 'top-right':
        return 'top-0 right-0';
      case 'bottom-left':
        return 'bottom-0 left-0';
      case 'bottom-right':
        return 'bottom-0 right-0';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default:
        return 'top-0 left-0';
    }
  };

  const getAnimationVariants = (index: number) => {
    if (!animated) return {};

    const baseDelay = index * 0.5;
    const duration = 8 + index * 2;

    return {
      animate: {
        scale: [1, 1.2, 1],
        opacity: [opacity * 0.7, opacity, opacity * 0.7],
        x: index % 2 === 0 ? [0, 50, 0] : [0, -50, 0],
        y: index % 2 === 0 ? [0, -30, 0] : [0, 30, 0],
      },
      transition: {
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: baseDelay,
      },
    };
  };

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100"
        style={{ zIndex: -1 }}
      />

      {/* Mesh gradient blobs */}
      {config.colors.map((color, index) => (
        <motion.div
          key={index}
          className={`absolute ${getPositionClasses(config.positions[index])} blur-3xl`}
          style={{
            width: '40%',
            height: '40%',
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            opacity,
          }}
          {...getAnimationVariants(index)}
        />
      ))}

      {/* Additional floating orbs for depth */}
      {animated && (
        <>
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, ${config.colors[0]} 0%, transparent 70%)`,
              opacity: opacity * 0.5,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${config.colors[2]} 0%, transparent 70%)`,
              opacity: opacity * 0.4,
            }}
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </>
      )}

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
