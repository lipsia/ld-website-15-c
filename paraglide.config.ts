import type { compile } from "@inlang/paraglide-js";

/**
 * Single source of truth for the Paraglide compiler, imported by BOTH
 * vite.config.ts (plugin) and scripts/compile-i18n.ts (prepare hook / CI).
 *
 * The bare `paraglide-js compile` CLI must not be used: it knows nothing of these
 * options and would emit the default strategy and urlPatterns, which breaks /en
 * routing until the vite plugin recompiles.
 */
export const paraglideCompilerOptions = {
	project: "./project.inlang",
	outdir: "./src/paraglide",
	// Emit .d.ts alongside the generated .js so `m.*()` is fully typed. The alternative
	// is `allowJs: true` in tsconfig (what grundstock does), which would weaken checking
	// across the whole app to accommodate one generated directory.
	emitTsDeclarations: true,
	// Our routes and canonical URLs carry no trailing slash, but the prerendered files
	// live at e.g. /en/career/index.html, so a static host serves them for "/en/career/".
	// Without this, deLocalizeUrl fails to match the slashed form against the patterns
	// below, the router matches nothing, and the page renders empty on the client —
	// which only showed on the three routes whose localised segment differs from the
	// German one ("career" vs "karriere"), because /en/team happened to match either way.
	trailingSlash: "never",
	// `url` resolves the locale and is what search engines see. `cookie` only persists
	// an explicit switcher choice. `preferredLanguage` stands in for the server-side
	// Accept-Language negotiation grundstock does in a Worker — we are static, so the
	// first-visit guess happens in the browser instead. `baseLocale` is the last resort.
	strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
	// Explicit patterns so the localised root is "/en" and NOT "/en/": otherwise the
	// router's trailing-slash normalisation and localizeUrl redirect each other in an
	// infinite loop. Paths are localised too, so German visitors get German URLs.
	urlPatterns: [
		{
			pattern: "/",
			localized: [
				["en", "/en"],
				["de", "/"],
			],
		},
		{
			pattern: "/karriere",
			localized: [
				["en", "/en/career"],
				["de", "/karriere"],
			],
		},
		{
			pattern: "/impressum",
			localized: [
				["en", "/en/imprint"],
				["de", "/impressum"],
			],
		},
		{
			pattern: "/datenschutz",
			localized: [
				["en", "/en/privacy"],
				["de", "/datenschutz"],
			],
		},
		{
			pattern: "/:path(.*)?",
			localized: [
				["en", "/en/:path(.*)?"],
				["de", "/:path(.*)?"],
			],
		},
	],
} satisfies Parameters<typeof compile>[0];
