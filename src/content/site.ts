/**
 * All copy is transcribed verbatim from the live site — German from
 * https://lipsia.digital/, English from https://lipsia.digital/en/. Do not edit
 * without explicit sign-off from marketing.
 *
 * Strings live in messages/{de,en}.json and reach the app as Paraglide's `m.*()`
 * functions. This module keeps the SHAPE — which cards exist, in what order, with what
 * ids — and pulls the words through `m` at call time.
 *
 * Everything translatable is therefore behind a `get*()` function, deliberately. `m.*()`
 * reads the ambient locale when it is CALLED, so evaluating one at module scope would
 * freeze the language at import time: the page would render whatever locale happened to
 * be active on first import and the switcher would silently do nothing.
 *
 * Facts that are not copy — the address, the phone number, client names, logo paths,
 * route targets, stat values — stay as plain consts. A street does not get translated.
 */

import { m } from "#/paraglide/messages";
import type { ClientMark, NavLink, ServiceItem, StatItem } from "#/types";

/** Locale-independent identity and contact details. */
export const SITE = {
	name: "Lipsia Digital",
	url: "https://lipsia.digital",
	email: "info@lipsia.digital",
	phone: "01523 3881705",
	street: "Reichsstraße 1-9",
	city: "04109 Leipzig",
} as const;

export function getSiteMeta() {
	return {
		tagline: m.site_tagline(),
		description: m.site_description(),
	};
}

/**
 * The top nav carries only destinations you cannot reach some other way: the LD mark
 * already goes home, and Contact is the button at the right-hand end, so neither needs
 * a second entry. Clients is a section of the home page rather than a place to go.
 * getFooter().quickLinks stays the fuller index.
 *
 * Route paths are the German (base locale) ones; Paraglide's urlPatterns localise them,
 * so `/karriere` is rendered as `/en/career` when the English locale is active.
 */
export function getNavLinks(): readonly NavLink[] {
	return [
		{ label: m.nav_vision(), to: "/", hash: "competence" },
		{ label: m.nav_services(), to: "/", hash: "services" },
		{ label: m.nav_team(), to: "/team" },
		{ label: m.nav_career(), to: "/karriere" },
	];
}

/** The brand mark as drawn in the hero mosaic. Not copy — it is the logotype. */
export const HERO_WORDMARK = ["lipsia digital"] as const;

export function getHero() {
	return {
		headline: m.hero_headline(),
		subheadline: m.hero_subheadline(),
		disciplines: [
			m.hero_discipline_software(),
			m.hero_discipline_systems(),
			m.hero_discipline_products(),
		],
		ctaPrimary: { label: m.nav_contact(), to: "/", hash: "contact" } satisfies NavLink,
		ctaSecondary: { label: m.nav_career(), to: "/karriere" } satisfies NavLink,
	};
}

export function getCompetences(): { title: string; items: readonly ServiceItem[] } {
	return {
		title: m.competences_title(),
		items: [
			{
				id: "software-engineering",
				title: m.competence_software_title(),
				body: m.competence_software_body(),
			},
			{ id: "crm-system", title: m.competence_crm_title(), body: m.competence_crm_body() },
			{
				id: "it-consulting",
				title: m.competence_consulting_title(),
				body: m.competence_consulting_body(),
			},
		],
	};
}

export function getServices(): { title: string; items: readonly ServiceItem[] } {
	return {
		title: m.services_title(),
		items: [
			{
				id: "websites-webapps",
				title: m.service_websites_title(),
				body: m.service_websites_body(),
			},
			{ id: "e-commerce", title: m.service_ecommerce_title(), body: m.service_ecommerce_body() },
			{
				id: "custom-applications",
				title: m.service_custom_title(),
				body: m.service_custom_body(),
			},
			{
				id: "enterprise-platforms",
				title: m.service_enterprise_title(),
				body: m.service_enterprise_body(),
			},
		],
	};
}

export function getTech(): {
	title: string;
	lead: string;
	body: string;
	closing: string;
	stats: readonly StatItem[];
} {
	return {
		title: m.tech_title(),
		lead: m.tech_lead(),
		body: m.tech_body(),
		closing: m.tech_closing(),
		// Values are facts, not copy — only the labels translate.
		stats: [
			{ id: "experts", label: m.tech_stat_experts(), value: 30, suffix: "+" },
			{ id: "languages", label: m.tech_stat_languages(), value: 10, suffix: "+" },
		],
	};
}

