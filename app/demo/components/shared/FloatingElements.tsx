'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface FloatingElementProps {
  type: 'dollar' | 'clock' | 'question' | 'check';
  delay?: number;
  duration?: number;
  className?: string;
}

// Individual floating element
export function FloatingElement({
  type,
  delay = 0,
  duration = 3,
  className = '',
}: FloatingElementProps) {
  const icons = {
    dollar: '$',
    clock: '⏱',
    question: '?',
    check: '✓',
  };

  const colors = {
    dollar: 'text-red-400',
    clock: 'text-amber-400',
    question: 'text-orange-400',
    check: 'text-emerald-400',
  };

  return (
    <motion.div
      className={`absolute text-2xl font-bold ${colors[type]} ${className}`}
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -60, -100, -140],
        scale: [0.5, 1, 1, 0.8],
        x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
        times: [0, 0.2, 0.7, 1],
      }}
    >
      {icons[type]}
    </motion.div>
  );
}

interface FloatingElementsContainerProps {
  type: 'dollar' | 'clock' | 'question' | 'check';
  count?: number;
  duration?: number;
  staggerDelay?: number;
  repeat?: boolean;
  className?: string;
}

// Container that spawns multiple floating elements
export function FloatingElementsContainer({
  type,
  count = 5,
  duration = 3,
  staggerDelay = 0.3,
  repeat = true,
  className = '',
}: FloatingElementsContainerProps) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!repeat) return;

    const interval = setInterval(() => {
      setCycle((c) => c + 1);
    }, (duration + staggerDelay * count) * 1000);

    return () => clearInterval(interval);
  }, [repeat, duration, staggerDelay, count]);

  return (
    <div className={`relative ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <FloatingElement
          key={`${cycle}-${i}`}
          type={type}
          delay={i * staggerDelay}
          duration={duration}
        />
      ))}
    </div>
  );
}

// Pulsing glow effect for pain points
interface PulsingGlowProps {
  color?: 'red' | 'amber' | 'green';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function PulsingGlow({
  color = 'red',
  intensity = 'medium',
  className = '',
}: PulsingGlowProps) {
  const colors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
  };

  const opacities = {
    low: '0.2',
    medium: '0.4',
    high: '0.6',
  };

  const sizes = {
    low: 'blur-xl',
    medium: 'blur-2xl',
    high: 'blur-3xl',
  };

  return (
    <motion.div
      className={`absolute inset-0 ${colors[color]} ${sizes[intensity]} ${className}`}
      animate={{
        opacity: [0, parseFloat(opacities[intensity]), 0],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ borderRadius: 'inherit' }}
    />
  );
}

// Animated connecting arrow
interface AnimatedArrowProps {
  direction?: 'right' | 'down';
  color?: 'red' | 'green' | 'gray';
  animated?: boolean;
  className?: string;
}

export function AnimatedArrow({
  direction = 'right',
  color = 'gray',
  animated = true,
  className = '',
}: AnimatedArrowProps) {
  const colors = {
    red: 'stroke-red-400',
    green: 'stroke-emerald-400',
    gray: 'stroke-white/30',
  };

  const isHorizontal = direction === 'right';

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={isHorizontal ? '0 0 60 20' : '0 0 20 60'}
        className={`${isHorizontal ? 'w-12 h-5' : 'w-5 h-12'} ${colors[color]}`}
        fill="none"
        strokeWidth="2"
      >
        {isHorizontal ? (
          <>
            <motion.line
              x1="0"
              y1="10"
              x2="50"
              y2="10"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: animated ? 1 : 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            <motion.polyline
              points="45,5 55,10 45,15"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            />
          </>
        ) : (
          <>
            <motion.line
              x1="10"
              y1="0"
              x2="10"
              y2="50"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: animated ? 1 : 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            <motion.polyline
              points="5,45 10,55 15,45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            />
          </>
        )}
      </svg>

      {/* Animated dot traveling along the arrow */}
      {animated && (
        <motion.div
          className={`absolute w-2 h-2 rounded-full ${
            color === 'red'
              ? 'bg-red-400'
              : color === 'green'
              ? 'bg-emerald-400'
              : 'bg-white/50'
          }`}
          animate={
            isHorizontal
              ? { x: [0, 40, 0], opacity: [0, 1, 0] }
              : { y: [0, 40, 0], opacity: [0, 1, 0] }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={
            isHorizontal
              ? { top: '50%', left: 0, marginTop: '-4px' }
              : { left: '50%', top: 0, marginLeft: '-4px' }
          }
        />
      )}
    </div>
  );
}
