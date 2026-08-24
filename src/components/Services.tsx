import { SERVICES } from "#/content/site";
import { Reveal } from "./ui/Reveal";

export function Services() {
	return (
		<section id="services" aria-labelledby="services-heading">
			<div className="container">
				<Reveal className="section-head">
					<h2 id="services-heading">{SERVICES.title}</h2>
				</Reveal>

				<div className="card-grid">
					{SERVICES.items.map((item, index) => (
						<Reveal key={item.id} delay={index * 0.08}>
							<article className="card">
								<h3>{item.title}</h3>
								<p>{item.body}</p>
							</article>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
