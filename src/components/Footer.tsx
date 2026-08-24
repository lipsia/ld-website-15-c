import { FOOTER, SITE } from "#/content/site";
import type { NavLink } from "#/types";

function isFutureLink(href: string): boolean {
	return href === "#";
}

function FooterLink({ link }: { link: NavLink }) {
	const pending = isFutureLink(link.href);
	return (
		<a href={link.href} {...(pending ? { "aria-disabled": true, "data-pending": true } : {})}>
			{link.label}
		</a>
	);
}

export function Footer() {
	const telHref = `tel:${SITE.phone.replace(/\s+/g, "")}`;

	return (
		<footer className="footer">
			<div className="container">
				<h2 className="footer__title">{FOOTER.talkLine}</h2>

				<div className="footer__grid">
					<div>
						<h3>{FOOTER.quickLinksTitle}</h3>
						<nav className="footer__links" aria-label={FOOTER.quickLinksTitle}>
							{FOOTER.quickLinks.map((link) => (
								<FooterLink key={link.href + link.label} link={link} />
							))}
						</nav>
					</div>

					<div>
						<h3>{FOOTER.contactTitle}</h3>
						<address className="footer__contact">
							<span>{SITE.street}</span>
							<span>{SITE.city}</span>
							<a href={`mailto:${SITE.email}`}>{SITE.email}</a>
							<a href={telHref}>{SITE.phone}</a>
						</address>
					</div>

					<div>
						<h3 className="sr-only">Legal</h3>
						<nav className="footer__links" aria-label="Legal">
							{FOOTER.legalLinks.map((link) => (
								<FooterLink key={link.href + link.label} link={link} />
							))}
						</nav>
					</div>
				</div>

				<div className="footer__bottom">{FOOTER.copyright}</div>
			</div>
		</footer>
	);
}
