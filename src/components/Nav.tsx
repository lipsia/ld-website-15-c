import { useEffect, useRef, useState } from "react";
import { HERO, NAV_LINKS, SITE } from "#/content/site";
import { scrollStore } from "#/scroll/scrollStore";
import type { NavLink } from "#/types";
import { LdMark } from "./ui/LdMark";

const SCROLLED_THRESHOLD_PX = 24;

function isFutureLink(href: string): boolean {
	return href === "#";
}

function NavAnchor({ link, onNavigate }: { link: NavLink; onNavigate?: () => void }) {
	const pending = isFutureLink(link.href);
	return (
		<a
			href={link.href}
			{...(pending ? { "aria-disabled": true, "data-pending": true } : {})}
			onClick={onNavigate}
		>
			{link.label}
		</a>
	);
}

export function Nav() {
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
				<a className="nav__wordmark" href="#hero">
					<LdMark className="nav__mark" />
					{/* The mark is decorative, so the link carries the name itself. */}
					<span className="sr-only">{SITE.name}</span>
				</a>

				<nav className="nav__links" aria-label="Primary">
					{NAV_LINKS.map((link) => (
						<NavAnchor key={link.href + link.label} link={link} />
					))}
				</nav>

				<a className="btn btn--primary nav__cta" href={HERO.ctaPrimary.href}>
					{HERO.ctaPrimary.label}
					<span className="btn__arrow" aria-hidden="true">
						&rarr;
					</span>
				</a>

				<button
					ref={toggleRef}
					type="button"
					className="nav__toggle"
					aria-expanded={open}
					aria-controls="nav-panel"
					onClick={() => setOpen((value) => !value)}
				>
					<span className="sr-only">Menu</span>
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
					{NAV_LINKS.map((link) => (
						<NavAnchor key={link.href + link.label} link={link} onNavigate={closePanel} />
					))}
					<a className="btn btn--primary" href={HERO.ctaPrimary.href} onClick={closePanel}>
						{HERO.ctaPrimary.label}
					</a>
				</div>
			) : null}
		</header>
	);
}
