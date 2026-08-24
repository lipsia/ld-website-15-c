import * as THREE from "three";

/**
 * Brand palette for the WebGL layer.
 * Mirrors the brand tokens in src/styles/tokens.css — keep the two in sync.
 * Values are linear-space-safe sRGB hex; three.js converts on assignment.
 */
export const PALETTE = {
	indigo: "#312782",
	violet: "#5f27d4",
	mint: "#1ed5a4",
	/** THE accent — mirrors --accent in tokens.css. Keep the two in sync. */
	accent: "#5cc8ff",
	coral: "#ff583c",
	surface: "#05040f",
} as const;

/**
 * Hex → **linear-sRGB** triplet for shader uniforms.
 *
 * This conversion is mandatory, not cosmetic. three.js r152+ runs its shaders in a
 * linear working space and encodes to sRGB once at output. Feeding raw sRGB
 * component values straight into a uniform makes the renderer treat them as though
 * they were already linear and encode them a second time, which lifts everything
 * dramatically — our #05040f near-black ground came out a flat mid-purple (~0.02
 * becomes ~0.16 after a spurious encode) and washed the whole scene out.
 *
 * `THREE.Color` applies the sRGB → linear transfer function via three's own
 * ColorManagement, so this stays correct if the renderer's spaces are ever changed.
 */
export function toVec3(hex: string): [number, number, number] {
	const color = new THREE.Color().setStyle(hex, THREE.SRGBColorSpace);
	return [color.r, color.g, color.b];
}
