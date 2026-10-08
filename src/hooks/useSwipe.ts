import { useRef, type PointerEvent } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance in px. */
  threshold?: number;
}

/**
 * Horizontal swipe detection with Pointer Events (touch, pen and mouse drag).
 * Vertical gestures are ignored so page scrolling keeps working (`touch-action: pan-y`).
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 40 }: SwipeOptions) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  return {
    onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    },
    onPointerUp(event: PointerEvent) {
      const origin = start.current;
      start.current = null;
      if (!origin || origin.id !== event.pointerId) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
    onPointerCancel() {
      start.current = null;
    },
  };
}
