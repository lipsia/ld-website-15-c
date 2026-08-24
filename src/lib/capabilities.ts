import type { RenderPolicy } from '../types';

/**
 * Particle counts and DPR targets for each device tier.
 * Used both here and in tests to avoid duplicated magic numbers.
 */
export const TIER_CONFIG = {
  low: { particles: 14000, dpr: [1, 1.5] as [number, number] },
  mid: { particles: 28000, dpr: [1, 1.75] as [number, number] },
  high: { particles: 48000, dpr: [1, 2] as [number, number] },
} as const;

/**
 * Detects WebGL2 capability by attempting to create a context on an offscreen canvas.
 * Browsers with CSP restrictions may throw; wrapping guards against that.
 * Releases the context afterwards to avoid leaking probe contexts (browsers cap at ~16).
 *
 * @returns true if WebGL2 is available, false otherwise.
 */
export function detectWebGL2(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (!context) {
      return false;
    }
    // Release the context to avoid leaking probe contexts.
    const ext = context.getExtension('WEBGL_lose_context');
    if (ext) {
      ext.loseContext();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects device tier based on hardware signals available without WebGL.
 * Tier mapping: low for underpowered/mobile, mid for standard, high for capable.
 *
 * Signals used:
 * - navigator.hardwareConcurrency: CPU cores (default to 4 when absent).
 * - navigator.deviceMemory: RAM in GB (when available on supported browsers).
 * - Pointer type via matchMedia: coarse pointer (touchscreen) suggests lower tier.
 * - Viewport size: very small viewports suggest mobile/low-end.
 *
 * @returns 'low' | 'mid' | 'high'
 */
export function detectDeviceTier(): 'low' | 'mid' | 'high' {
  if (typeof window === 'undefined') {
    return 'mid';
  }

  // Do not sniff user-agent — it is unreliable and a maintenance trap.
  // Use only stable APIs from navigator and matchMedia.

  const cores = navigator.hardwareConcurrency ?? 4;

  // Coarse pointer indicates touch-first device (usually mobile/tablet with lower GPU).
  let coarsePointer = false;
  try {
    coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  } catch {
    // matchMedia may be unavailable or throw in locked-down browsers.
  }

  // Rule: if coarse pointer OR low CPU, classify as low.
  if (coarsePointer || cores <= 4) {
    return 'low';
  }

  // Rule: if high CPU and fine pointer, classify as high.
  if (cores >= 8 && !coarsePointer) {
    return 'high';
  }

  // Default to mid tier.
  return 'mid';
}

/**
 * Detects whether the user has requested reduced motion via OS preferences.
 * Respects the `prefers-reduced-motion: reduce` media query.
 *
 * @returns true if reduced motion is requested, false otherwise.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Composes device capabilities into a RenderPolicy that drives WebGL rendering decisions.
 * The policy decides: whether to render 3D at all, particle count, DPR bounds, postprocessing.
 *
 * Logic:
 * 1. If WebGL2 is unavailable → no particles, no postprocessing, minimum DPR.
 * 2. If reduced motion is requested → calm render: no particles, no postprocessing, safe DPR.
 * 3. Otherwise, by tier → particles/DPR/postprocessing scale up from low to high.
 * 4. DPR upper bound is clamped to the real window.devicePixelRatio (no point rendering above the display).
 *
 * @returns A RenderPolicy object specifying rendering constraints.
 */
export function getRenderPolicy(): RenderPolicy {
  if (typeof window === 'undefined') {
    return {
      webgl: false,
      particles: 0,
      dpr: [1, 1],
      postprocessing: false,
      reducedMotion: false,
    };
  }

  const hasWebGL2 = detectWebGL2();
  const reducedMotion = prefersReducedMotion();

  if (!hasWebGL2) {
    return {
      webgl: false,
      particles: 0,
      dpr: [1, 1],
      postprocessing: false,
      reducedMotion,
    };
  }

  if (reducedMotion) {
    const clampedDpr = Math.min(1.5, window.devicePixelRatio);
    return {
      webgl: true,
      particles: 0,
      dpr: [1, clampedDpr],
      postprocessing: false,
      reducedMotion: true,
    };
  }

  const tier = detectDeviceTier();
  const config = TIER_CONFIG[tier];
  const clampedDpr = Math.min(config.dpr[1], window.devicePixelRatio);

  return {
    webgl: true,
    particles: config.particles,
    dpr: [config.dpr[0], clampedDpr],
    postprocessing: tier === 'high' || tier === 'mid',
    reducedMotion: false,
  };
}
