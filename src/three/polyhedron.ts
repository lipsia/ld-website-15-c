import * as THREE from "three";

/**
 * Builds a convex die with an arbitrary number of faces — one per client logo.
 *
 * There is no regular polyhedron with 15 faces (the Platonic solids stop at 4, 6, 8,
 * 12 and 20), and the near-misses are all wrong for this: prisms and bipyramids give
 * you n+2 or 2n faces, so 15 forces either a coin-like drum or an odd/even mismatch.
 *
 * So the solid is derived instead of picked. Take N evenly spread directions on a
 * sphere and treat each as an outward face normal at a fixed support distance; the die
 * is the intersection of those N half-spaces — the polar dual of the direction set.
 * That guarantees exactly one face per direction, all of roughly equal area, for ANY
 * N. Add a sixteenth client and the die becomes sixteen-sided on its own.
 *
 * The intersection is computed by brute force: every triple of planes meets at one
 * candidate vertex, and a candidate survives if it satisfies all the other half-space
 * constraints. That is O(N^4) in the worst case — 455 three-by-three solves at N=15 —
 * which is nothing for a one-off run at startup, and far less code than a general
 * convex-hull implementation would be.
 */

export interface PolyFace {
	/** Outward unit normal — also the direction this face's logo looks along. */
	readonly normal: THREE.Vector3;
	/** Centroid of the face polygon. */
	readonly centre: THREE.Vector3;
	/** Face polygon, wound counter-clockwise as seen from outside. */
	readonly corners: THREE.Vector3[];
	/**
	 * Radius of the largest circle that fits inside the polygon, centred on the
	 * centroid. Used to size the logo so it never spills over a face edge.
	 */
	readonly inradius: number;
}

export interface Polyhedron {
	readonly faces: PolyFace[];
	/** Triangulated surface, ready to render. */
	readonly geometry: THREE.BufferGeometry;
}

/**
 * Golden-angle spiral on the sphere. Near-uniform with no clustering at the poles,
 * which a naive lat/long grid would show as two crowded spots.
 */
export function fibonacciDirections(count: number): THREE.Vector3[] {
	const golden = Math.PI * (3 - Math.sqrt(5));
	const out: THREE.Vector3[] = [];
	for (let i = 0; i < count; i++) {
		const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
		const r = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = golden * i;
		out.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize());
	}
	return out;
}

/**
 * Spreads directions apart on the sphere by mutual repulsion (the Thomson problem).
 *
 * A golden-angle spiral is a good starting guess but not an optimal packing, and at
 * small N the gaps are uneven enough to matter: at N=15 it leaves one face a narrow
 * sliver. Since every logo is drawn at the size of the SMALLEST face, that one sliver
 * shrinks all fifteen logos. Relaxing first equalises the face areas, which is what
 * buys the logos their size back.
 *
 * Deterministic — same input, same output, so the die never re-rolls between loads.
 */
export function relaxDirections(directions: THREE.Vector3[], iterations = 160): THREE.Vector3[] {
	const points = directions.map((d) => d.clone());
	const forces = points.map(() => new THREE.Vector3());
	const delta = new THREE.Vector3();
	const step = 0.02;

	for (let iteration = 0; iteration < iterations; iteration++) {
		for (const force of forces) force.set(0, 0, 0);

		for (let i = 0; i < points.length; i++) {
			for (let j = i + 1; j < points.length; j++) {
				const a = points[i];
				const b = points[j];
				const fa = forces[i];
				const fb = forces[j];
				if (!a || !b || !fa || !fb) continue;

				delta.subVectors(a, b);
				// Inverse-square repulsion, so near neighbours dominate and the set spreads
				// evenly instead of collapsing into a couple of clusters.
				const distanceSq = Math.max(delta.lengthSq(), 1e-6);
				delta.multiplyScalar(1 / distanceSq);
				fa.add(delta);
				fb.sub(delta);
			}
		}

		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			const force = forces[i];
			if (!point || !force) continue;
			// Move, then project back onto the unit sphere.
			point.addScaledVector(force, step).normalize();
		}
	}

	return points;
}

/**
 * Solves [a;b;c]·x = (rhs,rhs,rhs) — the point where three supporting planes meet.
 * Null when the planes are near-parallel and the intersection is ill-conditioned.
 *
 * Uses `Matrix3.invert()` rather than a hand-expanded Cramer's rule: the first version
 * of this function had a transcribed sign error in one cofactor, which produced an
 * empty vertex set and therefore a die with no faces at all.
 */
