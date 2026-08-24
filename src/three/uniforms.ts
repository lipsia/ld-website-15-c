/**
 * Safe per-frame uniform writes.
 *
 * Why this exists: `THREE.ShaderMaterial` does not guarantee that the uniforms object
 * you hand it is the object it keeps — it clones uniform definitions. Holding a local
 * reference and mutating that is therefore NOT equivalent to updating the material's
 * uniforms; the writes silently go nowhere and the shader stays pinned at its initial
 * values. (That exact mistake froze the hero logo's `uScroll` at 0, leaving the
 * particle cloud permanently dispersed while everything driven from the local object
 * animated correctly — a confusing failure precisely because it half-worked.)
 *
 * Writing through the material is always correct. These helpers do that without a
 * non-null assertion, since `material.uniforms` is a Record and every lookup widens
 * to `| undefined` under `noUncheckedIndexedAccess`.
 */

import type * as THREE from 'three';

/** Sets a numeric uniform on the material. No-ops if the shader has no such uniform. */
export function setUniform(material: THREE.ShaderMaterial, name: string, value: number): void {
  const uniform = material.uniforms[name];
  if (uniform) uniform.value = value;
}

/** Reads a numeric uniform back, falling back to `fallback` when absent. */
export function getUniform(material: THREE.ShaderMaterial, name: string, fallback = 0): number {
  const uniform = material.uniforms[name];
  return typeof uniform?.value === 'number' ? uniform.value : fallback;
}

/** Adds to a numeric uniform — the common case for an accumulating time value. */
export function addUniform(material: THREE.ShaderMaterial, name: string, delta: number): void {
  const uniform = material.uniforms[name];
  if (uniform && typeof uniform.value === 'number') uniform.value += delta;
}
