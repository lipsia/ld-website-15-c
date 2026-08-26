import { getTech } from "#/content/site";
import { Counter } from "./ui/Counter";
import { Reveal } from "./ui/Reveal";

export function Tech() {
	const tech = getTech();

	return (
		<section id="technologies" aria-labelledby="tech-heading">
			<div className="container">
				<Reveal className="tech__copy glass">
					<h2 id="tech-heading">{tech.title}</h2>
					<p>{tech.lead}</p>
					<p>{tech.body}</p>
					<p>{tech.closing}</p>
				</Reveal>

				<div className="tech__stats">
					{tech.stats.map((stat, index) => (
						<Reveal key={stat.id} delay={index * 0.08}>
							<div className="tech__stat glass">
								<span className="tech__stat-value">
									<Counter value={stat.value} suffix={stat.suffix} />
								</span>
								<span className="tech__stat-label">{stat.label}</span>
							</div>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
