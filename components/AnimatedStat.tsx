'use client';

import { useEffect, useState } from 'react';

interface AnimatedStatProps {
  value: number;
  label: string;
  suffix?: string;
  color?: string;
  delay?: number;
}

export default function AnimatedStat({
  value,
  label,
  suffix = '',
  color = '#10b981',
  delay = 0,
}: AnimatedStatProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1000; // 1 second
    const steps = 60;
    const stepValue = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(stepValue * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value, isVisible]);

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        minWidth: '140px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontWeight: 500,
          marginBottom: '12px',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '36px',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.95)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        {displayValue}{suffix}
      </div>
    </div>
  );
}
