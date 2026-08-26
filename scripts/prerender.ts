/**
 * Writes one static HTML file per route x locale, after `vite build`.
 *
 * This is what gives the site real crawlable HTML without a server. Before it existed,
 * a crawler that does not execute JS saw a `<title>` and zero characters of body text;
 * Google renders JS but LinkedIn, Slack, WhatsApp, Bing and most AI crawlers do not.
 *
 * Deliberately NOT SSR: nothing here runs per request, no state is serialised into the
 * page, and therefore nothing needs an inline <script>. That is what keeps
 * `script-src 'self'` intact — see docs/PLAN.md §1.1.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { baseLocale, locales, localizeHref, render } from "../dist-ssr/entry-server.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

/** Unlocalised route paths, i.e. exactly the files in src/routes/. */
const ROUTES = ["/", "/team", "/karriere", "/impressum", "/datenschutz"] as const;

const template = await readFile(join(dist, "index.html"), "utf8");

/**
 * Splits a rendered tree into the head-hoistable prefix and the rest.
 *
 * Only the LEADING run of title/meta/link is taken: those come from <Seo>, which every
 * route renders first. Anything later belongs to the page and stays in the body.
 */
function liftHoistables(rendered: string): { head: string; body: string } {
	const HOISTABLE = /^\s*<(?:title>[\s\S]*?<\/title>|meta\b[^>]*>|link\b[^>]*>)/;
	let body = rendered;
	const head: string[] = [];
	for (;;) {
		const match = body.match(HOISTABLE);
		if (!match) break;
		head.push(match[0].trim());
		body = body.slice(match[0].length);
	}
	return { head: head.join(""), body };
}

/** Where a localised path lands on disk: "/en/career" -> "en/career/index.html". */
function outputPath(localised: string): string {
	const clean = localised.replace(/^\/+|\/+$/g, "");
	return clean === "" ? "index.html" : join(clean, "index.html");
}

let written = 0;
const emitted: string[] = [];
/** Every file written, so the CSP check below covers all of them — 404.html included. */
const writtenFiles: string[] = [];

for (const locale of locales) {
	for (const route of ROUTES) {
		const localised = localizeHref(route, { locale });
		const rendered = await render(localised, locale);

		// React 19 hoists <title>/<meta>/<link> to <head> on the CLIENT, but
		// renderToString emits them exactly where the component rendered them — inside
		// the app tree. Leaving them there puts head tags in the body (invalid, and
		// crawlers that read <head> never see the canonical) AND guarantees a hydration
		// mismatch, because the client's #root children would not include them. So they
		// are lifted out here, which is what the client does anyway.
		//
		// The JSON-LD <script> is deliberately NOT lifted: React only hoists async
		// scripts, so it stays in the tree on the client and must stay here to match.
		const { head, body } = liftHoistables(rendered);

		let html = template
			// The shipped template hardcodes lang="en"; each file must declare its own.
			.replace(/<html lang="[^"]*">/, `<html lang="${locale}">`)
			// React 19 hoists <title>/<meta> rendered anywhere in the tree into the
			// stream, so the head tags arrive inside `body` — no head library needed.
			.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
			.replace("</head>", `${head}</head>`);

		// The template's static <title> and description are a pre-prerender fallback and
		// now duplicate React's, which are the authoritative, per-page, per-locale ones.
		html = html
			.replace(/\s*<title>[^<]*<\/title>/, "")
			.replace(/\s*<meta\s+name="description"[^>]*>/, "");

		const file = join(dist, outputPath(localised));
		await mkdir(dirname(file), { recursive: true });
		await writeFile(file, html, "utf8");
		written++;
		emitted.push(localised);
		writtenFiles.push(file);
	}
}

console.log(`prerendered ${written} documents: ${emitted.join(", ")}`);

// --- 404, for the static host to serve when no file matches
//
// One document only: a host has a single 404 page and no way to negotiate a language
// for it, so it is rendered in the base locale. Client-side navigation to a bad path is
// handled separately by the root route's notFoundComponent, which does follow the
// active locale. Deliberately NOT added to the sitemap.
{
	const rendered = await render("/__not_found__", baseLocale as "de" | "en");
	const { head, body } = liftHoistables(rendered);
	const html = template
		.replace(/<html lang="[^"]*">/, `<html lang="${baseLocale}">`)
		.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
		.replace("</head>", `${head}</head>`)
		.replace(/\s*<title>[^<]*<\/title>/, "")
		.replace(/\s*<meta\s+name="description"[^>]*>/, "");
	const file = join(dist, "404.html");
	await writeFile(file, html, "utf8");
	writtenFiles.push(file);
	console.log(`wrote 404.html (${baseLocale})`);
}

// --- sitemap, generated from the same route x locale product that produced the files
//
// Hand-maintained was not an option: robots.txt advertises this URL, so a stale or
// missing file is a 404 a crawler trips over. Each <url> carries the full set of
// xhtml:link alternates, which is how Google is told the two language versions are the
// same page rather than duplicates competing with each other.
const SITE_URL = "https://lipsia.digital";
const xml: string[] = [
	'<?xml version="1.0" encoding="UTF-8"?>',
	'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
];
for (const route of ROUTES) {
	for (const locale of locales) {
		const loc = `${SITE_URL}${localizeHref(route, { locale })}`;
		xml.push("\t<url>", `\t\t<loc>${loc}</loc>`);
		for (const alt of locales) {
			xml.push(
				`\t\t<xhtml:link rel="alternate" hreflang="${alt}" href="${SITE_URL}${localizeHref(route, { locale: alt })}"/>`,
			);
		}
		xml.push(`\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>`);
		// The home page is the entry point; the rest are equal siblings.
		xml.push(`\t\t<priority>${route === "/" ? "1.0" : "0.7"}</priority>`, "\t</url>");
	}
}
xml.push("</urlset>", "");
await writeFile(join(dist, "sitemap.xml"), xml.join("\n"), "utf8");
console.log(`generated sitemap.xml with ${ROUTES.length * locales.length} urls`);

/**
 * The whole reason this project uses TanStack Router rather than Start. An inline
 * <script> without a `src` would be blocked by our CSP at runtime, producing a page
 * that renders and then does nothing — a failure that is easy to miss in review and
 * impossible to miss here.
 */
for (const file of writtenFiles) {
	const html = await readFile(file, "utf8");
	// Only EXECUTABLE inline scripts matter. `application/ld+json` is a data block:
	// browsers never execute it, and CSP's script-src does not apply to it, so our
	// Organization schema is legitimately inline.
	const inline = [
		...html.matchAll(
			/<script(?![^>]*\bsrc=)(?![^>]*\btype="(?:application\/ld\+json|application\/json)")[^>]*>/g,
		),
	];
	if (inline.length > 0) {
		throw new Error(
			`prerender: ${file} contains ${inline.length} inline <script> tag(s), which the CSP forbids: ${inline
				.map((match) => match[0])
				.join(" ")}`,
		);
	}
}
console.log(`CSP check: no inline scripts in any of ${writtenFiles.length} documents`);
