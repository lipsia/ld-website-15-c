import { getFooter, SITE } from "#/content/site";
import { SiteLink } from "./ui/SiteLink";

export function Footer() {
	const footer = getFooter();
	const telHref = `tel:${SITE.phone.replace(/\s+/g, "")}`;

	return (
		<footer className="footer">
			<div className="container">
				<h2 className="footer__title">{footer.talkLine}</h2>

				<div className="footer__grid">
					<div>
						<h3>{footer.quickLinksTitle}</h3>
						<nav className="footer__links" aria-label={footer.quickLinksTitle}>
							{footer.quickLinks.map((link) => (
								<SiteLink key={link.to + link.label} link={link} />
							))}
						</nav>
					</div>

					<div>
						<h3>{footer.contactTitle}</h3>
						<address className="footer__contact">
							<span>{SITE.street}</span>
							<span>{SITE.city}</span>
							<a href={`mailto:${SITE.email}`}>{SITE.email}</a>
							<a href={telHref}>{SITE.phone}</a>
						</address>
					</div>

					<div>
						<h3 className="sr-only">{footer.legalTitle}</h3>
						<nav className="footer__links" aria-label={footer.legalTitle}>
							{footer.legalLinks.map((link) => (
								<SiteLink key={link.to + link.label} link={link} />
							))}
						</nav>
					</div>
				</div>

				<div className="footer__bottom">{footer.copyright}</div>
			</div>
		</footer>
	);
}
