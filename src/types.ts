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

export interface NavLink {
	readonly label: string;
	readonly href: string;
}
