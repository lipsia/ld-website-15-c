import { m } from "#/paraglide/messages";
import { Reveal } from "./Reveal";

/**
 * Structure for a page whose copy has not landed yet.
 *
 * Renders the real heading hierarchy and landmark so routing, SEO and a11y can be
 * verified now, while stating plainly that the body is outstanding. Deliberately not
 * dressed up as finished content: an empty page that looks complete is how a
 * placeholder reaches production unnoticed. The Impressum and Datenschutz pages in
 * particular are legally required to carry real content before this site goes live.
 */
export function PagePlaceholder({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string;
	title: string;
	children?: React.ReactNode;
}) {
	return (
		<section className="page" aria-labelledby="page-heading">
			<div className="container">
				<Reveal className="section-head">
					<span className="eyebrow">{eyebrow}</span>
					<h1 id="page-heading">{title}</h1>
				</Reveal>

				{children ?? <p className="page__pending">{m.page_pending()}</p>}
			</div>
		</section>
	);
}
