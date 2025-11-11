'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, useRef, ReactNode, useCallback, memo } from 'react';

interface MagneticCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  index?: number;
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

function MagneticCardComponent({ children, className = '', onClick, index = 0 }: MagneticCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse position values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring physics for smooth following
  const springConfig = { damping: 25, stiffness: 200 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), springConfig);

  // Glow effect position
  const glowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springConfig);
  const glowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springConfig);

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const mouseXPos = e.clientX - rect.left;
      const mouseYPos = e.clientY - rect.top;

      // Normalize to -0.5 to 0.5
      const xPct = (mouseXPos / width - 0.5) * 2;
      const yPct = (mouseYPos / height - 0.5) * 2;

      mouseX.set(xPct);
      mouseY.set(yPct);
    }, 16), // ~60fps
    []
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.05 + (index * 0.05), // Min 0.05s delay to ensure first card animates properly
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: 'preserve-3d',
        perspective: 1000,
        willChange: 'transform',
      }}
      whileHover={{
        scale: 1.03,
        z: 50,
        transition: { duration: 0.3, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative ${className}`}
    >
      {/* Glow effect that follows cursor */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(59, 130, 246, 0.5), transparent 50%)`,
            willChange: 'background',
          }}
        />
      )}

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-sm pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
          opacity: isHovered ? 1 : 0,
        }}
        animate={{
          backgroundPosition: isHovered ? ['0% 50%', '100% 50%'] : '0% 50%',
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}

// Memoize component with proper comparison
export const MagneticCard = memo(MagneticCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.index === nextProps.index &&
    prevProps.children === nextProps.children
  );
});
