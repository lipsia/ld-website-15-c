import { beforeEach, describe, expect, it } from "vitest";
import { type Locale, locales, overwriteGetLocale } from "#/paraglide/runtime";
import type { NavLink } from "#/types";
// Imported rather than read from disk: the app tsconfig has no node types, and a
// compile-time import also fails the build if a catalogue is ever deleted.
import deMessages from "../../messages/de.json";
import enMessages from "../../messages/en.json";
import {
	CLIENT_MARKS,
	getClients,
	getCompetences,
	getCta,
	getFooter,
	getHero,
	getNavLinks,
	getPages,
	getServices,
	getSiteMeta,
	getTech,
	SITE,
} from "./site";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every route the site declares (src/routes/). A link anywhere else is a dead link. */
const ROUTES = new Set(["/", "/team", "/karriere", "/impressum", "/datenschutz"]);

/** Anchors are stored WITHOUT the leading "#" so the router can compose the URL. */
const HASH_PATTERN = /^[a-z][a-z-]*$/;

/** Locale is read at call time; overwriting the getter is how a test picks one. */
function withLocale(locale: Locale) {
	overwriteGetLocale(() => locale);
}

const CATALOGUES: Record<string, Record<string, string>> = {
	de: deMessages,
	en: enMessages,
};

const readMessages = (locale: string): Record<string, string> => {
	const catalogue = CATALOGUES[locale];
	if (!catalogue) throw new Error(`no catalogue imported for locale ${locale}`);
	return catalogue;
};

describe("message catalogues", () => {
	it("declares exactly the locales the compiler was given", () => {
		expect([...locales].sort()).toEqual(["de", "en"]);
	});

	it("every locale defines the same keys", () => {
		const [first, ...rest] = locales.map((locale) => ({
			locale,
			keys: new Set(Object.keys(readMessages(locale)).filter((key) => !key.startsWith("$"))),
		}));
		if (!first) throw new Error("no locales");
		for (const other of rest) {
			const missing = [...first.keys].filter((key) => !other.keys.has(key));
			const extra = [...other.keys].filter((key) => !first.keys.has(key));
			expect(missing, `${other.locale} is missing keys`).toEqual([]);
			expect(extra, `${other.locale} has keys ${first.locale} lacks`).toEqual([]);
		}
	});

	it("has no empty or untrimmed values in any locale", () => {
		for (const locale of locales) {
			for (const [key, value] of Object.entries(readMessages(locale))) {
				if (key.startsWith("$")) continue;
				expect(value, `${locale}.${key}`).not.toBe("");
				expect(value, `${locale}.${key}`).toBe(value.trim());
			}
		}
	});
});

/**
 * The regression guard for the trap this refactor existed to remove: every export is a
 * FUNCTION, so `m.*()` is evaluated per call and follows the ambient locale. If any
 * accessor is ever hoisted back to module scope the copy freezes at import time — the
 * switcher would appear wired up and change nothing — and these fail.
 */
describe("copy follows the active locale", () => {
	it("returns different words for de and en", () => {
		withLocale("de");
		const de = { hero: getHero().headline, tech: getTech().title, cta: getCta().title };
		withLocale("en");
		const en = { hero: getHero().headline, tech: getTech().title, cta: getCta().title };

		expect(de.hero).not.toBe(en.hero);
		expect(de.tech).not.toBe(en.tech);
		expect(de.cta).not.toBe(en.cta);
		expect(de.hero).toBe("Wir machen Visionen lebendig");
		expect(en.hero).toBe("We bring visions to life");
	});

	it("switches back and forth, not just once", () => {
		// A one-way check would pass even if the value were cached after first read.
		withLocale("de");
		const first = getSiteMeta().tagline;
		withLocale("en");
		const second = getSiteMeta().tagline;
		withLocale("de");
		const third = getSiteMeta().tagline;
		expect(second).not.toBe(first);
		expect(third).toBe(first);
	});
});

describe.each(locales)("content shape (%s)", (locale) => {
	beforeEach(() => withLocale(locale));

	it("competences have three items with non-empty title and body", () => {
		const { title, items } = getCompetences();
		expect(title).not.toBe("");
		expect(items).toHaveLength(3);
		for (const item of items) {
			expect(item.title.trim()).toBe(item.title);
			expect(item.title).not.toBe("");
			expect(item.body.trim()).toBe(item.body);
			expect(item.body).not.toBe("");
		}
	});

	it("services have four items, titles in ALL-CAPS", () => {
		const { items } = getServices();
		expect(items).toHaveLength(4);
		for (const item of items) {
			expect(item.title).toBe(item.title.toUpperCase());
			expect(item.body).not.toBe("");
		}
	});

	it("tech has two stats with positive values", () => {
		const { stats, title, lead, body, closing } = getTech();
		for (const text of [title, lead, body, closing]) expect(text).not.toBe("");
		expect(stats).toHaveLength(2);
		for (const stat of stats) {
			expect(stat.value).toBeGreaterThan(0);
			expect(stat.label).not.toBe("");
		}
	});

	it("hero lists exactly the three disciplines", () => {
		expect(getHero().disciplines).toHaveLength(3);
		for (const discipline of getHero().disciplines) expect(discipline).not.toBe("");
	});

	it("every page has a title and an eyebrow", () => {
		for (const [key, page] of Object.entries(getPages())) {
			expect(page.title, key).not.toBe("");
			expect(page.eyebrow, key).not.toBe("");
		}
	});

	describe("links resolve to declared routes", () => {
		const groups = (): readonly (readonly [string, readonly NavLink[]])[] => [
			["nav", getNavLinks()],
			["footer.quickLinks", getFooter().quickLinks],
			["footer.legalLinks", getFooter().legalLinks],
			["hero ctas", [getHero().ctaPrimary, getHero().ctaSecondary]],
			["cta", [getCta().cta]],
		];

		it("point at real routes", () => {
			for (const [name, links] of groups()) {
				for (const link of links) {
					expect(ROUTES.has(link.to), `${name}: unknown route ${link.to}`).toBe(true);
				}
			}
		});

		it("store anchors without a leading hash, and only on the home route", () => {
			for (const [name, links] of groups()) {
				for (const link of links) {
					if (link.hash === undefined) continue;
					expect(link.hash, `${name}: ${link.label}`).toMatch(HASH_PATTERN);
					// All our anchor targets are sections of "/", so a hash paired with
					// any other route points at an element that page does not contain.
					expect(link.to, `anchor #${link.hash} on ${link.to}`).toBe("/");
				}
			}
		});

		it("gives every link a visible label", () => {
			for (const [name, links] of groups()) {
				for (const link of links) expect(link.label, `${name}: ${link.to}`).not.toBe("");
			}
		});
	});
});

describe("locale-independent data", () => {
	it("SITE.email matches email pattern", () => {
		expect(SITE.email).toMatch(EMAIL_PATTERN);
	});

	it("has 15 client marks, one per die face", () => {
		expect(CLIENT_MARKS).toHaveLength(15);
		expect(getClients().marks).toBe(CLIENT_MARKS);
	});

	it("client ids are unique and logo paths are self-hosted PNGs", () => {
		const ids = new Set(CLIENT_MARKS.map((mark) => mark.id));
		expect(ids.size).toBe(CLIENT_MARKS.length);
		for (const mark of CLIENT_MARKS) {
			expect(mark.name).not.toBe("");
			// A remote URL here would be blocked by our CSP at runtime.
			expect(mark.logo).toMatch(/^\/assets\/clients\/[a-z0-9-]+\.png$/);
		}
	});
});
