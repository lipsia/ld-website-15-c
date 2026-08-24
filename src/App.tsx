/**
 * Application shell.
 *
 * Composition order matters here:
 *
 *   1. The DOM content is authored and mounted independently of WebGL. If the canvas
 *      chunk fails to load, the shader fails to compile, or the GPU is unavailable,
 *      the page is still a complete, readable, navigable website.
 *   2. The scene is a lazy chunk, so `three` never blocks first paint — the headline
 *      renders from the small critical bundle while ~500KB of WebGL streams in.
 *   3. The render policy is resolved exactly once, before first paint, and passed
 *      down as data. No component re-detects capabilities on its own.
 */

import { lazy, Suspense, useMemo } from "react";
import { Clients } from "./components/Clients";
import { Competence } from "./components/Competence";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { Services } from "./components/Services";
import { Tech } from "./components/Tech";
import { Seo } from "./components/ui/Seo";
import { getRenderPolicy } from "./lib/capabilities";
import { ErrorBoundary } from "./lib/ErrorBoundary";
import { StaticFallback } from "./lib/StaticFallback";
import { ScrollProvider } from "./scroll/ScrollProvider";

const Scene = lazy(() => import("./three/Scene").then((module) => ({ default: module.Scene })));

export function App() {
	// Capability detection touches the GPU and matchMedia; doing it once per mount
	// keeps it off the render path and guarantees every consumer sees one policy.
	const policy = useMemo(() => getRenderPolicy(), []);

	return (
		<ScrollProvider>
			<Seo />

			<a className="skip-link" href="#main">
				Skip to content
			</a>

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

			<Nav />

			<main id="main">
				<Hero />
				<Competence />
				<Services />
				<Tech />
				<Clients policy={policy} />
				<CTA />
			</main>

			<Footer />
		</ScrollProvider>
	);
}

export default App;
