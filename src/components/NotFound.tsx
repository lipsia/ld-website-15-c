import { m } from "#/paraglide/messages";
import { PagePlaceholder } from "./ui/PagePlaceholder";
import { SiteLink } from "./ui/SiteLink";

/**
 * Rendered for any path the route tree does not match.
 *
 * Reachable two ways, and both need it: a client-side navigation to a bad path, and a
 * static host that serves 404.html (prerendered by scripts/prerender.ts) for a URL with
 * no file behind it. Without this the router rendered nav and footer around nothing at
 * all — a page that looks broken rather than one that says what happened.
 */
export function NotFound() {
	return (
		<PagePlaceholder eyebrow={m.notfound_eyebrow()} title={m.notfound_title()}>
			<p className="page__pending">{m.notfound_body()}</p>
			<p>
				<SiteLink className="btn btn--primary" link={{ label: m.notfound_home(), to: "/" }} />
			</p>
		</PagePlaceholder>
	);
}
