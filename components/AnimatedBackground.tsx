'use client';

import { useEffect, useRef } from 'react';
import { ServiceStatus } from '@/lib/types';

interface AnimatedBackgroundProps {
  /** Overall system status - affects ambient color */
  status?: ServiceStatus;
}

// Status-based color configurations
const STATUS_COLORS = {
  operational: {
    primary: { h: 145, s: 80, l: 55 },    // Emerald green
    secondary: { h: 170, s: 75, l: 45 },  // Teal
    tertiary: { h: 200, s: 70, l: 50 },   // Cyan-blue
    particleHue: [140, 180],              // Green-teal range
    glowOpacity: 0.08,
  },
  degraded_performance: {
    primary: { h: 38, s: 90, l: 55 },     // Amber
    secondary: { h: 30, s: 85, l: 50 },   // Orange-amber
    tertiary: { h: 45, s: 80, l: 55 },    // Yellow-amber
    particleHue: [25, 50],                // Amber-orange range
    glowOpacity: 0.12,
  },
  partial_outage: {
    primary: { h: 25, s: 90, l: 55 },     // Orange
    secondary: { h: 15, s: 85, l: 50 },   // Red-orange
    tertiary: { h: 35, s: 80, l: 50 },    // Orange-amber
    particleHue: [15, 40],                // Orange range
    glowOpacity: 0.14,
  },
  major_outage: {
    primary: { h: 0, s: 85, l: 55 },      // Red
    secondary: { h: 350, s: 80, l: 50 },  // Red-pink
    tertiary: { h: 15, s: 75, l: 50 },    // Orange-red
    particleHue: [350, 20],               // Red range
    glowOpacity: 0.16,
  },
  under_maintenance: {
    primary: { h: 220, s: 80, l: 55 },    // Blue
    secondary: { h: 200, s: 75, l: 50 },  // Cyan-blue
    tertiary: { h: 240, s: 70, l: 55 },   // Purple-blue
    particleHue: [200, 240],              // Blue range
    glowOpacity: 0.10,
  },
  unknown: {
    primary: { h: 260, s: 70, l: 55 },    // Purple (default)
    secondary: { h: 180, s: 65, l: 50 },  // Teal
    tertiary: { h: 280, s: 60, l: 55 },   // Violet
    particleHue: [240, 280],              // Purple-blue range
    glowOpacity: 0.08,
  },
};

