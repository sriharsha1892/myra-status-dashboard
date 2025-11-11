'use client';

import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useRef, useCallback, memo } from 'react';

interface HolographicOverlayProps {
  intensity?: number; // 0-1, default 0.3
  children: React.ReactNode;
}

// Throttle utility function
const throttle = (func: Function, delay: number) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

function HolographicOverlayComponent({ intensity = 0.3, children }: HolographicOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse position values
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Smooth spring animation
  const springConfig = { damping: 30, stiffness: 300 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  // Transform to gradient position
  const gradientX = useTransform(x, [0, 1], [0, 100]);
  const gradientY = useTransform(y, [0, 1], [0, 100]);

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const xPos = (e.clientX - rect.left) / rect.width;
      const yPos = (e.clientY - rect.top) / rect.height;

      mouseX.set(xPos);
      mouseY.set(yPos);
    }, 16), // ~60fps
    []
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Holographic gradient that follows cursor */}
      <motion.div
        className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(
            600px circle at ${gradientX}% ${gradientY}%,
            rgba(147, 51, 234, ${intensity * 0.15}),
            rgba(59, 130, 246, ${intensity * 0.12}),
            rgba(16, 185, 129, ${intensity * 0.10}),
            rgba(245, 158, 11, ${intensity * 0.08}),
            transparent 50%
          )`,
          willChange: 'transform, opacity',
        }}
      />

      {/* Animated rainbow shimmer */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-700">
        <div
          className="absolute inset-0 animate-[gradientShift_8s_ease-in-out_infinite]"
          style={{
            background: `linear-gradient(
              135deg,
              transparent 0%,
              rgba(147, 51, 234, ${intensity * 0.08}) 25%,
              rgba(59, 130, 246, ${intensity * 0.08}) 50%,
              rgba(16, 185, 129, ${intensity * 0.08}) 75%,
              transparent 100%
            )`,
            backgroundSize: '200% 200%',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Iridescent edge glow */}
      <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-500"
        style={{
          boxShadow: `
            inset 0 0 20px rgba(147, 51, 234, ${intensity * 0.1}),
            inset 0 0 30px rgba(59, 130, 246, ${intensity * 0.08})
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10" style={{ pointerEvents: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

// Memoize component with proper comparison
export const HolographicOverlay = memo(HolographicOverlayComponent, (prevProps, nextProps) => {
  return (
    prevProps.intensity === nextProps.intensity &&
    prevProps.children === nextProps.children
  );
});
