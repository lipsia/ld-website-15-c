import { LD_PATH, LD_VIEWBOX } from "./ldPath";

/**
 * The LD monogram as inline SVG.
 *
 * Inlined rather than loaded from `/assets/ld-logo.svg` for two reasons: the source
 * file is filled with the brand indigo, which is all but invisible on our near-black
 * ground, and an `<img>` cannot be recoloured from CSS. `fill="currentColor"` lets the
 * cascade own the colour, so the mark inherits hover and focus states for free.
 *
 * Decorative by default — whatever wraps this is responsible for the accessible name.
 */
export function LdMark({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox={`0 0 ${LD_VIEWBOX} ${LD_VIEWBOX}`}
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d={LD_PATH} />
		</svg>
	);
}
