import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ClientMark } from "#/types";
import { PALETTE } from "./palette";
import type { PolyFace } from "./polyhedron";
import { buildEdges, buildPolyhedron, fibonacciDirections, relaxDirections } from "./polyhedron";

/**
 * A twenty-sided die carrying the client logos: drag to spin it, click to burst the
 * logos out into a readable cloud.
 *
 * This gets its own `<Canvas>` rather than joining the page-wide background scene,
 * because it is the one piece of 3D on the page that must receive pointer events —
 * the background canvas is deliberately `pointer-events: none` and sits behind all
 * content. Two WebGL contexts is a cheap price for that separation.
 */

/** Distance from the centre to each face plane, in world units. */
const RADIUS = 1.55;
/**
 * Logo square edge, as a multiple of the face's inradius.
 *
 * A value of 1.3 kept the square's corners inside the inscribed circle, but that wasted
 * a third of every face: the textures already reserve ~12% padding of their own, and the
 * marks are wide and short, so their corners are empty anyway. 1.8 lets the square
 * overhang the circle while the visible ink still lands inside the face.
 */
const TILE_FIT = 1.8;
/**
 * Radius of the burst-open layout, as a multiple of RADIUS. Tied to TILE_FIT: enlarging
 * the tiles without widening the layout by the same factor makes the logos collide.
 */
const SPREAD_RADIUS = 1.32;

const BODY_OPACITY = 0.3;
const DRAG_SENSITIVITY = 0.0085;
/** Per-frame retention of drag momentum after release. */
const SPIN_FRICTION = 0.94;
/** Idle drift so the die never looks frozen. */
const IDLE_SPIN = 0.0022;

/** Mutable pointer state, shared from the DOM handlers into the render loop. */
export interface DiceControls {
	dragging: boolean;
	/** Unconsumed pointer delta in px, drained each frame. */
	dx: number;
	dy: number;
	/** Angular momentum retained after release. */
	spinX: number;
	spinY: number;
	/** 0 = closed die, 1 = fully burst open. */
	spreadTarget: number;
}

export function createDiceControls(): DiceControls {
	return { dragging: false, dx: 0, dy: 0, spinX: 0, spinY: 0, spreadTarget: 0 };
}

/**
 * Phyllotaxis (sunflower) disc in the XY plane — the burst-open layout.
 *
 * Deliberately flat rather than a sphere. Since every tile turns to face the camera
 * when open, a spherical cloud buys no depth and actively hurts: two logos far apart
 * in 3D can land on top of each other once projected to the screen, which is exactly
 * how DKMS ended up sitting on Commerzbank. Distributing in the viewing plane makes
 * even spacing a property of the layout instead of a matter of luck.
 *
 * `sqrt(i/n)` keeps the areal density uniform; a linear radius would crowd the centre.
 */
function spreadTargets(count: number, radius: number): THREE.Vector3[] {
	const goldenAngle = Math.PI * (3 - Math.sqrt(5));
	const out: THREE.Vector3[] = [];
	for (let i = 0; i < count; i++) {
		const r = Math.sqrt((i + 0.5) / count) * radius;
		const theta = i * goldenAngle;
		// A little z jitter so the cloud still has some body as it flies apart.
		out.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, (i % 3) * 0.12));
	}
	return out;
}

interface DiceProps {
	marks: readonly ClientMark[];
	/** Pre-resolved, one per mark. Loaded outside the Canvas — see ClientDice. */
	logos: THREE.Texture[];
	controls: DiceControls;
	reducedMotion: boolean;
}

// Hoisted scratch objects — allocating inside useFrame would churn the heap 60x/second.
const scratchQuat = new THREE.Quaternion();
const scratchAxis = new THREE.Vector3();
const scratchTarget = new THREE.Quaternion();
const scratchInverse = new THREE.Quaternion();
const scratchPos = new THREE.Vector3();
const IDENTITY = new THREE.Quaternion();

