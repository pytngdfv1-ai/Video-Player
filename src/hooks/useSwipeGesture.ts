import { useEffect, useRef, useCallback } from 'react';

export interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // minimum distance in pixels (default: 45)
  maxPerpendicular?: number; // maximum perpendicular movement (default: 80)
  targetRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 45,
  maxPerpendicular = 80,
  targetRef,
  disabled = false,
}: SwipeOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
    },
    [disabled]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (disabled || touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const duration = Date.now() - touchStartTime.current;

      // Reset coordinates
      touchStartX.current = null;
      touchStartY.current = null;

      // Ignore very slow swipes (greater than 800ms)
      if (duration > 800) return;

      // Horizontal Swipe
      if (absX >= threshold && absY <= maxPerpendicular) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
      // Vertical Swipe
      else if (absY >= threshold && absX <= maxPerpendicular) {
        if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        } else if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    },
    [disabled, threshold, maxPerpendicular, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  useEffect(() => {
    const element = targetRef ? targetRef.current : window;
    if (!element) return;

    const startListener = (e: Event) => handleTouchStart(e as TouchEvent);
    const endListener = (e: Event) => handleTouchEnd(e as TouchEvent);

    element.addEventListener('touchstart', startListener, { passive: true });
    element.addEventListener('touchend', endListener, { passive: true });

    return () => {
      element.removeEventListener('touchstart', startListener);
      element.removeEventListener('touchend', endListener);
    };
  }, [targetRef, handleTouchStart, handleTouchEnd]);
}
