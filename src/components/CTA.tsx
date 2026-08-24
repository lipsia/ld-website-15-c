import { CTA_SECTION } from "#/content/site";
import { Reveal } from "./ui/Reveal";

export function CTA() {
	return (
		<section id="contact" className="cta" aria-labelledby="cta-heading">
			<div className="container">
				<Reveal className="cta__inner glass">
					<h2 id="cta-heading">{CTA_SECTION.title}</h2>
					<p>{CTA_SECTION.body}</p>
					<a className="btn btn--primary" href={CTA_SECTION.cta.href}>
						{CTA_SECTION.cta.label}
					</a>
				</Reveal>
			</div>
		</section>
	);
}
