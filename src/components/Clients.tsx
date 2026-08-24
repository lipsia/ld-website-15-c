import { CLIENTS } from '../content/site';
import { Marquee } from './ui/Marquee';
import { Reveal } from './ui/Reveal';

export function Clients() {
  return (
    <section id="clients" aria-labelledby="clients-heading">
      <div className="container">
        <Reveal className="clients__head">
          <span className="eyebrow">{CLIENTS.eyebrow}</span>
          <h2 id="clients-heading">{CLIENTS.title}</h2>
        </Reveal>

        <Marquee items={CLIENTS.marks} />
      </div>
    </section>
  );
}
