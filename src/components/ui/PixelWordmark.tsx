import { useEffect, useRef } from "react";
import { useReducedMotion } from "#/lib/useReducedMotion";

/**
 * The brand name rendered as a dense mosaic of square pixels that scatter away from
 * the cursor and settle back when it leaves.
 *
 * Canvas 2D rather than WebGL, deliberately: the look depends on crisp, axis-aligned,
 * grid-locked squares, which is exactly what `rect` + a single `fill` gives for free.
 * Reproducing that in WebGL would mean fighting point-sprite rounding and antialiasing
 * for no gain — and this way the hero costs nothing on the GPU the 3D scene is using.
 *
 * Performance: every particle is batched into ONE Path2D per colour, so a 25k-pixel
 * wordmark is two `fill()` calls per frame rather than 25k `fillRect()` calls. The loop
 * also parks itself once every pixel is home, so an untouched hero burns no frames.
 */

/** Target gap between pixel centres, in CSS px. Smaller = denser mosaic, more particles. */
const CELL_TARGET = 5;
/** Fraction of a cell actually painted — the remainder becomes the grid gap. */
const FILL_RATIO = 0.66;
/** Radius of the cursor's influence, in CSS px. */
const CURSOR_RADIUS = 132;
/** How hard the cursor throws pixels. */
const PUSH = 5.2;
/**
 * Per-frame velocity retention for the cursor's impulse, and the rate a pixel eases
 * back toward its cell.
 *
 * These are deliberately NOT a spring. A spring that adds `(home - p) * k` to velocity
 * overshoots and rings unless it is critically damped, which is what made the return
 * feel bouncy. Easing the POSITION toward home instead cannot overshoot by
 * construction, so the settle is monotonic and smooth at any speed.
 */
const FRICTION = 0.9;
const HOMING = 0.045;
/** Below this displacement (px) and speed, a pixel counts as home, letting the loop idle. */
const REST_EPSILON = 0.3;
const REST_SPEED = 0.05;

/**
 * Scatter room, in CSS px, on every side of the text. The canvas is grown by this on
 * all four edges and the glyphs are fitted to the inner box, so pixels thrown outward
 * have somewhere to go — without it they are clipped dead at the canvas edge.
 */
const BLEED = 78;

interface PixelWordmarkProps {
	/** One entry per rendered line. Stacked and centred. */
	lines: readonly string[];
	className?: string;
}

interface Field {
	/** Home (grid) position. */
	hx: Float32Array;
	hy: Float32Array;
	/** Live position and velocity. */
	x: Float32Array;
	y: Float32Array;
	vx: Float32Array;
	vy: Float32Array;
	/** Stable per-pixel random, 0..1. Varies each pixel's response to the cursor so the
	    displacement scatters like dust instead of shearing off in coherent streaks. */
	seed: Float32Array;
	count: number;
	size: number;
}

/** Below this container width, multi-word lines stack one word per line. */
const STACK_BELOW = 640;

/**
 * A wide container renders the authored lines as-is; a narrow one breaks each line into
 * its words so the glyphs can grow instead of shrinking to fit the width.
 */
function resolveLines(lines: readonly string[], width: number): string[] {
	if (width >= STACK_BELOW) return [...lines];
	return lines.flatMap((line) => line.split(/\s+/).filter(Boolean));
}

/**
 * Rasterises the text offscreen, then keeps one particle per grid cell whose centre
 * landed on an opaque pixel. Sampling a rasterised glyph (rather than tracing outlines)
 * is what produces the bitmap-screen quality of the reference.
 */
