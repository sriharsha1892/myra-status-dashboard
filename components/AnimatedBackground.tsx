'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const particleCount = window.innerWidth < 768 ? 30 : 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() < 0.7 ? Math.random() * 40 + 240 : Math.random() * 30 + 170, // Mix of purple-blue (240-280) and teal-cyan (170-200)
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

    for (let i = 0; i < 5; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      meshPoints.push({
        x,
        y,
        baseX: x,
        baseY: y,
        angle: Math.random() * Math.PI * 2,
        radius: 100 + Math.random() * 100,
        speed: 0.0005 + Math.random() * 0.001,
      });
    }

    let animationFrame: number;

    const animate = () => {
      ctx.fillStyle = 'rgba(17, 24, 39, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animate mesh points
      meshPoints.forEach((point) => {
        point.angle += point.speed;
        point.x = point.baseX + Math.cos(point.angle) * point.radius;
        point.y = point.baseY + Math.sin(point.angle) * point.radius;
      });

      // Draw animated gradient mesh with unique teal-purple mix
      const gradient = ctx.createRadialGradient(
        meshPoints[0].x,
        meshPoints[0].y,
        0,
        meshPoints[0].x,
        meshPoints[0].y,
        canvas.width * 0.5
      );
      gradient.addColorStop(0, 'rgba(88, 80, 236, 0.15)');
      gradient.addColorStop(0.5, 'rgba(94, 114, 228, 0.08)');
      gradient.addColorStop(1, 'rgba(17, 24, 39, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Secondary gradient with teal accent
      const gradient2 = ctx.createRadialGradient(
        meshPoints[2]?.x || canvas.width / 2,
        meshPoints[2]?.y || canvas.height / 2,
        0,
        meshPoints[2]?.x || canvas.width / 2,
        meshPoints[2]?.y || canvas.height / 2,
        canvas.width * 0.4
      );
      gradient2.addColorStop(0, 'rgba(45, 212, 191, 0.10)');
      gradient2.addColorStop(0.5, 'rgba(59, 130, 246, 0.06)');
      gradient2.addColorStop(1, 'rgba(17, 24, 39, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - particle.x;
          const dy = particles[j].y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `hsla(${particle.hue}, 70%, 60%, ${0.15 * (1 - distance / 150)})`;
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

      // Draw grid pattern (responsive)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = window.innerWidth < 768 ? 40 : 30;

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

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

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
      {/* Additional overlay for depth with unique teal-purple accent */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(88, 80, 236, 0.1) 0%, transparent 40%), radial-gradient(ellipse at 80% 50%, rgba(45, 212, 191, 0.06) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
