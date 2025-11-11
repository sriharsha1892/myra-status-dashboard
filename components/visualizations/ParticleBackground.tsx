'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Particle {
  id: number;
  size: number;
  x: string;
  y: string;
  duration: number;
  delay: number;
  opacity: number;
}

interface ParticleBackgroundProps {
  count?: number;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  speed?: 'slow' | 'medium' | 'fast';
  density?: 'sparse' | 'normal' | 'dense';
}

export default function ParticleBackground({
  count = 30,
  color = 'rgb(59, 130, 246)',
  size = 'medium',
  speed = 'slow',
  density = 'normal',
}: ParticleBackgroundProps) {
  const sizeMap = {
    small: { min: 1, max: 3 },
    medium: { min: 2, max: 6 },
    large: { min: 4, max: 10 },
  };

  const speedMap = {
    slow: { min: 20, max: 40 },
    medium: { min: 10, max: 20 },
    fast: { min: 5, max: 15 },
  };

  const densityCount = {
    sparse: Math.floor(count * 0.5),
    normal: count,
    dense: Math.floor(count * 1.5),
  };

  const particles: Particle[] = useMemo(() => {
    const particleCount = densityCount[density];
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      size: Math.random() * (sizeMap[size].max - sizeMap[size].min) + sizeMap[size].min,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      duration: Math.random() * (speedMap[speed].max - speedMap[speed].min) + speedMap[speed].min,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, [count, size, speed, density]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
            opacity: particle.opacity,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.2, 1],
            opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        />
      ))}

      {/* Add some larger, slower "focal" particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`focal-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${20 + i * 30}%`,
            top: `${30 + i * 20}%`,
            width: sizeMap[size].max * 3,
            height: sizeMap[size].max * 3,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            opacity: 0.15,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25 + i * 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 2,
          }}
        />
      ))}

      {/* Connecting lines between particles (subtle) */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {particles.slice(0, 10).map((particle, i) => {
          const nextParticle = particles[(i + 1) % 10];
          return (
            <motion.line
              key={`line-${i}`}
              x1={particle.x}
              y1={particle.y}
              x2={nextParticle.x}
              y2={nextParticle.y}
              stroke="url(#line-gradient)"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.5,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