function buildField(
	canvasWidth: number,
	canvasHeight: number,
	fitWidth: number,
	fitHeight: number,
	authored: readonly string[],
): Field | null {
	if (fitWidth < 2 || fitHeight < 2 || authored.length === 0) return null;
	const lines = resolveLines(authored, fitWidth);

	const off = document.createElement("canvas");
	off.width = Math.floor(canvasWidth);
	off.height = Math.floor(canvasHeight);
	const octx = off.getContext("2d", { willReadFrequently: true });
	if (!octx) return null;

	// No webfonts are permitted by our CSP, so the wordmark leans on the heaviest
	// weight of the platform stack. 1000 resolves to the boldest face available.
	const family = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
	const lineCount = lines.length;

	// Fit by width: measure at a reference size, then scale to fill the canvas.
	const probe = 100;
	octx.font = `1000 ${probe}px ${family}`;
	let widest = 1;
	for (const line of lines) {
		widest = Math.max(widest, octx.measureText(line).width);
	}

	// Fitted to the inner box, not the bled canvas, so the mark keeps its intended size
	// and the extra canvas is purely scatter headroom.
	const byWidth = (fitWidth * 0.98 * probe) / widest;
	// Cap height is ~0.72em, but descenders push the used box to ~1em per line.
	const byHeight = (fitHeight * 0.96) / lineCount;
	const fontSize = Math.max(8, Math.min(byWidth, byHeight));

	octx.font = `1000 ${fontSize}px ${family}`;
	octx.fillStyle = "#fff";
	octx.textAlign = "center";
	octx.textBaseline = "middle";

	const lineHeight = fontSize;
	const top = canvasHeight / 2 - (lineHeight * (lineCount - 1)) / 2;
	for (let i = 0; i < lineCount; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		octx.fillText(line, canvasWidth / 2, top + i * lineHeight);
	}

	const { data } = octx.getImageData(0, 0, off.width, off.height);
	const cell = Math.max(3, Math.min(CELL_TARGET, Math.round(fitWidth / 300)));
	const half = Math.floor(cell / 2);

	const hx: number[] = [];
	const hy: number[] = [];
	for (let gy = 0; gy + cell <= off.height; gy += cell) {
		for (let gx = 0; gx + cell <= off.width; gx += cell) {
			const px = gx + half;
			const py = gy + half;
			// Alpha channel of the cell's centre sample.
			const alpha = data[(py * off.width + px) * 4 + 3] ?? 0;
			if (alpha > 130) {
				hx.push(gx);
				hy.push(gy);
			}
		}
	}

	const count = hx.length;
	if (count === 0) return null;

	// Deterministic so the scatter pattern is identical across reloads and resizes.
	const seed = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const n = Math.sin((i + 1) * 12.9898) * 43758.5453;
		seed[i] = n - Math.floor(n);
	}

	return {
		hx: Float32Array.from(hx),
		hy: Float32Array.from(hy),
		x: Float32Array.from(hx),
		y: Float32Array.from(hy),
		vx: new Float32Array(count),
		vy: new Float32Array(count),
		seed,
		count,
		size: Math.max(1, Math.round(cell * FILL_RATIO)),
	};
}

