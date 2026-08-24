import {
	Bloom,
	ChromaticAberration,
	EffectComposer,
	Noise,
	Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

const CHROMATIC_ABERRATION_OFFSET: [number, number] = [0.0006, 0.0006];

/**
 * Postprocessing chain. Kept deliberately short — every pass here is a
 * full-screen shader that runs on mobile GPUs, so the budget is: one bloom
 * (mipmap-based, cheap relative to a blur pyramid), two near-free color-grade
 * passes (chromatic aberration, vignette), and noise dithering to kill
 * gradient banding. multisampling={0} because nothing here has hard
 * geometric edges that benefit from MSAA — it would only cost bandwidth.
 */
export function Effects({ enabled }: { enabled: boolean }) {
	if (!enabled) return null;

	return (
		<EffectComposer multisampling={0}>
			<Bloom luminanceThreshold={0.62} luminanceSmoothing={0.12} intensity={0.5} mipmapBlur />
			<ChromaticAberration
				offset={CHROMATIC_ABERRATION_OFFSET}
				blendFunction={BlendFunction.NORMAL}
			/>
			<Vignette darkness={0.55} offset={0.3} />
			<Noise opacity={0.02} premultiply blendFunction={BlendFunction.NORMAL} />
		</EffectComposer>
	);
}
