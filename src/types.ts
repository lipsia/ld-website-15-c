/** Shared contracts across the app. Agents must not redefine these locally. */

/** A normalized 0..1 progress value. */
export type Progress = number;

/** Named scroll milestones the 3D scene reacts to. */
export type SceneStage = "nebula" | "convergence" | "crystallised" | "dissection" | "dispersal";

/** Device-tier-driven render policy, produced by lib/capabilities.ts. */
export interface RenderPolicy {
	/** Whether WebGL2 is usable at all. */
	webgl: boolean;
	/** Particle count for the hero logo system. 0 disables the particle layer. */
	particles: number;
	/** Device pixel ratio bounds passed to the R3F canvas. */
	dpr: [number, number];
	/** Enable the postprocessing chain. */
	postprocessing: boolean;
	/** User asked for reduced motion. */
	reducedMotion: boolean;
}

export interface ServiceItem {
	readonly id: string;
	readonly title: string;
	readonly body: string;
}

export interface StatItem {
	readonly id: string;
	readonly label: string;
	readonly value: number;
	readonly suffix: string;
}

export interface ClientMark {
	readonly id: string;
	readonly name: string;
	/** Path to the client's white-on-transparent logo texture, served from /public. */
	readonly logo: string;
}

/**
 * A link into the site, expressed as a route rather than a raw href.
 *
 * Split into `to` + `hash` because a bare "#competence" only works while you are
 * already on the home page — from /team it resolves against the wrong document. The
 * router needs the destination route and the anchor as separate values to build a
 * correct URL from anywhere, and (from Phase 2) to localise the path.
 */
export interface NavLink {
	readonly label: string;
	/** Route path, e.g. "/" or "/team". */
	readonly to: string;
	/** Optional in-page anchor within that route, WITHOUT the leading "#". */
	readonly hash?: string;
}
