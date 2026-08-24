import type { ClientMark } from "#/types";

interface MarqueeProps {
	items: readonly ClientMark[];
	speed?: number;
}

/**
 * Infinite horizontal scroll of client name pills. The DOM list is
 * duplicated once and translated -50% via CSS animation for a seamless
 * loop; the duplicate copy is aria-hidden so screen readers see one list.
 * Reduced motion swaps the animation for native horizontal overflow scroll.
 */
export function Marquee({ items, speed = 40 }: MarqueeProps) {
	const durationSeconds = items.length / (speed / 10);

	return (
		<div className="marquee">
			<div className="marquee__track" style={{ animationDuration: `${durationSeconds}s` }}>
				<ul className="marquee__group" aria-label="Clients">
					{items.map((mark) => (
						<li key={mark.id} className="marquee__item">
							{mark.name}
						</li>
					))}
				</ul>
				<ul className="marquee__group" aria-hidden="true">
					{items.map((mark) => (
						<li key={`dup-${mark.id}`} className="marquee__item">
							{mark.name}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
