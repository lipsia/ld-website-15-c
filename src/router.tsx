import { createRouter } from "@tanstack/react-router";
import { deLocalizeUrl, localizeUrl } from "#/paraglide/runtime";
import { routeTree } from "./routeTree.gen";

/**
 * SPA router. Deliberately NOT TanStack Start.
 *
 * Start injects an inline hydration payload, which cannot pass our
 * `script-src 'self'` CSP without nonce/hash plumbing — the sibling
 * grundstock-frontend repo dropped its CSP entirely for exactly this reason (see
 * its src/server.ts). Router in SPA mode serialises nothing, so the policy in
 * index.html and public/_headers stays intact. See docs/PLAN.md §1.1.
 */
export function createAppRouter() {
	return createRouter({
		routeTree,
		// OFF deliberately, and it costs us something: returning to the home page lands
		// at the top rather than where you left. The feature emits an inline <script>
		// bootstrap to restore scroll before first paint, which our `script-src 'self'`
		// CSP forbids. Stripping that tag from the prerendered HTML was tried and is
		// worse than not having it: the tag is part of the React tree, so removing it
		// makes hydration mismatch (React #418) and the client throws the entire
		// prerendered document away — losing the prerender to save a scroll position.
		scrollRestoration: false,
		defaultPreload: "intent",
		// Routes are declared once, unprefixed and in German (the base locale). Paraglide
		// rewrites the URL on the way in and out, so /en/career and /karriere both resolve
		// to the same route file and every <Link to="/karriere"> renders the localised
		// href for the active locale. Without this the tree would have to be duplicated.
		rewrite: {
			input: ({ url }) => deLocalizeUrl(url),
			output: ({ url }) => localizeUrl(url),
		},
	});
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createAppRouter>;
	}
}
