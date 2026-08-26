import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
	children: ReactNode;
	delay?: number;
	y?: number;
	className?: string;
}

/**
 * Fade+rise on scroll into view, once. Framer Motion already dampens
 * transforms under prefers-reduced-motion, but we also zero the offset
 * explicitly so reduced-motion users get a plain fade, never a slide.
 */
export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
	const reduceMotion = useReducedMotion();
	const offset = reduceMotion ? 0 : y;

	return (
		<motion.div
			// Marks the element whose hidden initial state is baked into the prerendered
			// HTML, so global.css can force it visible where scripting is unavailable.
			// Without that override the build ships headings at opacity 0 that nothing
			// will ever animate in. See global.css `@media (scripting: none)`.
			data-reveal=""
			{...(className !== undefined ? { className } : {})}
			initial={{ opacity: 0, y: offset }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-12% 0px" }}
			transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
		>
			{children}
		</motion.div>
	);
}
