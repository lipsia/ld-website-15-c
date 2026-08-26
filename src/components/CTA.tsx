import { getCta } from "#/content/site";
import { Reveal } from "./ui/Reveal";
import { SiteLink } from "./ui/SiteLink";

export function CTA() {
	const cta = getCta();

	return (
		<section id="contact" className="cta" aria-labelledby="cta-heading">
			<div className="container">
				<Reveal className="cta__inner glass">
					<h2 id="cta-heading">{cta.title}</h2>
					<p>{cta.body}</p>
					<SiteLink className="btn btn--primary" link={cta.cta} />
				</Reveal>
			</div>
		</section>
	);
}
