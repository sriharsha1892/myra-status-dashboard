'use client';

import { motion } from 'framer-motion';

interface StatusGlowProps {
  color: string; // Hex color
  intensity?: 'low' | 'medium' | 'high';
  pulse?: boolean;
}

export function StatusGlow({ color, intensity = 'medium', pulse = true }: StatusGlowProps) {
  // Convert intensity to numeric values
  const intensityMap = {
    low: { blur: 20, opacity: 0.15, scale: 1.1 },
    medium: { blur: 30, opacity: 0.25, scale: 1.15 },
    high: { blur: 40, opacity: 0.35, scale: 1.2 },
  };

  const settings = intensityMap[intensity];

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <>
      {/* Primary glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          boxShadow: `0 0 ${settings.blur}px ${hexToRgba(color, settings.opacity)},
                      0 0 ${settings.blur * 1.5}px ${hexToRgba(color, settings.opacity * 0.6)}`,
        }}
        animate={pulse ? {
          opacity: [0.5, 1, 0.5],
          scale: [1, settings.scale, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary outer glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          boxShadow: `0 0 ${settings.blur * 2}px ${hexToRgba(color, settings.opacity * 0.3)}`,
          filter: `blur(${settings.blur / 2}px)`,
        }}
        animate={pulse ? {
          opacity: [0.3, 0.6, 0.3],
          scale: [1, settings.scale * 1.05, 1],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />

      {/* Inner highlight */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 ${settings.blur / 2}px ${hexToRgba(color, settings.opacity * 0.4)}`,
        }}
      />
    </>
  );
}
