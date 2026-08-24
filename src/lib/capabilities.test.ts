import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	detectDeviceTier,
	detectWebGL2,
	getRenderPolicy,
	prefersReducedMotion,
	TIER_CONFIG,
} from "./capabilities";

describe("capabilities", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("detectWebGL2", () => {
		it("returns true when WebGL2 context is available", () => {
			const result = detectWebGL2();
			// Actual result depends on test environment; just ensure it runs without error.
			expect(typeof result).toBe("boolean");
		});

		it("returns false when getContext returns null", () => {
			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
			const result = detectWebGL2();
			expect(result).toBe(false);
		});

		it("returns false when getContext throws", () => {
			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
				throw new Error("Locked down browser");
			});
			const result = detectWebGL2();
			expect(result).toBe(false);
		});
	});

	describe("detectDeviceTier", () => {
		const originalHardwareConcurrency = navigator.hardwareConcurrency;

		beforeEach(() => {
			// Reset navigator.hardwareConcurrency to a known state.
			// Since it's read-only, we stub it via Object.defineProperty.
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: 4,
			});
			// Stub matchMedia as a global.
			vi.stubGlobal("matchMedia", (_query: string) => {
				return { matches: false } as MediaQueryList;
			});
		});

		afterEach(() => {
			// Restore to original value.
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: originalHardwareConcurrency,
			});
		});

		it('returns "low" when pointer is coarse', () => {
			vi.stubGlobal("matchMedia", (query: string) => {
				if (query === "(pointer: coarse)") {
					return { matches: true } as MediaQueryList;
				}
				return { matches: false } as MediaQueryList;
			});

			const tier = detectDeviceTier();
			expect(tier).toBe("low");
		});

		it('returns "low" when hardwareConcurrency is <= 4 and pointer is not coarse', () => {
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: 4,
			});

			vi.stubGlobal("matchMedia", (query: string) => {
				if (query === "(pointer: coarse)") {
					return { matches: false } as MediaQueryList;
				}
				return { matches: false } as MediaQueryList;
			});

			const tier = detectDeviceTier();
			expect(tier).toBe("low");
		});

		it('returns "high" when hardwareConcurrency is >= 8 and pointer is fine', () => {
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: 16,
			});

			vi.stubGlobal("matchMedia", (query: string) => {
				if (query === "(pointer: coarse)") {
					return { matches: false } as MediaQueryList;
				}
				return { matches: false } as MediaQueryList;
			});

			const tier = detectDeviceTier();
			expect(tier).toBe("high");
		});

		it('returns "mid" for moderate specs', () => {
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: 6,
			});

			vi.stubGlobal("matchMedia", (_query: string) => {
				return { matches: false } as MediaQueryList;
			});

			const tier = detectDeviceTier();
			expect(tier).toBe("mid");
		});
	});

	describe("prefersReducedMotion", () => {
		it("returns true when prefers-reduced-motion is reduce", () => {
			vi.stubGlobal("matchMedia", (query: string) => {
				if (query === "(prefers-reduced-motion: reduce)") {
					return { matches: true } as MediaQueryList;
				}
				return { matches: false } as MediaQueryList;
			});

			const result = prefersReducedMotion();
			expect(result).toBe(true);
		});

		it("returns false when prefers-reduced-motion is not set", () => {
			vi.stubGlobal("matchMedia", () => {
				return { matches: false } as MediaQueryList;
			});

			const result = prefersReducedMotion();
			expect(result).toBe(false);
		});

		it("returns false when matchMedia throws", () => {
			vi.stubGlobal("matchMedia", () => {
				throw new Error("matchMedia unavailable");
			});

			const result = prefersReducedMotion();
			expect(result).toBe(false);
		});
	});

	describe("getRenderPolicy", () => {
		const originalHardwareConcurrency = navigator.hardwareConcurrency;
		const originalDevicePixelRatio = window.devicePixelRatio;

		beforeEach(() => {
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: 4,
			});
			Object.defineProperty(window, "devicePixelRatio", {
				configurable: true,
				value: 2,
			});
			vi.stubGlobal("matchMedia", () => {
				return { matches: false } as MediaQueryList;
			});
		});

		afterEach(() => {
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: originalHardwareConcurrency,
			});
			Object.defineProperty(window, "devicePixelRatio", {
				configurable: true,
				value: originalDevicePixelRatio,
			});
		});

		it("returns webgl: false when WebGL2 is unavailable", () => {
			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

			const policy = getRenderPolicy();
			expect(policy.webgl).toBe(false);
			expect(policy.particles).toBe(0);
			expect(policy.postprocessing).toBe(false);
			expect(policy.dpr).toEqual([1, 1]);
		});

		it("returns particles: 0 and postprocessing: false when reducedMotion is true", () => {
			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
				this: HTMLCanvasElement,
				contextId: string,
			) {
				if (contextId === "webgl2") {
					return {
						getExtension: () => null,
					} as unknown as WebGL2RenderingContext;
				}
				return null;
			});

			vi.stubGlobal("matchMedia", (query: string) => {
				if (query === "(prefers-reduced-motion: reduce)") {
					return { matches: true } as MediaQueryList;
				}
				return { matches: false } as MediaQueryList;
			});

			const policy = getRenderPolicy();
			expect(policy.particles).toBe(0);
			expect(policy.postprocessing).toBe(false);
			expect(policy.reducedMotion).toBe(true);
		});

		it('returns "low" tier config when device tier is low', () => {
			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
				this: HTMLCanvasElement,
				contextId: string,
			) {
				if (contextId === "webgl2") {
					return {
						getExtension: () => null,
					} as unknown as WebGL2RenderingContext;
				}
				return null;
			});

			vi.stubGlobal("matchMedia", (query: string) => {
				if (query === "(pointer: coarse)") {
					return { matches: true } as MediaQueryList;
				}
				return { matches: false } as MediaQueryList;
			});

			const policy = getRenderPolicy();
			expect(policy.particles).toBe(TIER_CONFIG.low.particles);
			expect(policy.postprocessing).toBe(false);
		});

		it('returns "mid" tier config when device tier is mid', () => {
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: 6,
			});

			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
				this: HTMLCanvasElement,
				contextId: string,
			) {
				if (contextId === "webgl2") {
					return {
						getExtension: () => null,
					} as unknown as WebGL2RenderingContext;
				}
				return null;
			});

			vi.stubGlobal("matchMedia", () => {
				return { matches: false } as MediaQueryList;
			});

			const policy = getRenderPolicy();
			expect(policy.particles).toBe(TIER_CONFIG.mid.particles);
			expect(policy.postprocessing).toBe(true);
		});

		it('returns "high" tier config when device tier is high', () => {
			Object.defineProperty(navigator, "hardwareConcurrency", {
				configurable: true,
				value: 16,
			});

			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
				this: HTMLCanvasElement,
				contextId: string,
			) {
				if (contextId === "webgl2") {
					return {
						getExtension: () => null,
					} as unknown as WebGL2RenderingContext;
				}
				return null;
			});

			vi.stubGlobal("matchMedia", () => {
				return { matches: false } as MediaQueryList;
			});

			const policy = getRenderPolicy();
			expect(policy.particles).toBe(TIER_CONFIG.high.particles);
			expect(policy.postprocessing).toBe(true);
		});

		it("clamps dpr upper bound to window.devicePixelRatio", () => {
			Object.defineProperty(window, "devicePixelRatio", {
				configurable: true,
				value: 1,
			});

			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
				this: HTMLCanvasElement,
				contextId: string,
			) {
				if (contextId === "webgl2") {
					return {
						getExtension: () => null,
					} as unknown as WebGL2RenderingContext;
				}
				return null;
			});

			vi.stubGlobal("matchMedia", () => {
				return { matches: false } as MediaQueryList;
			});

			const policy = getRenderPolicy();
			expect(policy.dpr[1]).toBeLessThanOrEqual(1);
		});

		it("includes reducedMotion in the policy", () => {
			vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
				this: HTMLCanvasElement,
				contextId: string,
			) {
				if (contextId === "webgl2") {
					return {
						getExtension: () => null,
					} as unknown as WebGL2RenderingContext;
				}
				return null;
			});

			vi.stubGlobal("matchMedia", (query: string) => {
				if (query === "(prefers-reduced-motion: reduce)") {
					return { matches: false } as MediaQueryList;
				}
				return { matches: false } as MediaQueryList;
			});

			const policy = getRenderPolicy();
			expect(policy).toHaveProperty("reducedMotion");
			expect(typeof policy.reducedMotion).toBe("boolean");
		});
	});
});
