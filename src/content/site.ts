/**
 * All copy on this page is transcribed verbatim from the live English site at
 * https://lipsia.digital/en/. Do not edit without explicit sign-off from marketing.
 */

import type { ClientMark, NavLink, ServiceItem, StatItem } from "#/types";

export const SITE = {
	name: "Lipsia Digital",
	tagline: "We bring visions to life",
	description:
		"Successfully implement transformations and shape the future with digital solutions. Software Engineering, Information Systems and Digital Products from Leipzig.",
	url: "https://lipsia.digital",
	email: "info@lipsia.digital",
	phone: "01523 3881705",
	street: "Reichsstraße 1-9",
	city: "04109 Leipzig",
} as const;

export const NAV_LINKS = [
	{ label: "Home", href: "#hero" },
	{ label: "Vision", href: "#competence" },
	{ label: "Services", href: "#services" },
	{ label: "Clients", href: "#clients" },
	{ label: "Contacts", href: "#contact" },
] as const satisfies readonly NavLink[];

export const HERO = {
	headline: "We bring visions to life",
	/** Rendered as the pixel mosaic in the hero. One entry per line. */
	wordmark: ["lipsia digital"],
	subheadline:
		"Successfully implement transformations and shape the future with digital solutions.",
	disciplines: ["Software Engineering", "Information Systems", "Digital products"],
	ctaPrimary: { label: "Contact", href: "#contact" },
	ctaSecondary: { label: "Career", href: "#" },
} as const;

export const COMPETENCES = {
	title: "Our fields of competence",
	items: [
		{
			id: "software-engineering",
			title: "Software Engineering",
			body: "We develop tailor-made software solutions for you, from planning and design to implementation and support, the right experts are at your side.",
		},
		{
			id: "crm-system",
			title: "CRM System",
			body: "We accompany your transformation to a digital, customer-centric company and help to sustainably improve your customer:internal relationships with CRM solutions in order to unleash new growth potential.",
		},
		{
			id: "it-consulting",
			title: "IT Consulting",
			body: "Our analysts and software architects identify potential in your IT enterprise architecture and align it with your current and future business model, taking into account organizational, functional and human factors.",
		},
	] as const,
} as const satisfies { title: string; items: readonly ServiceItem[] };

export const SERVICES = {
	title: "Our services for your business",
	items: [
		{
			id: "websites-webapps",
			title: "WEBSITES & WEBAPPS",
			body: "Modern, intuitive and secure websites and functional web apps as a digital customer contact point for your company.",
		},
		{
			id: "e-commerce",
			title: "E-COMMERCE SOLUTIONS",
			body: "Efficient solutions for building and operating digital marketplaces and stores where design and functionality go hand in hand",
		},
		{
			id: "custom-applications",
			title: "CUSTOM APPLICATIONS",
			body: "Customized operational application systems and interfaces to strengthen your market position and automate operational activities",
		},
		{
			id: "enterprise-platforms",
			title: "ENTERPRISE PLATFORMS & APPLICATIONS",
			body: "Operational information systems with which you control, monitor, evaluate and automate your operational and scheduling processes as well as cross-company business processes",
		},
	] as const,
} as const satisfies { title: string; items: readonly ServiceItem[] };

export const TECH = {
	title: "Technologies & Digital Competencies",
	lead: "With future-oriented technologies, pioneering digitization strategies and experienced teams, we develop needs-based solutions to shape success stories.",
	body: "From potential analysis and qualified conception to project consulting, interface and software development, and adaptation of standard solutions to integration, commissioning, and further development – as specialists in software engineering and business information systems, we bundle experts and solution concepts along a digitization strategy to realize digital business models and cross-company information logistics.",
	closing:
		"Our team of international experts will support your company and project as pioneers and companions.",
	stats: [
		{ id: "experts", label: "International experts", value: 30, suffix: "+" },
		{ id: "languages", label: "Languages spoken", value: 10, suffix: "+" },
	] as const,
} as const satisfies {
	title: string;
	lead: string;
	body: string;
	closing: string;
	stats: readonly StatItem[];
};

export const CLIENTS = {
	eyebrow: "CLIENTS",
	title: "who place their trust in us",
	marks: [
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
	] as const,
} as const satisfies { eyebrow: string; title: string; marks: readonly ClientMark[] };

export const CTA_SECTION = {
	title: "With us you can grow.",
	body: "We design a strategy tailored to your individual needs and implement your digital transformation along these lines.",
	cta: { label: "Contact", href: "#contact" },
} as const;

export const FOOTER = {
	talkLine: "Let’s talk about what we can do for you",
	quickLinksTitle: "Quick Links",
	contactTitle: "Contact Us",
	quickLinks: [
		{ label: "Home", href: "#hero" },
		{ label: "Vision", href: "#competence" },
		{ label: "Team", href: "#" },
		{ label: "Career", href: "#" },
		{ label: "Contacts", href: "#contact" },
	] as const satisfies readonly NavLink[],
	legalLinks: [
		{ label: "Privacy", href: "#" },
		{ label: "Impressum", href: "#" },
	] as const satisfies readonly NavLink[],
	copyright: "Lipsia Digital © 2023",
} as const;
