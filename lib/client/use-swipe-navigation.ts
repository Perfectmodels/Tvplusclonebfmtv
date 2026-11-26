'use client';

import { useRef } from 'react';
import type { MouseEvent, PointerEvent, WheelEvent } from 'react';

type Options = {
  onNext: () => void;
  onPrev: () => void;
  /** Déplacement horizontal minimal, en pixels, pour changer d’élément. */
  threshold?: number;
  /** Delta horizontal minimal d’une molette pour changer d’élément. */
  wheelThreshold?: number;
};

/**
 * Gestes horizontaux (glisser-déposer, balayage tactile, molette) pour faire
 * défiler manuellement un carrousel, en complément de son défilement automatique.
 */
export function useSwipeNavigation({
  onNext,
  onPrev,
  threshold = 45,
  wheelThreshold = 24,
}: Options) {
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const lastWheel = useRef(0);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startX.current = event.clientX;
    moved.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(delta) < threshold) return;
    moved.current = true;
    if (delta < 0) onNext();
    else onPrev();
  };

  const onPointerCancel = () => {
    startX.current = null;
    moved.current = false;
  };

  // Évite d’ouvrir un lien lorsque le geste était un balayage.
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!moved.current) return;
    event.preventDefault();
    event.stopPropagation();
    moved.current = false;
  };

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    if (Math.abs(event.deltaX) < wheelThreshold) return;
    const now = Date.now();
    if (now - lastWheel.current < 500) return;
    lastWheel.current = now;
    if (event.deltaX > 0) onNext();
    else onPrev();
  };

  return { onPointerDown, onPointerUp, onPointerCancel, onClickCapture, onWheel };
}
