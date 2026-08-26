import { Link } from "@tanstack/react-router";
import type { NavLink } from "#/types";

/**
 * Renders a NavLink through the router.
 *
 * Every internal link goes through here rather than a bare `<a>` so that:
 *   - an anchor like "competence" resolves against the HOME route from any page, not
 *     against whatever document you happen to be on;
 *   - navigation stays client-side, which is what keeps the WebGL context alive when
 *     moving between pages that both use it;
 *   - Phase 2 can localise every path in one place by swapping the router's rewrite,
 *     with no per-link changes.
 *
 * `exactOptionalPropertyTypes` is on, so `hash` is spread conditionally — passing
 * `hash={undefined}` explicitly is a type error, not a no-op.
 */
export function SiteLink({
	link,
	className,
	onNavigate,
	children,
}: {
	link: NavLink;
	className?: string;
	onNavigate?: () => void;
	children?: React.ReactNode;
}) {
	return (
		<Link
			to={link.to}
			{...(link.hash ? { hash: link.hash } : {})}
			{...(className ? { className } : {})}
			{...(onNavigate ? { onClick: onNavigate } : {})}
		>
			{children ?? link.label}
		</Link>
	);
}
