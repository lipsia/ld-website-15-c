import { useEffect, useState } from "react";

/**
 * False on the server and on the client's FIRST render, true from the first effect on.
 *
 * The prerenderer renders with no `window`, so `getRenderPolicy()` returns its
 * no-WebGL fallback and the static mark is baked into the HTML. If the client then
 * computed the real policy during its first render it would produce a `<canvas>` where
 * the server produced a fallback, and React would discard the prerendered markup with a
 * hydration mismatch — the exact opposite of what prerendering is for.
 *
 * Gating on this makes the first client render identical to the server's, and moves the
 * capability detection into an effect. It also means WebGL start-up never blocks
 * hydration.
 */
export function useMounted(): boolean {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted;
}
