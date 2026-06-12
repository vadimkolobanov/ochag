import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a number from 0 to `target` over `duration` ms using rAF + easeOutCubic.
 * Returns the current animated value.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    // Reset if target changed
    if (prevTargetRef.current !== target) {
      prevTargetRef.current = target;
      startTimeRef.current = null;
    }

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
