import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { SceneStage } from '../types';
import { scrollStore } from './scrollStore';

/** Stage boundaries in ascending order; upper bound is exclusive except the last. */
const STAGE_RANGES: ReadonlyArray<readonly [SceneStage, number, number]> = [
  ['nebula', 0, 0.18],
  ['convergence', 0.18, 0.4],
  ['crystallised', 0.4, 0.62],
  ['dissection', 0.62, 0.85],
  ['dispersal', 0.85, 1],
];

function stageForProgress(progress: number): SceneStage {
  for (const [stage, start, end] of STAGE_RANGES) {
    if (progress < end || end === 1) {
      if (progress >= start) return stage;
    }
  }
  return 'nebula';
}

/**
 * Exposes live scroll progress as a ref, not state. The 3D scene reads this
 * inside useFrame (60x/second); routing that through React state would
 * re-render the entire tree every frame for no visual benefit.
 */
export function useScrollValue(): RefObject<number> {
  const ref = useRef(scrollStore.get());

  useEffect(
    () =>
      scrollStore.subscribe((progress) => {
        ref.current = progress;
      }),
    [],
  );

  return ref;
}

/**
 * Returns the current named stage and re-renders — but only on the rare
 * transitions between stages, not on every scroll tick. DOM sections key
 * class names / ARIA state off this without paying a per-frame render cost.
 */
export function useScrollStage(): SceneStage {
  const [stage, setStage] = useState<SceneStage>(() => stageForProgress(scrollStore.get()));
  const stageRef = useRef(stage);

  useEffect(
    () =>
      scrollStore.subscribe((progress) => {
        const next = stageForProgress(progress);
        if (next !== stageRef.current) {
          stageRef.current = next;
          setStage(next);
        }
      }),
    [],
  );

  return stage;
}

/**
 * Tracks an element's scroll-through progress (0 at viewport-bottom entry,
 * 1 at viewport-top exit) as a ref. Kept ref-based for the same reason as
 * useScrollValue: callers typically drive continuous animation (parallax,
 * shader uniforms) from this and cannot afford a re-render per scroll tick.
 * Layout is read once per scroll notification via getBoundingClientRect,
 * never inside a loop.
 */
export function useElementProgress(ref: RefObject<HTMLElement | null>): RefObject<number> {
  const progressRef = useRef(0);

  useEffect(
    () =>
      scrollStore.subscribe(() => {
        const el = ref.current;
        if (!el || typeof window === 'undefined') return;

        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const total = rect.height + viewportHeight;
        const traveled = viewportHeight - rect.top;
        const next = total > 0 ? traveled / total : 0;
        progressRef.current = next < 0 ? 0 : next > 1 ? 1 : next;
      }),
    [ref],
  );

  return progressRef;
}
