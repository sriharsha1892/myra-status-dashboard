'use client';

import { motion } from 'framer-motion';
import { useState, useCallback, memo } from 'react';

interface ChromaticShiftProps {
  children: React.ReactNode;
  intensity?: number; // 0-1, default 0.5
}

function ChromaticShiftComponent({ children, intensity = 0.5 }: ChromaticShiftProps) {
  const [isHovered, setIsHovered] = useState(false);

  const shift = intensity * 2; // Max 2px shift

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Red channel */}
      <motion.div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-0"
        animate={{
          x: isHovered ? -shift : 0,
          opacity: isHovered ? 0.3 : 0,
        }}
        transition={{ duration: 0.2 }}
        style={{
          filter: 'url(#red-channel)',
          willChange: 'transform, opacity',
        }}
      >
        <div className="absolute inset-0 bg-red-500/20" />
      </motion.div>

      {/* Blue channel */}
      <motion.div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-0"
        animate={{
          x: isHovered ? shift : 0,
          opacity: isHovered ? 0.3 : 0,
        }}
        transition={{ duration: 0.2 }}
        style={{
          filter: 'url(#blue-channel)',
          willChange: 'transform, opacity',
        }}
      >
        <div className="absolute inset-0 bg-blue-500/20" />
      </motion.div>

      {/* Main content */}
      <div className="relative z-10" style={{ pointerEvents: 'auto' }}>{children}</div>

      {/* SVG Filters */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="red-channel">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
            />
          </filter>
          <filter id="blue-channel">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

// Memoize component with proper comparison
export const ChromaticShift = memo(ChromaticShiftComponent, (prevProps, nextProps) => {
  return (
    prevProps.intensity === nextProps.intensity &&
    prevProps.children === nextProps.children
  );
});
