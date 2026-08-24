import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { scrollStore } from "#/scroll/scrollStore";
import { PALETTE, toVec3 } from "./palette";
import { setUniform } from "./uniforms";

const INNER_RADIUS = 6;
const OUTER_RADIUS = 22;

const INDIGO = toVec3(PALETTE.indigo);
const VIOLET = toVec3(PALETTE.violet);

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uPixelRatio;

  attribute float aSeed;
  attribute float aSize;

  varying float vSeed;

  void main() {
    vSeed = aSeed;

    vec3 pos = position;

    // Gentle sinusoidal drift, phase-offset per particle via aSeed.
    float phase = aSeed * 6.2831853;
    pos.x += sin(uTime * 0.15 + phase) * 0.35;
    pos.y += cos(uTime * 0.12 + phase * 1.3) * 0.35;
    pos.z += sin(uTime * 0.1 + phase * 0.7) * 0.35;

    // Slow outward push as the user scrolls, so the field breathes with the story.
    vec3 dir = normalize(position);
    pos += dir * uScroll * 2.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // True perspective sizing: points shrink with distance. Clamped so
    // near-camera particles never balloon into bokeh-like discs.
    gl_PointSize = clamp(aSize * uPixelRatio * (1.0 / -mvPosition.z) * 22.0, 0.5, 6.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying float vSeed;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered);
    float alpha = smoothstep(0.5, 0.0, dist) * 0.18;

    vec3 color = mix(uColorA, uColorB, vSeed);
    gl_FragColor = vec4(color, alpha);

    #include <colorspace_fragment>
  }
`;

interface FieldGeometryData {
	geometry: THREE.BufferGeometry;
	material: THREE.ShaderMaterial;
}

function createField(count: number, pixelRatio: number): FieldGeometryData {
	const positions = new Float32Array(count * 3);
	const seeds = new Float32Array(count);
	const sizes = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		// Distribute uniformly by volume within the hollow shell, not just by radius,
		// so density doesn't clump near the inner boundary.
		const radius = Math.cbrt(
			Math.random() * (OUTER_RADIUS ** 3 - INNER_RADIUS ** 3) + INNER_RADIUS ** 3,
		);
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(THREE.MathUtils.randFloatSpread(2) / 2 + 0.5);

		const i3 = i * 3;
		positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
		positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
		positions[i3 + 2] = radius * Math.cos(phi);

		seeds[i] = Math.random();
		sizes[i] = THREE.MathUtils.randFloat(0.6, 1.6);
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
	geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

	const uniforms = {
		uTime: { value: 0 },
		uScroll: { value: 0 },
		uPixelRatio: { value: pixelRatio },
		uColorA: { value: new THREE.Vector3(...INDIGO) },
		uColorB: { value: new THREE.Vector3(...VIOLET) },
	};

	const material = new THREE.ShaderMaterial({
		vertexShader: VERTEX_SHADER,
		fragmentShader: FRAGMENT_SHADER,
		uniforms,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

	return { geometry, material };
}

/**
 * Ambient dust field surrounding the hero logo — the depth layer the camera
 * flies through. Dimmed by design (peak alpha 0.18) so it never competes
 * with the lead's logo particle system.
 */
export function ParticleField({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
	const pixelRatio = useThree((state) => state.gl.getPixelRatio());
	const elapsed = useRef(0);

	const { geometry, material } = useMemo(() => createField(count, pixelRatio), [count, pixelRatio]);

	// StrictMode double-mounts in dev; dispose on every unmount so we never
	// leak the previous mount's GPU buffers.
	useEffect(() => {
		return () => {
			geometry.dispose();
			material.dispose();
		};
	}, [geometry, material]);

	useFrame((_state, delta) => {
		if (!reducedMotion) {
			elapsed.current += delta;
			setUniform(material, "uTime", elapsed.current);
		}
		setUniform(material, "uScroll", scrollStore.get());
	});

	if (count <= 0) return null;

	return <points geometry={geometry} material={material} frustumCulled={false} />;
}