export function PixelWordmark({ lines, className }: PixelWordmarkProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();

	// Read inside the loop rather than through state — the cursor moves far more often
	// than React should ever re-render.
	const pointer = useRef({ x: -9999, y: -9999, active: false });

	useEffect(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let field: Field | null = null;
		let raf = 0;
		let idle = true;
		let width = 0;
		let height = 0;

		// Brand tokens are the source of truth for colour, so they are read off the
		// cascade instead of duplicated here.
		const styles = getComputedStyle(document.documentElement);
		const restColour = styles.getPropertyValue("--text-hi").trim() || "#f4f2ff";

		const paint = () => {
			if (!ctx || !field) return;
			ctx.clearRect(0, 0, width, height);

			const { x, y, hx, hy, count, size } = field;

			// Monochrome, but graded into three alpha buckets by how far each pixel has
			// been thrown. That is what makes the disturbed area read as thinning dust
			// rather than a solid block that merely moved.
			const settled = new Path2D();
			const near = new Path2D();
			const far = new Path2D();
			for (let i = 0; i < count; i++) {
				const px = x[i] ?? 0;
				const py = y[i] ?? 0;
				const dx = px - (hx[i] ?? 0);
				const dy = py - (hy[i] ?? 0);
				const d2 = dx * dx + dy * dy;
				const target = d2 < 4 ? settled : d2 < 900 ? near : far;
				target.rect(Math.round(px), Math.round(py), size, size);
			}

			ctx.fillStyle = restColour;
			ctx.globalAlpha = 1;
			ctx.fill(settled);
			ctx.globalAlpha = 0.78;
			ctx.fill(near);
			ctx.globalAlpha = 0.42;
			ctx.fill(far);
			ctx.globalAlpha = 1;
		};

		const step = () => {
			if (!field) return;
			const { x, y, vx, vy, hx, hy, seed, count } = field;
			const { x: mx, y: my, active } = pointer.current;
			const r2 = CURSOR_RADIUS * CURSOR_RADIUS;

			let moving = false;

			for (let i = 0; i < count; i++) {
				const homeX = hx[i] ?? 0;
				const homeY = hy[i] ?? 0;
				let px = x[i] ?? 0;
				let py = y[i] ?? 0;
				let velX = vx[i] ?? 0;
				let velY = vy[i] ?? 0;

				if (active) {
					const dx = px - mx;
					const dy = py - my;
					const d2 = dx * dx + dy * dy;
					if (d2 < r2) {
						const d = Math.sqrt(d2) || 0.0001;
						// Falloff squared: a tight, well-defined bite rather than a soft blur.
						const falloff = 1 - d / CURSOR_RADIUS;
						const s = seed[i] ?? 0.5;
						// Rotate each pixel's escape vector by up to ±0.7 rad and vary its
						// magnitude. Without this every pixel flees along the same radius and
						// the result shears into streaks instead of scattering.
						const angle = (s - 0.5) * 1.4;
						const cos = Math.cos(angle);
						const sin = Math.sin(angle);
						const force = (falloff * falloff * PUSH * (0.45 + s * 1.3)) / d;
						velX += (dx * cos - dy * sin) * force;
						velY += (dx * sin + dy * cos) * force;
					}
				}

				// Decay the cursor impulse, apply it, then ease the position home. Homing
				// the position rather than the velocity is what removes the bounce.
				velX *= FRICTION;
				velY *= FRICTION;
				px += velX;
				py += velY;
				px += (homeX - px) * HOMING;
				py += (homeY - py) * HOMING;

				x[i] = px;
				y[i] = py;
				vx[i] = velX;
				vy[i] = velY;

				if (!moving) {
					const offX = px - homeX;
					const offY = py - homeY;
					// Speed matters as well as displacement: a pixel passing through its own
					// cell at velocity is still in flight and must not park the loop.
					if (
						offX * offX + offY * offY > REST_EPSILON * REST_EPSILON ||
						velX * velX + velY * velY > REST_SPEED * REST_SPEED
					) {
						moving = true;
					}
				}
			}

			paint();

			// Park the loop once everything has settled and the cursor has left, so a
			// static hero costs zero frames.
			if (!moving && !pointer.current.active) {
				idle = true;
				return;
			}
			raf = requestAnimationFrame(step);
		};

		const wake = () => {
			if (!idle) return;
			idle = false;
			raf = requestAnimationFrame(step);
		};

		const measure = () => {
			const rect = wrap.getBoundingClientRect();
			// The wrapper defines layout; the canvas is grown by BLEED on every side and
			// pulled back out of flow, so scattered pixels are not clipped at its edge.
			const fitWidth = rect.width;
			const fitHeight = rect.height;
			width = fitWidth + BLEED * 2;
			height = fitHeight + BLEED * 2;

			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.max(1, Math.floor(width * dpr));
			canvas.height = Math.max(1, Math.floor(height * dpr));
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			canvas.style.left = `${-BLEED}px`;
			canvas.style.top = `${-BLEED}px`;
			if (!ctx) return;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			field = buildField(width, height, fitWidth, fitHeight, lines);
			paint();
			if (!reducedMotion) wake();
		};

		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(wrap);

		const onPointerMove = (event: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			pointer.current = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
				active: true,
			};
			wake();
		};
		const onPointerOut = (event: PointerEvent) => {
			// relatedTarget null means the cursor left the document entirely, rather
			// than merely crossing between two elements inside it.
			if (event.relatedTarget !== null) return;
			pointer.current.active = false;
			wake();
		};

		if (!reducedMotion) {
			// Listen on the window so the effect triggers as the cursor approaches,
			// not only once it is over an opaque pixel.
			window.addEventListener("pointermove", onPointerMove, { passive: true });
			window.addEventListener("pointerout", onPointerOut, { passive: true });
		}

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerout", onPointerOut);
		};
	}, [lines, reducedMotion]);

	return (
		// Decorative: the accessible name lives in the heading that wraps this. The
		// attribute sits on the wrapper, not the canvas — a canvas counts as focusable,
		// and aria-hidden on a focusable node hides it from AT while leaving it reachable.
		<div
			ref={wrapRef}
			className={className ? `wordmark ${className}` : "wordmark"}
			aria-hidden="true"
		>
			<canvas ref={canvasRef} />
		</div>
	);
}
