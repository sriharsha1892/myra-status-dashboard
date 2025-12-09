/**
 * Framer Motion animation variants for Enrichment UI
 * Linear/Asana-inspired smooth transitions
 */

import { Variants } from 'framer-motion';

// Spring configurations
export const springs = {
  snappy: { type: 'spring' as const, stiffness: 400, damping: 25 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
  gentle: { type: 'spring' as const, stiffness: 200, damping: 30 },
};

// Question row state variants
export const questionVariants: Variants = {
  idle: {
    backgroundColor: 'rgb(255, 255, 255)',
  },
  focused: {
    backgroundColor: 'rgb(249, 250, 251)', // neutral-50
    transition: { duration: 0.15 },
  },
  completed: {
    backgroundColor: 'rgb(236, 253, 245)', // emerald-50
    transition: { duration: 0.2 },
  },
};

// Choice chip selection variants
export const chipVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.1 },
  },
  tap: { scale: 0.98 },
  selected: {
    scale: [1, 1.05, 1],
    transition: springs.bouncy,
  },
};

// Checkmark path draw animation
export const checkmarkVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// Progress ring fill animation
export const progressRingVariants: Variants = {
  initial: (initialOffset: number) => ({
    strokeDashoffset: initialOffset,
  }),
  animate: (targetOffset: number) => ({
    strokeDashoffset: targetOffset,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  }),
};

// List container stagger
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// List item entrance
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.15 },
  },
};

// Hover reveal for actions
export const hoverRevealVariants: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.15 },
  },
};

// Score counter animation config
export const scoreCounterConfig = {
  duration: 0.4,
  ease: 'easeOut' as const,
};
