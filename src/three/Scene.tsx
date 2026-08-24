/**
 * WebGL scene root.
 *
 * Fixed behind the DOM and `aria-hidden` — this canvas is decoration. Every word on
 * the page lives in real markup above it, so the experience degrades to a normal
 * (if less exciting) website if WebGL never starts.
 *
 * The render policy from `lib/capabilities` decides particle density, DPR ceiling and
 * whether the postprocessing chain runs at all. There is one code path, tuned by data.
 */

import { Environment, Lightformer, Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { RenderPolicy } from "#/types";
import { Backdrop } from "./Backdrop";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { LogoParticles } from "./LogoParticles";
import { ParticleField } from "./ParticleField";
import { PALETTE } from "./palette";

interface SceneProps {
	policy: RenderPolicy;
}

export function Scene({ policy }: SceneProps) {
	// With reduced motion we still render the mark — just assembled, lit and still.
	// Removing it entirely would strip the page of its only brand image.
	const logoCount = policy.reducedMotion ? 18000 : policy.particles;
	const ambientCount = policy.reducedMotion ? 0 : Math.round(policy.particles * 0.35);

	return (
		<div className="scene" aria-hidden="true">
			<Canvas
				dpr={policy.dpr}
				gl={{
					antialias: false, // Bloom + additive points hide aliasing; MSAA is wasted cost here.
					powerPreference: "high-performance",
					alpha: false,
					stencil: false,
					depth: true,
				}}
				camera={{ position: [0, 0, 9], fov: 42, near: 0.1, far: 200 }}
				// The DOM owns all interaction; `pointer-events: none` in scene.css keeps
				// R3F's listeners from ever competing with the content layer for events.
				style={{ pointerEvents: "none" }}
			>
				<color attach="background" args={[PALETTE.surface]} />
				<fog attach="fog" args={[PALETTE.surface, 12, 46]} />

				<Suspense fallback={null}>
					<Backdrop />

					{/* Local light probes. drei's `preset` environments fetch from a CDN, which
              our CSP blocks by design — so the reflections are built in-scene. */}
					<Environment resolution={128} frames={1} background={false}>
						<Lightformer
							intensity={2.4}
							color={PALETTE.accent}
							position={[-4, 3, 4]}
							scale={[8, 8, 1]}
						/>
						<Lightformer
							intensity={1.8}
							color={PALETTE.violet}
							position={[5, -2, 3]}
							scale={[7, 7, 1]}
						/>
						<Lightformer
							intensity={1.1}
							color={PALETTE.coral}
							position={[0, 5, -4]}
							scale={[6, 3, 1]}
						/>
					</Environment>

					<ambientLight intensity={0.35} />
					<directionalLight position={[4, 6, 5]} intensity={1.1} color={PALETTE.accent} />
					<directionalLight position={[-5, -2, -4]} intensity={0.7} color={PALETTE.violet} />

					<LogoParticles count={logoCount} reducedMotion={policy.reducedMotion} />
					<ParticleField count={ambientCount} reducedMotion={policy.reducedMotion} />

					<CameraRig parallax={!policy.reducedMotion} />
					<Effects enabled={policy.postprocessing} />
					<Preload all />
				</Suspense>
			</Canvas>
		</div>
	);
}

export default Scene;
