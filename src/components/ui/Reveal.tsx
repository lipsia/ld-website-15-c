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
