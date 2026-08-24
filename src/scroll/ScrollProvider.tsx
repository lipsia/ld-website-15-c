import Lenis from "lenis";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { scrollStore } from "./scrollStore";

/**
 * Drives `scrollStore` from either Lenis (smooth scroll) or native scroll
 * events (reduced motion). Mounted once near the app root; renders children
 * untouched — this component's whole job is the side effect.
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
	useEffect(() => {
		if (typeof window === "undefined") return;

		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		let rafId = 0;
		let lenis: Lenis | null = null;
		let removeNativeListener: (() => void) | null = null;

		// Native scroll takes over whenever reduced motion is on; otherwise Lenis
		// owns the raf loop. `start` re-evaluates on every media query change so
		// toggling the OS setting mid-session swaps drivers cleanly.
		function start() {
			if (media.matches) {
				const computeAndSet = () => {
					const doc = document.documentElement;
					const max = doc.scrollHeight - window.innerHeight;
					const progress = max > 0 ? window.scrollY / max : 0;
					scrollStore.set(progress, 0);
				};
				window.addEventListener("scroll", computeAndSet, { passive: true });
				computeAndSet();
				removeNativeListener = () => {
					window.removeEventListener("scroll", computeAndSet);
				};
				return;
			}

			lenis = new Lenis({
				lerp: 0.09,
				wheelMultiplier: 1,
				smoothWheel: true,
				syncTouch: false,
			});

			lenis.on("scroll", (instance: Lenis) => {
				scrollStore.set(instance.progress, instance.velocity);
			});

			const raf = (time: number) => {
				lenis?.raf(time);
				rafId = requestAnimationFrame(raf);
			};
			rafId = requestAnimationFrame(raf);
		}

		function stop() {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = 0;
			lenis?.destroy();
			lenis = null;
			removeNativeListener?.();
			removeNativeListener = null;
		}

		start();

		const handleMediaChange = () => {
			stop();
			start();
		};
		media.addEventListener("change", handleMediaChange);

		return () => {
			media.removeEventListener("change", handleMediaChange);
			stop();
		};
	}, []);

	return children;
}