function Dice({ marks, logos, controls, reducedMotion }: DiceProps) {
	const groupRef = useRef<THREE.Group>(null);
	const tileRefs = useRef<(THREE.Mesh | null)[]>([]);
	const bodyRef = useRef<THREE.MeshPhysicalMaterial>(null);
	const edgeRef = useRef<THREE.LineBasicMaterial>(null);
	const spread = useRef(0);
	const { camera } = useThree();

	// One face per client: the solid is derived from the roster length, so the die is a
	// d15 for fifteen clients and re-derives itself if that number ever changes.
	const { faces, geometry } = useMemo(
		() => buildPolyhedron(relaxDirections(fibonacciDirections(marks.length)), RADIUS),
		[marks.length],
	);
	const edges = useMemo(() => buildEdges(faces), [faces]);

	// A plane's default normal is +Z, so each tile needs the rotation that takes +Z onto
	// its face normal. Derived once per face rather than per frame.
	//
	// One size for every tile, taken from the SMALLEST face: a derived solid has faces
	// of slightly different areas, and scaling each logo to its own face would render
	// some clients larger than others. On a client wall that reads as a ranking, so the
	// tightest face sets the size and every logo matches.
	const frames = useMemo(() => {
		const smallest = faces.reduce(
			(min: number, face: PolyFace) => Math.min(min, face.inradius),
			Number.POSITIVE_INFINITY,
		);
		const size = Number.isFinite(smallest) ? smallest * TILE_FIT : 0.5;

		const xAxis = new THREE.Vector3();
		const yAxis = new THREE.Vector3();
		const reference = new THREE.Vector3();
		const basis = new THREE.Matrix4();

		return faces.map((face: PolyFace) => {
			// A full orientation, not just an alignment. `setFromUnitVectors` only
			// guarantees that +Z lands on the face normal and leaves the roll about that
			// axis arbitrary — which is why logos sat at random angles, some of them
			// upside down. Building an explicit basis pins the roll so every wordmark
			// stands upright with respect to world up.
			reference.set(0, 1, 0);
			// Near the poles world up is parallel to the normal and the cross product
			// collapses, so fall back to a different reference there.
			if (Math.abs(face.normal.y) > 0.95) reference.set(0, 0, 1);

			xAxis.crossVectors(reference, face.normal).normalize();
			yAxis.crossVectors(face.normal, xAxis).normalize();
			basis.makeBasis(xAxis, yAxis, face.normal);

			return { quaternion: new THREE.Quaternion().setFromRotationMatrix(basis), size };
		});
	}, [faces]);

	useEffect(() => {
		return () => {
			geometry.dispose();
			edges.dispose();
		};
	}, [geometry, edges]);

	const targets = useMemo(
		() => spreadTargets(marks.length, RADIUS * SPREAD_RADIUS),
		[marks.length],
	);

	useFrame((state, delta) => {
		const group = groupRef.current;
		if (!group) return;

		// Stretch the layout to the canvas: a 2:1 container should spread wide, a square
		// one should not, or the outermost logos leave the frame.
		const spreadX = THREE.MathUtils.clamp(state.viewport.aspect, 1, 1.9);

		// --- orientation
		if (controls.dragging || controls.dx !== 0 || controls.dy !== 0) {
			const { dx, dy } = controls;
			const magnitude = Math.hypot(dx, dy);
			if (magnitude > 0) {
				// Trackball: rotate about the screen-space axis perpendicular to the drag.
				// Premultiplying applies it in camera space, so the die follows the cursor
				// regardless of how it is already turned — Euler angles would gimbal-lock.
				scratchAxis.set(dy, dx, 0).normalize();
				scratchQuat.setFromAxisAngle(scratchAxis, magnitude * DRAG_SENSITIVITY);
				group.quaternion.premultiply(scratchQuat);
				controls.spinX = dy * DRAG_SENSITIVITY;
				controls.spinY = dx * DRAG_SENSITIVITY;
			}
			controls.dx = 0;
			controls.dy = 0;
		} else if (!reducedMotion) {
			// Momentum, decaying to a slow idle drift.
			controls.spinX *= SPIN_FRICTION;
			controls.spinY *= SPIN_FRICTION;
			const idle = IDLE_SPIN * (1 - Math.min(1, spread.current));
			const magnitude = Math.hypot(controls.spinX, controls.spinY);
			if (magnitude > 1e-5) {
				scratchAxis.set(controls.spinX, controls.spinY, 0).normalize();
				scratchQuat.setFromAxisAngle(scratchAxis, magnitude);
				group.quaternion.premultiply(scratchQuat);
			}
			if (idle > 0) {
				scratchQuat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, idle);
				group.quaternion.premultiply(scratchQuat);
			}
		}

		// --- burst open / collect
		spread.current = THREE.MathUtils.damp(
			spread.current,
			controls.spreadTarget,
			reducedMotion ? 30 : 4.5,
			delta,
		);
		const p = spread.current;

		if (p > 0.02) {
			group.quaternion.slerp(IDENTITY, Math.min(1, p * 0.14));
		}

		// The die itself has no business being visible once the logos have left it — the
		// shell and its wireframe would just sit behind the cloud as clutter.
		const shell = 1 - p;
		if (bodyRef.current) bodyRef.current.opacity = BODY_OPACITY * shell;
		if (edgeRef.current) edgeRef.current.opacity = 0.4 * shell;

		// Facing the camera has to be expressed in the group's local frame, since the
		// tiles are its children and it is itself rotating.
		scratchInverse.copy(group.quaternion).invert();

		for (let i = 0; i < marks.length; i++) {
			const tile = tileRefs.current[i];
			const face = faces[i];
			const frame = frames[i];
			const target = targets[i];
			if (!tile || !face || !frame || !target) continue;

			// Ease the outward flight so logos decelerate into place rather than stopping dead.
			const eased = p * p * (3 - 2 * p);
			scratchPos.set(target.x * spreadX, target.y, target.z);
			tile.position.copy(face.centre).lerp(scratchPos, eased);

			scratchTarget.copy(scratchInverse).multiply(camera.quaternion);
			tile.quaternion.copy(frame.quaternion).slerp(scratchTarget, eased);

			// Grow a little on the way out — the cloud sits further from the camera, so a
			// constant scale would read as the logos shrinking. Kept modest now that the
			// face tiles are already large, or the outer ring clips the canvas.
			const scale = 1 + eased * 0.12;
			tile.scale.setScalar(scale);
		}
	});

	return (
		<group ref={groupRef}>
			<mesh geometry={geometry} renderOrder={0}>
				<meshPhysicalMaterial
					ref={bodyRef}
					color={PALETTE.indigo}
					roughness={0.12}
					metalness={0.65}
					clearcoat={1}
					transparent
					opacity={BODY_OPACITY}
					depthWrite={false}
					side={THREE.DoubleSide}
				/>
			</mesh>

			<lineSegments geometry={edges} renderOrder={1}>
				<lineBasicMaterial ref={edgeRef} color={PALETTE.accent} transparent opacity={0.4} />
			</lineSegments>

			{marks.map((mark, index) => {
				const face = faces[index];
				const frame = frames[index];
				const texture = logos[index];
				if (!face || !frame || !texture) return null;
				return (
					<mesh
						key={mark.id}
						ref={(node) => {
							tileRefs.current[index] = node;
						}}
						// Lifted a hair off the facet so it never z-fights the body.
						position={face.centre.clone().multiplyScalar(1.01)}
						quaternion={frame.quaternion}
						renderOrder={2}
					>
						<planeGeometry args={[frame.size, frame.size]} />
						{/* Basic, not standard: these are emissive-looking marks, not lit
						    surfaces, and toneMapped={false} keeps the white from going grey. */}
						<meshBasicMaterial
							map={texture}
							transparent
							toneMapped={false}
							side={THREE.FrontSide}
							depthWrite={false}
						/>
					</mesh>
				);
			})}
		</group>
	);
}

