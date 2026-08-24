import { COMPETENCES } from "#/content/site";
import { Reveal } from "./ui/Reveal";

export function Competence() {
	return (
		<section id="competence" aria-labelledby="competence-heading">
			<div className="container">
				<Reveal className="section-head">
					<h2 id="competence-heading">{COMPETENCES.title}</h2>
				</Reveal>

				<div className="card-grid">
					{COMPETENCES.items.map((item, index) => (
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
