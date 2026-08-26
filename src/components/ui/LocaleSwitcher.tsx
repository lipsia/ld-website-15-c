import { useLocation } from "@tanstack/react-router";
import { m } from "#/paraglide/messages";
import { getLocale, locales, localizeHref } from "#/paraglide/runtime";

const LABELS: Record<string, string> = { de: "DE", en: "EN" };

/**
 * Language switcher.
 *
 * Deliberately real anchors, not buttons calling `setLocale()`. The `url` strategy is
 * first in the chain, so the locale IS the path — an `<a href>` to the localised URL is
 * both the correct navigation and a link a crawler can follow, which is what makes the
 * two language versions indexable. Paraglide's cookie strategy then remembers the
 * choice for subsequent visits to an unprefixed URL.
 *
 * A full page load (no router `Link`) is intentional: the active locale is resolved at
 * module scope by the generated runtime, so a client-side transition would leave the
 * previous language rendered until something re-read it.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
	const current = getLocale();
	// The router's location, not window.location: this component renders during the
	// build-time prerender (docs/PLAN.md Phase 3) where there is no window at all.
	//
	// Normalised, because the same page is reachable as "/team" and "/team/" — the
	// prerendered file lives at /team/index.html, so a static host serves it for the
	// slashed URL while the build rendered the unslashed one. Feeding the raw pathname
	// to localizeHref produced href="/team" in the HTML and href="/team/" on the
	// client, which is a hydration mismatch that throws away the whole prerendered
	// document (React #418) over one character.
	const { pathname: rawPathname } = useLocation();
	const pathname = rawPathname !== "/" ? rawPathname.replace(/\/+$/, "") : rawPathname;

	return (
		<nav className={className} aria-label={m.locale_switch_label()}>
			{locales.map((locale) => {
				const active = locale === current;
				return (
					<a
						key={locale}
						href={localizeHref(pathname, { locale })}
						hrefLang={locale}
						// The current language is not a destination; announce it as the state
						// it is rather than offering a link to where you already are.
						{...(active ? { "aria-current": "true" as const } : {})}
						data-active={active}
					>
						{LABELS[locale] ?? locale.toUpperCase()}
					</a>
				);
			})}
		</nav>
	);
}
