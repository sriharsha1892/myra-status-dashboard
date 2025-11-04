'use client';

import { useState, useRef, ReactNode } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { label: string; color: string; icon?: ReactNode };
  rightAction?: { label: string; color: string; icon?: ReactNode };
}

export default function SwipeableCard({ children, onSwipeLeft, onSwipeRight, leftAction, rightAction }: SwipeableCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const minSwipeDistance = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;
    const maxOffset = 150;
    const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
    setOffset(limitedOffset);
    setTouchEnd(currentTouch);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) { resetPosition(); return; }
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && onSwipeLeft) { if (navigator.vibrate) navigator.vibrate(50); onSwipeLeft(); }
    if (isRightSwipe && onSwipeRight) { if (navigator.vibrate) navigator.vibrate(50); onSwipeRight(); }
    resetPosition();
  };

  const resetPosition = () => { setOffset(0); setIsDragging(false); setTouchStart(null); setTouchEnd(null); };

  return (
    <div className="relative overflow-hidden">
      {rightAction && offset > 0 && (
        <div className={'absolute inset-y-0 left-0 flex items-center px-6 ' + rightAction.color} style={{ width: offset + 'px' }}>
          {rightAction.icon}<span className="ml-2 text-white font-medium text-sm">{rightAction.label}</span>
        </div>
      )}
      {leftAction && offset < 0 && (
        <div className={'absolute inset-y-0 right-0 flex items-center justify-end px-6 ' + leftAction.color} style={{ width: Math.abs(offset) + 'px' }}>
          <span className="mr-2 text-white font-medium text-sm">{leftAction.label}</span>{leftAction.icon}
        </div>
      )}
      <div ref={cardRef} className={'relative bg-white transition-transform ' + (isDragging ? 'duration-0' : 'duration-200')}
        style={{ transform: 'translateX(' + offset + 'px)' }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {children}
      </div>
    </div>
  );
}
