import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getLocale } from "./paraglide/runtime";
import { createAppRouter } from "./router";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/scene.css";
import "./styles/sections.css";

// index.html ships a static lang="en"; the resolved locale is the truth. Wrong here is
// not cosmetic — it decides how a screen reader pronounces every German word on the
// page, and what language search engines file it under. Set once at startup rather than
// in an effect because the switcher navigates (full load), so it cannot change in place.
document.documentElement.lang = getLocale();

const container = document.getElementById("root");
if (!container) throw new Error("Root container #root is missing from index.html");

const router = createAppRouter();

// Resolve the matched route before the first render so the router does not briefly
// render its pending fallback over the prerendered markup.
await router.load();

// createRoot, NOT hydrateRoot, and this is a deliberate limitation rather than an
// oversight. Every document is prerendered (scripts/prerender.ts) and that is what
// crawlers, link unfurlers and no-JS visitors read — the goal of the prerender. But
// TanStack Router's client always wraps route matches in <Suspense>, while React's
// renderToString takes the branch that does not, so the two trees differ structurally
// and hydrateRoot discards the document anyway (React #418) while logging an error.
// Reconciling them needs TanStack Start's SSR integration, whose inline hydration
// payload our `script-src 'self'` CSP forbids — the very trade this project made in
// docs/PLAN.md §1.1. So the client re-renders instead of adopting: the prerendered
// pixels are on screen immediately, React replaces them with the identical tree, and
// nothing is logged. Revisit if Router gains a supported prerender path.
createRoot(container).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
