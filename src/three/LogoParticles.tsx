/**
 * The hero object: the LD logo as ~48k GPU particles plus the solid mark beneath.
 *
 * Two layers, deliberately:
 *   - the particle cloud carries all the motion and does the assembling;
 *   - the extruded solid fades in only once the cloud has crystallised, which gives
 *     the mark real weight and reflections at the moment it resolves.
 *
 * Everything animates from a single `uScroll` uniform. There is no per-particle CPU
 * work, no state, and no re-render tied to scroll.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { scrollStore, subProgress } from "#/scroll/scrollStore";
import {
	fibonacciSphere,
	type LogoGeometry,
	loadLogoGeometry,
	seedAttribute,
} from "./logoGeometry";
import { PALETTE, toVec3 } from "./palette";
import { logoFragmentShader, logoVertexShader } from "./shaders/logoShader";
import { getUniform, setUniform } from "./uniforms";

const LOGO_URL = "/assets/ld-logo.svg";

/** Radius of the dispersed start state. Large enough to read as a nebula, not a ball. */
const NEBULA_RADIUS = 7.5;

interface LogoParticlesProps {
	/** Particle budget from the device render policy. */
	count: number;
	/** Freeze time-based motion and hold the mark assembled. */
	reducedMotion: boolean;
}

export function LogoParticles({ count, reducedMotion }: LogoParticlesProps) {
	const [logo, setLogo] = useState<LogoGeometry | null>(null);
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const solidRef = useRef<THREE.Mesh>(null);
	const solidMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
	const groupRef = useRef<THREE.Group>(null);
	const { viewport } = useThree();

	// Parse + sample off the render path. An aborted flag guards the StrictMode
	// double-mount and any unmount that lands mid-parse.
	useEffect(() => {
		let aborted = false;
		let built: LogoGeometry | null = null;

		loadLogoGeometry(LOGO_URL, Math.max(count, 1))
			.then((result) => {
				if (aborted) {
					result.solid.dispose();
					return;
				}
				built = result;
				setLogo(result);
			})
			.catch((error: unknown) => {
				// A malformed logo must not take the page down; the DOM hero still reads fine.
				console.error("LogoParticles: could not build logo geometry", error);
			});

		return () => {
			aborted = true;
			built?.solid.dispose();
		};
	}, [count]);

	const geometry = useMemo(() => {
		if (!logo) return null;

		const buffer = new THREE.BufferGeometry();
		buffer.setAttribute(
			"position",
			new THREE.BufferAttribute(fibonacciSphere(logo.count, NEBULA_RADIUS), 3),
		);
		buffer.setAttribute("aTarget", new THREE.BufferAttribute(logo.targets, 3));
		buffer.setAttribute("aNormal", new THREE.BufferAttribute(logo.normals, 3));
		buffer.setAttribute("aSeed", new THREE.BufferAttribute(seedAttribute(logo.count), 1));
		// The cloud expands far past its rest bounds during dispersal; a hand-set sphere
		// stops three.js frustum-culling the whole system the moment it flies wide.
		buffer.boundingSphere = new THREE.Sphere(new THREE.Vector3(), NEBULA_RADIUS * 4);
		return buffer;
	}, [logo]);

	const uniforms = useMemo(
		() => ({
			uScroll: { value: reducedMotion ? 0.5 : 0 },
			uTime: { value: 0 },
			uSize: { value: 30 },
			uPixelRatio: { value: 1 },
			uSplit: { value: reducedMotion ? 0 : 1 },
			uColorCold: { value: new THREE.Vector3(...toVec3(PALETTE.violet)) },
			uColorWarm: { value: new THREE.Vector3(...toVec3(PALETTE.mint)) },
			uColorAccent: { value: new THREE.Vector3(...toVec3(PALETTE.coral)) },
			uOpacity: { value: 0.6 },
		}),
		[reducedMotion],
	);

	// Dispose GPU buffers explicitly. R3F disposes what it created, but this geometry
	// is built imperatively so it is ours to release.
	useEffect(() => {
		return () => {
			geometry?.dispose();
		};
	}, [geometry]);

	useFrame((state, delta) => {
		const material = materialRef.current;
		if (!material) return;

		const progress = reducedMotion ? 0.5 : scrollStore.get();

		// Written through the material, never through the local `uniforms` object —
		// ShaderMaterial clones what it is given, so local mutation never reaches the
		// GPU. See src/three/uniforms.ts.
		const current = getUniform(material, "uScroll");
		// Damping here absorbs the jump when a user lands mid-page on a deep link.
		const eased = THREE.MathUtils.damp(current, progress, 6, delta);
		setUniform(material, "uScroll", eased);

		if (!reducedMotion) {
			setUniform(material, "uTime", getUniform(material, "uTime") + delta);
		}
		setUniform(material, "uPixelRatio", Math.min(state.gl.getPixelRatio(), 2));
		// Narrow viewports need bigger points or the mark dissolves into noise.
		setUniform(material, "uSize", viewport.width < 6 ? 38 : 30);

		// The solid only exists in the crystallised window — invisible before the cloud
		// lands, gone again once it starts dispersing.
		const solidMaterial = solidMaterialRef.current;
		if (solidMaterial) {
			const fadeIn = subProgress(eased, 0.34, 0.48);
			const fadeOut = 1 - subProgress(eased, 0.72, 0.86);
			solidMaterial.opacity = fadeIn * fadeOut * 0.3;
			solidMaterial.visible = solidMaterial.opacity > 0.01;
		}

		// Push the mark off dead-centre so the left-aligned reading column stays clear.
		// Narrow viewports have no free horizontal space, so they keep it centred and
		// rely on the content's own glass panels for separation instead.
		const group = groupRef.current;
		if (group) {
			group.position.x = viewport.width < 6 ? 0 : Math.min(viewport.width * 0.16, 1.5);
		}
		if (group && !reducedMotion) {
			group.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.22 + eased * Math.PI * 0.35;
			group.rotation.x = Math.sin(state.clock.elapsedTime * 0.06) * 0.06;
		}
	});

	if (!geometry || !logo || count <= 0) return null;

	return (
		<group ref={groupRef}>
			<points frustumCulled={false} renderOrder={2}>
				<primitive object={geometry} attach="geometry" />
				<shaderMaterial
					ref={materialRef}
					uniforms={uniforms}
					vertexShader={logoVertexShader}
					fragmentShader={logoFragmentShader}
					transparent
					depthWrite={false}
					blending={THREE.AdditiveBlending}
				/>
			</points>

			<mesh ref={solidRef} geometry={logo.solid} renderOrder={1}>
				<meshPhysicalMaterial
					ref={solidMaterialRef}
					depthWrite={false}
					color={PALETTE.indigo}
					roughness={0.12}
					metalness={0.8}
					clearcoat={1}
					clearcoatRoughness={0.12}
					iridescence={0.85}
					iridescenceIOR={1.4}
					transparent
					opacity={0}
					envMapIntensity={1.1}
				/>
			</mesh>
		</group>
	);
}
