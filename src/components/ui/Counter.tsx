import { useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface CounterProps {
  value: number;
  suffix?: string;
  duration?: number;
}

/** Ease-out cubic — quick start, gentle settle. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Counts 0 → value once the element scrolls into view.
 *
 * Accessibility-critical: screen readers get the final value immediately via
 * aria-label on the wrapper, while the animating digits are aria-hidden so
 * nothing streams a rapid sequence of numbers at assistive tech users.
 */
export function Counter({ value, suffix = '', duration = 1.8 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInView) return;

    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const durationMs = duration * 1000;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      setDisplay(Math.round(easeOutCubic(t) * value));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isInView, reduceMotion, value, duration]);

  return (
    <span ref={ref}>
      {/* A bare <span> supports no ARIA role, so aria-label would be dropped.
          Real off-screen text gives assistive tech the final figure immediately
          instead of announcing every intermediate frame of the count-up. */}
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      <span aria-hidden="true">
        {display}
        {suffix}
      </span>
    </span>
  );
}
