import { useSyncExternalStore } from "react";

/**
 * React hook that returns the live reduced-motion preference.
 * Re-renders when the OS preference changes mid-session (user toggles it).
 *
 * Implemented with useSyncExternalStore (React 19) to subscribe to the MediaQueryList
 * change event and sync with the browser's actual preference at all times.
 *
 * @returns true if reduced motion is requested, false otherwise.
 */
export function useReducedMotion(): boolean {
	// Memoized subscribe function — stable across renders so external store doesn't re-register.
	const subscribe = (onStoreChange: () => void): (() => void) => {
		if (typeof window === "undefined" || !window.matchMedia) {
			return () => {};
		}

		try {
			const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
			// Use addEventListener instead of the deprecated addListener.
			mediaQuery.addEventListener("change", onStoreChange);
			return () => {
				mediaQuery.removeEventListener("change", onStoreChange);
			};
		} catch {
			return () => {};
		}
	};

	// getSnapshot reads the current value — called on render and whenever subscribe triggers.
	const getSnapshot = (): boolean => {
		if (typeof window === "undefined" || !window.matchMedia) {
			return false;
		}

		try {
			return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		} catch {
			return false;
		}
	};

	// getServerSnapshot for SSR — always return false on the server.
	const getServerSnapshot = (): boolean => false;

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
