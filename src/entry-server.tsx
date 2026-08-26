import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { overwriteGetLocale } from "./paraglide/runtime";
import { createAppRouter } from "./router";

/**
 * Build-time render entry. Bundled by `vite build --ssr` and driven by
 * scripts/prerender.ts — never shipped to the browser and never run on a server: the
 * site is static files. See docs/PLAN.md §1.2.
 */
export async function render(localisedPath: string, locale: "de" | "en"): Promise<string> {
	// The generated runtime resolves the locale from the URL/cookie/navigator, none of
	// which exist here, so the prerenderer states it outright. Every m.*() called during
	// this render then answers in that language.
	overwriteGetLocale(() => locale);

	const router = createAppRouter();
	// Must be the LOCALISED path ("/en/career"), not the route path ("/karriere").
	// The router's `rewrite.input` de-localises whatever it is given; hand it the
	// already-de-localised route and it computes a different URL than the one it was
	// asked to render, matches nothing, and returns an empty document. German hid this
	// because for the base locale the two paths are byte-identical — only /en broke.
	router.update({
		history: createMemoryHistory({ initialEntries: [localisedPath] }),
	});
	await router.load();

	return renderToString(
		<StrictMode>
			<RouterProvider router={router} />
		</StrictMode>,
	);
}

/**
 * Re-exported so scripts/prerender.ts needs a single SSR bundle rather than resolving
 * the generated runtime a second time through a different module graph — two copies
 * would each hold their own locale state.
 */
export { baseLocale, locales, localizeHref } from "./paraglide/runtime";