/**
 * Loads the logo textures with a plain `TextureLoader`, deliberately NOT with drei's
 * `useTexture`.
 *
 * `useTexture` suspends, and it can only be called inside the Canvas because it reads
 * the R3F store. Suspending inside the Canvas makes React unmount and remount that
 * subtree — and under StrictMode's intentional double-mount, R3F disposed the renderer
 * while the remount reused a canvas element whose WebGL context was already gone. The
 * symptom was a dead white rectangle, in dev only, which is why the production build
 * looked fine. Resolving the textures into state before the Canvas is rendered means
 * nothing in the tree ever suspends.
 */
function useLogoTextures(marks: readonly ClientMark[]): THREE.Texture[] | null {
	const [textures, setTextures] = useState<THREE.Texture[] | null>(null);
	const key = marks.map((mark) => mark.logo).join("|");

	useEffect(() => {
		let cancelled = false;
		const loader = new THREE.TextureLoader();
		const urls = key.split("|").filter(Boolean);

		Promise.all(urls.map((url) => loader.loadAsync(url)))
			.then((loaded) => {
				if (cancelled) {
					// Lost the race with an unmount — release the GPU memory rather than
					// leaking a set of textures nothing will ever draw.
					for (const texture of loaded) texture.dispose();
					return;
				}
				for (const texture of loaded) {
					texture.colorSpace = THREE.SRGBColorSpace;
					// The tiles are small and steeply angled at the die's silhouette, where
					// trilinear filtering alone turns fine wordmarks to mush.
					texture.anisotropy = 8;
				}
				setTextures(loaded);
			})
			.catch((error: unknown) => {
				// Let the caller fall back to the flat roster instead of showing an empty die.
				console.error("ClientDice: could not load client logos", error);
			});

		return () => {
			cancelled = true;
		};
	}, [key]);

	return textures;
}

interface ClientDiceProps {
	marks: readonly ClientMark[];
	controls: DiceControls;
	reducedMotion: boolean;
	dpr: [number, number];
}

export function ClientDice({ marks, controls, reducedMotion, dpr }: ClientDiceProps) {
	// Guard against a roster longer than the die has faces; 20 is the hard ceiling.
	const shown = useMemo(() => marks.slice(0, 20), [marks]);

	const logos = useLogoTextures(shown);

	const onCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
		gl.setClearAlpha(0);
		// Without preventDefault the browser will not attempt to restore a lost
		// context, and the canvas stays blank for good.
		gl.domElement.addEventListener(
			"webglcontextlost",
			(event) => {
				event.preventDefault();
			},
			false,
		);
	}, []);

	// The container reserves its height in CSS, so returning null here costs no layout
	// shift — it just leaves the well briefly empty while local PNGs decode.
	if (!logos) return null;

	return (
		<Canvas
			dpr={dpr}
			camera={{ position: [0, 0, 6.2], fov: 42 }}
			gl={{ antialias: true, alpha: true }}
			onCreated={onCreated}
		>
			<ambientLight intensity={0.6} />
			<directionalLight position={[4, 5, 6]} intensity={1.4} color={PALETTE.accent} />
			<directionalLight position={[-5, -3, -4]} intensity={0.7} color={PALETTE.violet} />
			<Dice marks={shown} logos={logos} controls={controls} reducedMotion={reducedMotion} />
		</Canvas>
	);
}

export default ClientDice;