/**
 * Client names are proper nouns and their logos are artwork: identical in every locale,
 * so they stay a const rather than becoming sixty message keys that never differ.
 */
export const CLIENT_MARKS = [
	{ id: "commerzbank", name: "Commerzbank", logo: "/assets/clients/commerzbank.png" },
	{ id: "dkms", name: "DKMS", logo: "/assets/clients/dkms.png" },
	{ id: "ekd", name: "Energiekonzepte Deutschland", logo: "/assets/clients/ekd.png" },
	{ id: "smava", name: "smava", logo: "/assets/clients/smava.png" },
	{ id: "teambank", name: "TeamBank", logo: "/assets/clients/teambank.png" },
	{ id: "philoro", name: "philoro", logo: "/assets/clients/philoro.png" },
	{ id: "qunomedical", name: "Qunomedical", logo: "/assets/clients/qunomedical.png" },
	{ id: "rapidobject", name: "Rapidobject", logo: "/assets/clients/rapidobject.png" },
	{ id: "truck-norris", name: "Truck Norris", logo: "/assets/clients/truck-norris.png" },
	{ id: "buzzard", name: "Buzzard", logo: "/assets/clients/buzzard.png" },
	{ id: "hsm", name: "Hessisches Sozialministerium", logo: "/assets/clients/hsm.png" },
	{
		id: "financial-service-plus",
		name: "Financial Service Plus",
		logo: "/assets/clients/financial-service-plus.png",
	},
	{ id: "ass-altenburger", name: "Ass Altenburger", logo: "/assets/clients/ass-altenburger.png" },
	{ id: "so-use", name: "SO-USE", logo: "/assets/clients/so-use.png" },
	{ id: "enercity", name: "enercity", logo: "/assets/clients/enercity.png" },
] as const satisfies readonly ClientMark[];

export function getClients(): { eyebrow: string; title: string; marks: readonly ClientMark[] } {
	return {
		eyebrow: m.clients_eyebrow(),
		title: m.clients_title(),
		marks: CLIENT_MARKS,
	};
}

export function getCta() {
	return {
		title: m.cta_title(),
		body: m.cta_body(),
		cta: { label: m.nav_contact(), to: "/", hash: "contact" } satisfies NavLink,
	};
}

/**
 * The secondary pages. Titles only — body copy is Phase 5 of docs/PLAN.md and must be
 * transcribed from the live site or signed off by marketing, not invented here.
 *
 * `pending: true` is what makes the unfinished state visible in the UI instead of
 * shipping a page that looks finished and says nothing. Impressum and Datenschutz are
 * legally required to carry real content before this site goes live.
 */
export function getPages() {
	return {
		team: { title: m.page_team_title(), eyebrow: m.page_team_eyebrow(), pending: true },
		career: { title: m.page_career_title(), eyebrow: m.page_career_eyebrow(), pending: true },
		imprint: { title: m.page_imprint_title(), eyebrow: m.page_legal_eyebrow(), pending: true },
		privacy: { title: m.page_privacy_title(), eyebrow: m.page_legal_eyebrow(), pending: true },
	};
}

export function getFooter(): {
	talkLine: string;
	quickLinksTitle: string;
	contactTitle: string;
	legalTitle: string;
	quickLinks: readonly NavLink[];
	legalLinks: readonly NavLink[];
	copyright: string;
} {
	return {
		talkLine: m.footer_talk_line(),
		quickLinksTitle: m.footer_quick_links_title(),
		contactTitle: m.footer_contact_title(),
		legalTitle: m.footer_legal_title(),
		quickLinks: [
			{ label: m.nav_home(), to: "/", hash: "hero" },
			{ label: m.nav_vision(), to: "/", hash: "competence" },
			{ label: m.nav_team(), to: "/team" },
			{ label: m.nav_career(), to: "/karriere" },
			{ label: m.nav_contact(), to: "/", hash: "contact" },
		],
		legalLinks: [
			{ label: m.footer_privacy(), to: "/datenschutz" },
			{ label: m.footer_imprint(), to: "/impressum" },
		],
		copyright: m.footer_copyright(),
	};
}