function solve3(
	a: THREE.Vector3,
	b: THREE.Vector3,
	c: THREE.Vector3,
	rhs: number,
): THREE.Vector3 | null {
	const m = new THREE.Matrix3().set(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
	if (Math.abs(m.determinant()) < 1e-8) return null;
	return new THREE.Vector3(rhs, rhs, rhs).applyMatrix3(m.invert());
}

/** Distance from a point to the infinite line through `p` and `q`. */
function distanceToEdge(point: THREE.Vector3, p: THREE.Vector3, q: THREE.Vector3): number {
	const edge = new THREE.Vector3().subVectors(q, p);
	const length = edge.length();
	if (length < 1e-9) return Number.POSITIVE_INFINITY;
	const cross = new THREE.Vector3().subVectors(point, p).cross(edge);
	return cross.length() / length;
}

export function buildPolyhedron(directions: THREE.Vector3[], support: number): Polyhedron {
	const n = directions.length;
	const tolerance = support * 1e-6;

	// --- candidate vertices: every plane triple, kept only if inside every half-space
	const vertices: THREE.Vector3[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			for (let k = j + 1; k < n; k++) {
				const a = directions[i];
				const b = directions[j];
				const c = directions[k];
				if (!a || !b || !c) continue;

				const point = solve3(a, b, c, support);
				if (!point) continue;

				let inside = true;
				for (let m = 0; m < n; m++) {
					const d = directions[m];
					if (!d) continue;
					if (d.dot(point) > support + tolerance) {
						inside = false;
						break;
					}
				}
				if (!inside) continue;

				// Three planes meeting at a corner produce the same point from several
				// triples once more than three faces share it, so dedupe.
				const key = `${point.x.toFixed(5)},${point.y.toFixed(5)},${point.z.toFixed(5)}`;
				if (seen.has(key)) continue;
				seen.add(key);
				vertices.push(point);
			}
		}
	}

	// --- group vertices into faces, wind them, and triangulate
	const faces: PolyFace[] = [];
	const positions: number[] = [];
	const normals: number[] = [];

	const u = new THREE.Vector3();
	const v = new THREE.Vector3();

	for (let i = 0; i < n; i++) {
		const normal = directions[i];
		if (!normal) continue;

		const onFace = vertices.filter(
			(point) => Math.abs(normal.dot(point) - support) < 1e-4 * support,
		);
		// Fewer than three corners is not a polygon: this direction contributes no face,
		// which can happen if the direction set is badly clustered.
		if (onFace.length < 3) continue;

		const centre = new THREE.Vector3();
		for (const point of onFace) centre.add(point);
		centre.divideScalar(onFace.length);

		// Tangent basis, so the corners can be sorted by angle within the face plane.
		u.set(1, 0, 0);
		if (Math.abs(normal.x) > 0.9) u.set(0, 1, 0);
		u.projectOnPlane(normal).normalize();
		v.crossVectors(normal, u);

		const corners = [...onFace].sort((p, q) => {
			const pa = Math.atan2(v.dot(p) - v.dot(centre), u.dot(p) - u.dot(centre));
			const qa = Math.atan2(v.dot(q) - v.dot(centre), u.dot(q) - u.dot(centre));
			return pa - qa;
		});

		let inradius = Number.POSITIVE_INFINITY;
		for (let c = 0; c < corners.length; c++) {
			const p = corners[c];
			const q = corners[(c + 1) % corners.length];
			if (!p || !q) continue;
			inradius = Math.min(inradius, distanceToEdge(centre, p, q));
		}

		// Fan from the centroid. Valid for any convex polygon, and it keeps the winding
		// consistent so the outward normal is correct without a second pass.
		for (let c = 0; c < corners.length; c++) {
			const p = corners[c];
			const q = corners[(c + 1) % corners.length];
			if (!p || !q) continue;
			positions.push(centre.x, centre.y, centre.z, p.x, p.y, p.z, q.x, q.y, q.z);
			for (let t = 0; t < 3; t++) normals.push(normal.x, normal.y, normal.z);
		}

		faces.push({ normal: normal.clone(), centre, corners, inradius });
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
	geometry.computeBoundingSphere();

	return { faces, geometry };
}

/**
 * Wireframe of the face boundaries only.
 *
 * `THREE.EdgesGeometry` is the obvious choice and the wrong one here: the surface is a
 * non-indexed triangle fan, so it cannot tell which edges are shared and draws every
 * spoke from each face centroid to its corners. The result is a die with a spiderweb
 * across each face. Walking the polygons directly and dropping the edge each pair of
 * faces shares gives just the silhouette lines.
 */
export function buildEdges(faces: readonly PolyFace[]): THREE.BufferGeometry {
	const points: number[] = [];
	const seen = new Set<string>();
	const key = (v: THREE.Vector3) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;

	for (const face of faces) {
		for (let i = 0; i < face.corners.length; i++) {
			const a = face.corners[i];
			const b = face.corners[(i + 1) % face.corners.length];
			if (!a || !b) continue;
			const edgeKey = [key(a), key(b)].sort().join("|");
			if (seen.has(edgeKey)) continue;
			seen.add(edgeKey);
			points.push(a.x, a.y, a.z, b.x, b.y, b.z);
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
	return geometry;
}
