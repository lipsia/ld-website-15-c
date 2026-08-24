/**
 * Ref-based scroll store.
 *
 * Scroll progress updates every frame. Routing it through React state would
 * re-render the tree 60x/second, so it lives here instead: writers push, readers
 * pull inside their own animation loop (useFrame) or opt into notifications.
 *
 * This module is dependency-free and side-effect-free by design — it is the
 * contract between the scroll provider (writer) and the WebGL scene (reader).
 */

export type ScrollListener = (progress: number) => void;

export interface ScrollStore {
	/** Current document scroll progress, 0..1. Cheap; safe to call per frame. */
	get(): number;
	/** Current scroll velocity in px/frame, smoothed. */
	getVelocity(): number;
	/** Write progress + velocity. Called only by the scroll provider. */
	set(progress: number, velocity: number): void;
	/** Subscribe to changes. Returns an unsubscribe function. */
	subscribe(listener: ScrollListener): () => void;
}

function createScrollStore(): ScrollStore {
	let progress = 0;
	let velocity = 0;
	const listeners = new Set<ScrollListener>();

	return {
		get: () => progress,
		getVelocity: () => velocity,
		set(next, nextVelocity) {
			// Clamp defensively: elastic overscroll reports values outside 0..1.
			progress = next < 0 ? 0 : next > 1 ? 1 : next;
			velocity = nextVelocity;
			for (const listener of listeners) listener(progress);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

/** App-wide singleton. One document, one scroll position. */
export const scrollStore = createScrollStore();

/**
 * Maps global progress onto a sub-range, returning 0..1 within it.
 * Used to give each scene stage its own local timeline.
 */
export function subProgress(progress: number, start: number, end: number): number {
	if (end <= start) return 0;
	const t = (progress - start) / (end - start);
	return t < 0 ? 0 : t > 1 ? 1 : t;
}
