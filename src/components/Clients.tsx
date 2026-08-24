import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { CLIENTS } from "#/content/site";
import { ErrorBoundary } from "#/lib/ErrorBoundary";
import { useReducedMotion } from "#/lib/useReducedMotion";
import { createDiceControls } from "#/three/ClientDice";
import type { RenderPolicy } from "#/types";
import { Reveal } from "./ui/Reveal";

const ClientDice = lazy(() =>
	import("#/three/ClientDice").then((module) => ({ default: module.ClientDice })),
);

/** Pointer travel (px) below which the gesture is treated as a click, not a drag. */
const CLICK_SLOP = 6;

/**
 * Every client logo, laid flat. This is the no-WebGL fallback and the Suspense
 * placeholder, so the logos are on screen before (or instead of) the 3D die — the
 * roster is the content here, and the die is the presentation.
 */
function LogoWall() {
	return (
		<ul className="logo-wall">
			{CLIENTS.marks.map((mark) => (
				<li key={mark.id}>
					<img src={mark.logo} alt={mark.name} width={160} height={160} loading="lazy" />
				</li>
			))}
		</ul>
	);
}

export function Clients({ policy }: { policy: RenderPolicy }) {
	const reducedMotion = useReducedMotion();
	// Mutable and read inside the render loop: a drag produces dozens of events per
	// second and none of them should re-render React.
	const controls = useMemo(() => createDiceControls(), []);
	const gesture = useRef({ x: 0, y: 0, travel: 0, active: false });
	const [open, setOpen] = useState(false);

	const toggle = useCallback(() => {
		setOpen((previous) => {
			controls.spreadTarget = previous ? 0 : 1;
			return !previous;
		});
	}, [controls]);

	const onPointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			gesture.current = { x: event.clientX, y: event.clientY, travel: 0, active: true };
			controls.dragging = true;
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		[controls],
	);

	const onPointerMove = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!gesture.current.active) return;
			const dx = event.clientX - gesture.current.x;
			const dy = event.clientY - gesture.current.y;
			gesture.current.x = event.clientX;
			gesture.current.y = event.clientY;
			gesture.current.travel += Math.hypot(dx, dy);
			// Accumulate rather than overwrite: several pointer events can land between
			// two frames, and dropping all but the last makes fast drags feel sticky.
			controls.dx += dx;
			controls.dy += dy;
		},
		[controls],
	);

	const onPointerUp = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!gesture.current.active) return;
			gesture.current.active = false;
			controls.dragging = false;
			event.currentTarget.releasePointerCapture(event.pointerId);
			// A gesture that barely moved was a click, not a throw.
			if (gesture.current.travel < CLICK_SLOP) toggle();
		},
		[controls, toggle],
	);

	return (
		<section id="clients" aria-labelledby="clients-heading">
			<div className="container">
				<Reveal className="section-head">
					<span className="eyebrow">{CLIENTS.eyebrow}</span>
					<h2 id="clients-heading">{CLIENTS.title}</h2>
				</Reveal>

				{policy.webgl ? (
					<>
						{/* Pointer gestures only. The keyboard-reachable affordance is the
						    button below; this wrapper drives a decorative canvas. */}
						<div
							className="dice"
							onPointerDown={onPointerDown}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
							onPointerCancel={onPointerUp}
							aria-hidden="true"
						>
							{/* Two layers of the same fallback: Suspense covers the chunk and
							    textures still loading, the boundary covers a WebGL failure at
							    runtime. Either way the roster stays on screen. */}
							<ErrorBoundary fallback={<LogoWall />}>
								<Suspense fallback={<LogoWall />}>
									<ClientDice
										marks={CLIENTS.marks}
										controls={controls}
										reducedMotion={reducedMotion}
										dpr={policy.dpr}
									/>
								</Suspense>
							</ErrorBoundary>
						</div>

						<div className="dice__controls">
							{/* The die is pointer-only, so the same action needs a real control
							    that keyboard and assistive tech can reach. */}
							<button type="button" className="btn btn--ghost" onClick={toggle}>
								{open ? "Collect logos" : "Spread out logos"}
							</button>
							<p className="dice__hint">Drag to spin · click to open</p>
						</div>

						{/* The roster as real text. The canvas can express it visually but not
						    semantically, so the names are published here regardless. */}
						<ul className="sr-only">
							{CLIENTS.marks.map((mark) => (
								<li key={mark.id}>{mark.name}</li>
							))}
						</ul>
					</>
				) : (
					<LogoWall />
				)}
			</div>
		</section>
	);
}
