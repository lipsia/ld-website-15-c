import { getHero, HERO_WORDMARK, SITE } from "#/content/site";
import { PixelWordmark } from "./ui/PixelWordmark";
import { Reveal } from "./ui/Reveal";

/**
 * The hero is the wordmark and almost nothing else: the brand name at full width as a
 * pixel mosaic, then the tagline and the three disciplines set small underneath.
 *
 * The `h1` carries the brand name as real text and the canvas is decorative, so the
 * page's most important heading is machine-readable even though it is drawn.
 */
export function Hero() {
	const hero = getHero();

	return (
		<section id="hero" className="hero" aria-labelledby="hero-heading">
			<div className="container hero__inner">
				<h1 id="hero-heading" className="hero__wordmark-heading">
					<span className="sr-only">{SITE.name}</span>
					<PixelWordmark lines={HERO_WORDMARK} />
				</h1>

				<Reveal delay={0.15} className="hero__meta">
					<p className="hero__tagline">{hero.headline}</p>

					<ul className="hero__disciplines">
						{hero.disciplines.map((discipline) => (
							<li key={discipline}>{discipline}</li>
						))}
					</ul>
				</Reveal>
			</div>

			<div className="hero__cue" aria-hidden="true">
				<span className="hero__cue-line" />
			</div>
		</section>
	);
}