export default function AnimatedBackground({ status = 'unknown' }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);

  // Update ref when status changes (allows animation to pick up new colors)
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      hue: number;
    }> = [];

    const particleCount = window.innerWidth < 768 ? 30 : 50; // Reduced for performance

    // Get colors based on current status
    const getStatusColors = () => STATUS_COLORS[statusRef.current] || STATUS_COLORS.unknown;

    for (let i = 0; i < particleCount; i++) {
      const colors = getStatusColors();
      const [hueMin, hueMax] = colors.particleHue;
      // Handle wrap-around for red hues (350-20)
      const hue = hueMax > hueMin
        ? Math.random() * (hueMax - hueMin) + hueMin
        : Math.random() * (360 - hueMin + hueMax) + hueMin;

      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.5 + 0.3,
        hue: hue % 360,
      });
    }

    // Gradient mesh points
    const meshPoints: Array<{
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      angle: number;
      radius: number;
      speed: number;
    }> = [];

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      meshPoints.push({
        x,
        y,
        baseX: x,
        baseY: y,
        angle: Math.random() * Math.PI * 2,
        radius: 150 + Math.random() * 150,
        speed: 0.0003 + Math.random() * 0.0008,
      });
    }

    let animationFrame: number;

    const animate = () => {
      ctx.fillStyle = 'rgba(17, 24, 39, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get current status colors
      const colors = getStatusColors();
      const { primary, secondary, tertiary, glowOpacity } = colors;

      // Helper to create HSL color string
      const hsl = (c: { h: number; s: number; l: number }, a: number) =>
        `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`;

      // Animate mesh points
      meshPoints.forEach((point) => {
        point.angle += point.speed;
        point.x = point.baseX + Math.cos(point.angle) * point.radius;
        point.y = point.baseY + Math.sin(point.angle) * point.radius;
      });

      // Draw animated gradient mesh with status-aware colors
      const gradient = ctx.createRadialGradient(
        meshPoints[0].x,
        meshPoints[0].y,
        0,
        meshPoints[0].x,
        meshPoints[0].y,
        canvas.width * 0.6
      );
      gradient.addColorStop(0, hsl(primary, glowOpacity * 2.5));
      gradient.addColorStop(0.4, hsl(primary, glowOpacity * 1.2));
      gradient.addColorStop(1, 'rgba(17, 24, 39, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Secondary gradient with status color
      const gradient2 = ctx.createRadialGradient(
        meshPoints[2]?.x || canvas.width / 2,
        meshPoints[2]?.y || canvas.height / 2,
        0,
        meshPoints[2]?.x || canvas.width / 2,
        meshPoints[2]?.y || canvas.height / 2,
        canvas.width * 0.5
      );
      gradient2.addColorStop(0, hsl(secondary, glowOpacity * 1.8));
      gradient2.addColorStop(0.4, hsl(secondary, glowOpacity));
      gradient2.addColorStop(1, 'rgba(17, 24, 39, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Third gradient for depth
      const gradient3 = ctx.createRadialGradient(
        meshPoints[5]?.x || canvas.width * 0.7,
        meshPoints[5]?.y || canvas.height * 0.3,
        0,
        meshPoints[5]?.x || canvas.width * 0.7,
        meshPoints[5]?.y || canvas.height * 0.3,
        canvas.width * 0.45
      );
      gradient3.addColorStop(0, hsl(tertiary, glowOpacity * 1.5));
      gradient3.addColorStop(0.5, hsl(tertiary, glowOpacity * 0.8));
      gradient3.addColorStop(1, 'rgba(17, 24, 39, 0)');
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles (optimized)
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with reduced glow (performance)
        ctx.shadowBlur = 10; // Reduced from 20
        ctx.shadowColor = `hsla(${particle.hue}, 80%, 65%, ${particle.opacity * 0.5})`;
        ctx.fillStyle = `hsla(${particle.hue}, 80%, 65%, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby particles (optimized)
        // Only check next 10 particles instead of all
        const maxCheck = Math.min(i + 10, particles.length);
        for (let j = i + 1; j < maxCheck; j++) {
          const dx = particles[j].x - particle.x;
          const dy = particles[j].y - particle.y;

          // Quick distance check before expensive sqrt
          if (Math.abs(dx) > 150 || Math.abs(dy) > 150) continue;

          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) { // Reduced from 200
            ctx.shadowBlur = 0; // No shadow for lines (performance)
            ctx.strokeStyle = `hsla(${particle.hue}, 80%, 65%, ${0.2 * (1 - distance / 150)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      });

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw grid pattern - only every 10th frame for performance
      if (Math.random() > 0.9) { // Randomized to reduce aliasing
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'; // Reduced opacity
        ctx.lineWidth = 1;
        const gridSize = window.innerWidth < 768 ? 60 : 50; // Larger grid = fewer lines

        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Get current overlay colors based on status
  const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const { primary, secondary, glowOpacity } = colors;

  // Generate overlay gradient based on status
  const overlayGradient = `
    radial-gradient(ellipse at 50% 0%, hsla(${primary.h}, ${primary.s}%, ${primary.l}%, ${glowOpacity * 1.2}) 0%, transparent 40%),
    radial-gradient(ellipse at 80% 50%, hsla(${secondary.h}, ${secondary.s}%, ${secondary.l}%, ${glowOpacity * 0.75}) 0%, transparent 50%)
  `;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
      {/* Status-aware overlay for ambient glow effect */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          background: overlayGradient,
          pointerEvents: 'none',
          transition: 'background 1s ease-in-out',
        }}
      />
    </>
  );
}
