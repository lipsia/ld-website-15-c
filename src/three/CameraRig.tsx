import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { scrollStore, subProgress } from "#/scroll/scrollStore";

/** Scripted dolly keyframes: [progress, cameraZ]. Kept at module scope — never re-allocated. */
const DOLLY_KEYFRAMES: ReadonlyArray<readonly [number, number]> = [
	[0, 9],
	[0.18, 9],
	[0.4, 4.2],
	[0.62, 4.2],
	[0.85, -2.5],
	[1, 7],
];

const DISSECTION_START = 0.62;
const DISSECTION_END = 0.85;

// Reused scratch objects: useFrame runs 60x/sec, allocating Vector3/etc. per
// frame would pressure GC and cause jank. These are module-scoped singletons.
const lookTarget = new THREE.Vector3();
const dissectedLookTarget = new THREE.Vector3(0, 0.15, -0.4);
const neutralLookTarget = new THREE.Vector3(0, 0, 0);

function dollyZAt(progress: number): number {
	for (let i = 0; i < DOLLY_KEYFRAMES.length - 1; i++) {
		const current = DOLLY_KEYFRAMES[i];
		const next = DOLLY_KEYFRAMES[i + 1];
		if (!current || !next) continue;
		const [startP, startZ] = current;
		const [endP, endZ] = next;
		if (progress >= startP && progress <= endP) {
			const t = subProgress(progress, startP, endP);
			return THREE.MathUtils.lerp(startZ, endZ, t);
		}
	}
	const last = DOLLY_KEYFRAMES[DOLLY_KEYFRAMES.length - 1];
	return last ? last[1] : 9;
}

/**
 * Scripts the camera along the five-stage scroll timeline: dolly in through
 * convergence/crystallised, push through the logo during dissection, pull
 * back for dispersal. Reads scrollStore directly (not the hook) so this
 * component never re-renders — it only ever runs inside useFrame.
 */
export function CameraRig({ parallax = true }: { parallax?: boolean }) {
	const parallaxX = useRef(0);
	const parallaxY = useRef(0);

	useFrame((state, delta) => {
		const progress = scrollStore.get();
		const targetZ = dollyZAt(progress);
		const camera = state.camera;

		camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, delta);

		if (parallax) {
			const targetX = state.pointer.x * 0.35;
			const targetY = state.pointer.y * 0.35;
			parallaxX.current = THREE.MathUtils.damp(parallaxX.current, targetX, 4, delta);
			parallaxY.current = THREE.MathUtils.damp(parallaxY.current, targetY, 4, delta);
		} else {
			parallaxX.current = THREE.MathUtils.damp(parallaxX.current, 0, 4, delta);
			parallaxY.current = THREE.MathUtils.damp(parallaxY.current, 0, 4, delta);
		}

		camera.position.x = THREE.MathUtils.damp(camera.position.x, parallaxX.current, 6, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, parallaxY.current, 6, delta);

		const dissectionProgress = subProgress(progress, DISSECTION_START, DISSECTION_END);
		lookTarget.lerpVectors(neutralLookTarget, dissectedLookTarget, dissectionProgress);
		camera.lookAt(lookTarget);
	});

	return null;
}
