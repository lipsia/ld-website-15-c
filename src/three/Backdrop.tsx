import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { scrollStore } from "#/scroll/scrollStore";
import { PALETTE, toVec3 } from "./palette";

const RADIUS = 60;

const SURFACE = toVec3(PALETTE.surface);
const INDIGO = toVec3(PALETTE.indigo);
const VIOLET = toVec3(PALETTE.violet);

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vViewDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewDirection = normalize(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uSurface;
  uniform vec3 uIndigo;
  uniform vec3 uViolet;

  varying vec3 vViewDirection;

  // Cheap hash noise — just enough amplitude to break up 8-bit banding on the
  // gradient without costing a texture lookup.
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vViewDirection);

    // Hue shifts from indigo to violet as scroll advances, glow intensifies
    // toward the center of the view.
    float centerGlow = pow(max(dir.z * -0.5 + 0.5, 0.0), 5.0);
    vec3 gradientColor = mix(uIndigo, uViolet, uScroll);
    // The glow builds through the first half, then falls away entirely as the camera
    // passes through the split mark. Everything after that — clients, CTA, footer —
    // plays out against the flat near-black ground rather than a purple wash.
    float settle = 1.0 - smoothstep(0.64, 0.82, uScroll);
    float glowIntensity = (0.08 + uScroll * 0.09) * settle;

    vec3 color = mix(uSurface, gradientColor, centerGlow * glowIntensity);

    float grain = (hash(dir * 512.0 + uTime * 0.01) - 0.5) * 0.006;
    color += grain;

    gl_FragColor = vec4(color, 1.0);

    #include <colorspace_fragment>
  }
`;

/**
 * Inward-facing sphere behind the whole scene, providing an animated gradient
 * that shifts hue with scroll. Drawn first (low renderOrder, depthWrite off)
 * so nothing needs to depth-test against it.
 */
export function Backdrop() {
	const elapsed = useRef(0);

	const geometry = useMemo(() => new THREE.SphereGeometry(RADIUS, 32, 32), []);
	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: VERTEX_SHADER,
				fragmentShader: FRAGMENT_SHADER,
				uniforms: {
					uTime: { value: 0 },
					uScroll: { value: 0 },
					uSurface: { value: new THREE.Vector3(...SURFACE) },
					uIndigo: { value: new THREE.Vector3(...INDIGO) },
					uViolet: { value: new THREE.Vector3(...VIOLET) },
				},
				side: THREE.BackSide,
				depthWrite: false,
			}),
		[],
	);

	useEffect(() => {
		return () => {
			geometry.dispose();
			material.dispose();
		};
	}, [geometry, material]);

	useFrame((_state, delta) => {
		elapsed.current += delta;
		const timeUniform = material.uniforms.uTime;
		const scrollUniform = material.uniforms.uScroll;
		if (timeUniform) timeUniform.value = elapsed.current;
		if (scrollUniform) scrollUniform.value = scrollStore.get();
	});

	return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}
