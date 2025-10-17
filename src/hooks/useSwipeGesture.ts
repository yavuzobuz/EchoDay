import { useEffect, useRef, useState, RefObject } from 'react';
import { triggerHaptic } from '../utils/hapticFeedback';

export interface SwipeGestureOptions {
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance for swipe (px)
  velocityThreshold?: number; // Minimum velocity for swipe
  preventScroll?: boolean; // Prevent scroll during swipe
  enableHaptics?: boolean; // Enable haptic feedback
}

export interface SwipeGestureState {
  isSwiping: boolean;
  swipeDistance: number;
  swipeDirection: 'up' | 'down' | 'left' | 'right' | null;
  swipeProgress: number; // 0-1 normalized progress
}

export const useSwipeGesture = (
  elementRef: RefObject<HTMLElement>,
  options: SwipeGestureOptions = {}
): SwipeGestureState => {
  const {
    onSwipeDown,
    onSwipeUp,
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = true,
    enableHaptics = true,
  } = options;

  const [gestureState, setGestureState] = useState<SwipeGestureState>({
    isSwiping: false,
    swipeDistance: 0,
    swipeDirection: null,
    swipeProgress: 0,
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMoveRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      hasTriggeredHaptic.current = false;

      setGestureState({
        isSwiping: false,
        swipeDistance: 0,
        swipeDirection: null,
        swipeProgress: 0,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      touchMoveRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Determine primary direction
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      let distance = 0;

      if (absY > absX) {
        // Vertical swipe
        distance = Math.abs(deltaY);
        direction = deltaY > 0 ? 'down' : 'up';
        
        if (preventScroll && distance > 10) {
          e.preventDefault();
        }
      } else {
        // Horizontal swipe
        distance = Math.abs(deltaX);
        direction = deltaX > 0 ? 'right' : 'left';
      }

      // Trigger haptic feedback at threshold
      if (enableHaptics && !hasTriggeredHaptic.current && distance > threshold * 0.5) {
        triggerHaptic.light();
        hasTriggeredHaptic.current = true;
      }

      const progress = Math.min(distance / (threshold * 2), 1);

      setGestureState({
        isSwiping: distance > 10,
        swipeDistance: distance,
        swipeDirection: direction,
        swipeProgress: progress,
      });
    };

    const handleTouchEnd = (_e: TouchEvent) => {
      if (!touchStartRef.current || !touchMoveRef.current) {
        touchStartRef.current = null;
        touchMoveRef.current = null;
        setGestureState({
          isSwiping: false,
          swipeDistance: 0,
          swipeDirection: null,
          swipeProgress: 0,
        });
        return;
      }

      const deltaX = touchMoveRef.current.x - touchStartRef.current.x;
      const deltaY = touchMoveRef.current.y - touchStartRef.current.y;
      const deltaTime = touchMoveRef.current.time - touchStartRef.current.time;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Calculate velocity (px/ms)
      const velocityX = absX / deltaTime;
      const velocityY = absY / deltaTime;

      // Check vertical swipe
      if (absY > absX && absY > threshold) {
        const velocity = velocityY;
        if (velocity > velocityThreshold) {
          if (deltaY > 0 && onSwipeDown) {
            if (enableHaptics) triggerHaptic.medium();
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            if (enableHaptics) triggerHaptic.medium();
            onSwipeUp();
          }
        }
      }
      // Check horizontal swipe
      else if (absX > absY && absX > threshold) {
        const velocity = velocityX;
        if (velocity > velocityThreshold) {
          if (deltaX > 0 && onSwipeRight) {
            if (enableHaptics) triggerHaptic.medium();
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            if (enableHaptics) triggerHaptic.medium();
            onSwipeLeft();
          }
        }
      }

      // Reset state
      touchStartRef.current = null;
      touchMoveRef.current = null;
      hasTriggeredHaptic.current = false;

      setGestureState({
        isSwiping: false,
        swipeDistance: 0,
        swipeDirection: null,
        swipeProgress: 0,
      });
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
      touchMoveRef.current = null;
      hasTriggeredHaptic.current = false;
      
      setGestureState({
        isSwiping: false,
        swipeDistance: 0,
        swipeDirection: null,
        swipeProgress: 0,
      });
    };

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [
    elementRef,
    onSwipeDown,
    onSwipeUp,
    onSwipeLeft,
    onSwipeRight,
    threshold,
    velocityThreshold,
    preventScroll,
    enableHaptics,
  ]);

  return gestureState;
};

export default useSwipeGesture;
