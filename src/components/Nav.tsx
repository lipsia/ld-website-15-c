import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getHero, getNavLinks, SITE } from "#/content/site";
import { m } from "#/paraglide/messages";
import { scrollStore } from "#/scroll/scrollStore";
import { LdMark } from "./ui/LdMark";
import { LocaleSwitcher } from "./ui/LocaleSwitcher";
import { SiteLink } from "./ui/SiteLink";

const SCROLLED_THRESHOLD_PX = 24;

export function Nav() {
	const links = getNavLinks();
	const hero = getHero();
	const [scrolled, setScrolled] = useState(false);
	const [open, setOpen] = useState(false);
	const toggleRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		// scrollStore progress is 0..1 of the whole document; derive a px-ish
		// threshold check from the live scrollY instead, since progress alone
		// can't tell us "24px" on documents of varying height.
		const checkScrolled = () => setScrolled(window.scrollY > SCROLLED_THRESHOLD_PX);
		checkScrolled();
		const unsubscribe = scrollStore.subscribe(checkScrolled);
		window.addEventListener("scroll", checkScrolled, { passive: true });
		return () => {
			unsubscribe();
			window.removeEventListener("scroll", checkScrolled);
		};
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
				toggleRef.current?.focus();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open]);

	const closePanel = () => {
		setOpen(false);
		toggleRef.current?.focus();
	};

	return (
		<header className="nav" data-scrolled={scrolled}>
			<div className="nav__inner">
				<Link className="nav__wordmark" to="/" hash="hero">
					<LdMark className="nav__mark" />
					{/* The mark is decorative, so the link carries the name itself. */}
					<span className="sr-only">{SITE.name}</span>
				</Link>

				<nav className="nav__links" aria-label={m.nav_primary_label()}>
					{links.map((link) => (
						<SiteLink key={link.to + link.label} link={link} />
					))}
				</nav>

				<LocaleSwitcher className="nav__locales" />

				<SiteLink className="btn btn--primary nav__cta" link={hero.ctaPrimary}>
					{hero.ctaPrimary.label}
					<span className="btn__arrow" aria-hidden="true">
						&rarr;
					</span>
				</SiteLink>

				<button
					ref={toggleRef}
					type="button"
					className="nav__toggle"
					aria-expanded={open}
					aria-controls="nav-panel"
					onClick={() => setOpen((value) => !value)}
				>
					<span className="sr-only">{m.nav_menu()}</span>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path
							d="M2 5h16M2 10h16M2 15h16"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			</div>

			{open ? (
				<div id="nav-panel" className="nav__panel glass">
					{links.map((link) => (
						<SiteLink key={link.to + link.label} link={link} onNavigate={closePanel} />
					))}
					<SiteLink className="btn btn--primary" link={hero.ctaPrimary} onNavigate={closePanel}>
						{hero.ctaPrimary.label}
					</SiteLink>
					<LocaleSwitcher className="nav__locales nav__locales--panel" />
				</div>
			) : null}
		</header>
	);
}
