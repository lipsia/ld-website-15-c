import { HERO } from '../content/site';
import { Reveal } from './ui/Reveal';

function isFutureLink(href: string): boolean {
  return href === '#';
}

export function Hero() {
  return (
    <section id="hero" className="hero" aria-labelledby="hero-heading">
      <div className="container hero__inner">
        <Reveal>
          <h1 id="hero-heading">{HERO.headline}</h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="hero__subhead">{HERO.subheadline}</p>
        </Reveal>

        <Reveal delay={0.2}>
          <ul className="hero__disciplines">
            {HERO.disciplines.map((discipline) => (
              <li key={discipline}>{discipline}</li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="hero__ctas">
            <a className="btn btn--primary" href={HERO.ctaPrimary.href}>
              {HERO.ctaPrimary.label}
            </a>
            <a
              className="btn btn--ghost"
              href={HERO.ctaSecondary.href}
              {...(isFutureLink(HERO.ctaSecondary.href)
                ? { 'aria-disabled': true, 'data-pending': true }
                : {})}
            >
              {HERO.ctaSecondary.label}
            </a>
          </div>
        </Reveal>
      </div>

      <div className="hero__cue" aria-hidden="true">
        ↓
      </div>
    </section>
  );
}
