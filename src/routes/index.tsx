import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";
import { Clients } from "#/components/Clients";
import { Competence } from "#/components/Competence";
import { CTA } from "#/components/CTA";
import { Hero } from "#/components/Hero";
import { Services } from "#/components/Services";
import { Tech } from "#/components/Tech";
import { Seo } from "#/components/ui/Seo";
import { getRenderPolicy } from "#/lib/capabilities";
import { ErrorBoundary } from "#/lib/ErrorBoundary";
import { StaticFallback } from "#/lib/StaticFallback";
import { useMounted } from "#/lib/useMounted";
import type { RenderPolicy } from "#/types";

/** What getRenderPolicy() returns with no `window` — see src/lib/capabilities.ts. */
const SERVER_POLICY = {
	webgl: false,
	particles: 0,
	dpr: [1, 1],
	postprocessing: false,
	reducedMotion: false,
} as const satisfies RenderPolicy;

const Scene = lazy(() => import("#/three/Scene").then((module) => ({ default: module.Scene })));

/**
 * The home page — the only page with the 3D scene.
 *
 * The canvas is mounted here rather than in __root so that navigating to any other
 * page tears the WebGL context down completely instead of leaving an idle renderer
 * and rAF loop running behind static content.
 */
function Home() {
	// Capability detection touches the GPU and matchMedia; doing it once per mount
	// keeps it off the render path and guarantees every consumer sees one policy.
	//
	// Gated on `mounted` so the first client render matches the prerendered HTML: until
	// the first effect runs this resolves to the same no-WebGL policy the build produced.
	const mounted = useMounted();
	const policy = useMemo(() => (mounted ? getRenderPolicy() : SERVER_POLICY), [mounted]);

	return (
		<>
			<Seo />

			{/* A shader or context-loss failure must degrade to the static mark, never to a
			    blank page — hence the boundary's fallback is the fallback, not nothing. */}
			{policy.webgl ? (
				<ErrorBoundary fallback={<StaticFallback />}>
					<Suspense fallback={<StaticFallback />}>
						<Scene policy={policy} />
					</Suspense>
				</ErrorBoundary>
			) : (
				<StaticFallback />
			)}

			<Hero />
			<Competence />
			<Services />
			<Tech />
			<Clients policy={policy} />
			<CTA />
		</>
	);
}

export const Route = createFileRoute("/")({ component: Home });
