import type { ReactNode } from "react";
import { useEffect } from "react";
import { scrollStore } from "./scrollStore";

/**
 * Drives `scrollStore` from native scroll events. Mounted once near the app root and
 * renders children untouched — this component's whole job is the side effect.
 *
 * Scroll hijacking was tried here (Lenis, lerp 0.09) and removed: interpolating the
 * scroll position makes every gesture feel like an ease-in-out animation and fights
 * the trackpad's own momentum, which on macOS reads as lag rather than polish. Native
 * scroll is also the correct behaviour under `prefers-reduced-motion`, so dropping the
 * smooth path leaves exactly one code path instead of two.
 *
 * The WebGL scene still moves smoothly: it damps `uScroll` inside its own render loop,
 * which decouples the animation's smoothness from the page's scroll feel.
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
	useEffect(() => {
		if (typeof window === "undefined") return;

		let lastY = window.scrollY;
		let lastTime = performance.now();

		const update = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			const y = window.scrollY;
			const now = performance.now();
			const elapsed = now - lastTime;

			// Normalised to px-per-frame at 60fps so the figure stays comparable to a
			// per-frame delta regardless of the browser's event cadence.
			const velocity = elapsed > 0 ? ((y - lastY) / elapsed) * 16 : 0;
			lastY = y;
			lastTime = now;

			scrollStore.set(max > 0 ? y / max : 0, velocity);
		};

		// Resize changes the scrollable length, so the same scrollY maps to a different
		// progress; without this the scene desyncs when the viewport or content reflows.
		const onResize = () => {
			lastY = window.scrollY;
			lastTime = performance.now();
			update();
		};

		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", onResize, { passive: true });
		update();

		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", onResize);
		};
	}, []);

	return children;
}
