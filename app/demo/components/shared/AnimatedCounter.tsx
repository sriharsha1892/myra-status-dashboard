'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export default function AnimatedCounter({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
  });

  const display = useTransform(spring, (current) =>
    current.toFixed(decimals)
  );

  useEffect(() => {
    if (isClient) {
      spring.set(value);
    }
  }, [spring, value, isClient]);

  if (!isClient) {
    return (
      <span className={className}>
        {prefix}0{suffix}
      </span>
    );
  }

  return (
    <span className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

// Simple count-up animation without spring (for text values like "4-8 weeks")
interface CountUpTextProps {
  texts: string[];
  duration?: number;
  className?: string;
  onComplete?: () => void;
}

export function CountUpText({
  texts,
  duration = 2000,
  className = '',
  onComplete,
}: CountUpTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (texts.length <= 1) {
      onComplete?.();
      return;
    }

    const interval = duration / texts.length;
    let index = 0;

    const timer = setInterval(() => {
      index++;
      if (index >= texts.length) {
        clearInterval(timer);
        onComplete?.();
      } else {
        setCurrentIndex(index);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [texts, duration, onComplete]);

  return (
    <motion.span
      key={currentIndex}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {texts[currentIndex]}
    </motion.span>
  );
}
