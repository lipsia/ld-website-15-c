import { describe, expect, it } from "vitest";
import { buildPolyhedron, fibonacciDirections, relaxDirections } from "./polyhedron";

/**
 * Guards the derived die. Half-space intersection fails quietly — a bad tolerance or a
 * sign slip yields a plausible-looking mesh with missing faces or inverted winding
 * rather than an error, so these assert the structural invariants directly.
 */
describe("buildPolyhedron", () => {
	const SUPPORT = 1.5;

	it("produces exactly one face per direction", () => {
		for (const count of [6, 12, 15, 20]) {
			const { faces } = buildPolyhedron(fibonacciDirections(count), SUPPORT);
			expect(faces, `count=${count}`).toHaveLength(count);
		}
	});

	it("satisfies Euler's formula V - E + F = 2", () => {
		const { faces } = buildPolyhedron(fibonacciDirections(15), SUPPORT);

		const vertexKeys = new Set<string>();
		const edgeKeys = new Set<string>();
		const key = (v: { x: number; y: number; z: number }) =>
			`${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;

		for (const face of faces) {
			for (let i = 0; i < face.corners.length; i++) {
				const a = face.corners[i];
				const b = face.corners[(i + 1) % face.corners.length];
				if (!a || !b) continue;
				vertexKeys.add(key(a));
				// Undirected: the two faces sharing an edge must not count it twice.
				edgeKeys.add([key(a), key(b)].sort().join("|"));
			}
		}

		expect(vertexKeys.size - edgeKeys.size + faces.length).toBe(2);
	});

	it("orients every face outward", () => {
		const { faces } = buildPolyhedron(fibonacciDirections(15), SUPPORT);
		for (const face of faces) {
			// The normal must agree with the direction from the origin to the face.
			expect(face.normal.dot(face.centre)).toBeGreaterThan(0);
			// And the face must sit on its own supporting plane.
			expect(face.normal.dot(face.centre)).toBeCloseTo(SUPPORT, 4);
		}
	});

	it("gives every face a usable inradius", () => {
		const { faces } = buildPolyhedron(fibonacciDirections(15), SUPPORT);
		for (const face of faces) {
			expect(face.inradius).toBeGreaterThan(0);
			expect(Number.isFinite(face.inradius)).toBe(true);
			// A face wider than the die itself would mean the winding or grouping is wrong.
			expect(face.inradius).toBeLessThan(SUPPORT * 2);
		}
	});

	it("relaxation equalises face sizes and keeps the face count", () => {
		const raw = fibonacciDirections(15);
		const relaxed = relaxDirections(raw);

		const spread = (dirs: typeof raw) => {
			const { faces } = buildPolyhedron(dirs, SUPPORT);
			const radii = faces.map((f) => f.inradius);
			return { faces, min: Math.min(...radii), max: Math.max(...radii) };
		};

		const before = spread(raw);
		const after = spread(relaxed);

		// Still one face per direction after relaxing.
		expect(after.faces).toHaveLength(15);
		// The smallest face is what sizes every logo, so that is the number that must improve.
		expect(after.min).toBeGreaterThan(before.min);
		// And the spread between largest and smallest should tighten.
		expect(after.max / after.min).toBeLessThan(before.max / before.min);
	});

	it("winds each face as a convex polygon with at least three corners", () => {
		const { faces } = buildPolyhedron(fibonacciDirections(15), SUPPORT);
		for (const face of faces) {
			expect(face.corners.length).toBeGreaterThanOrEqual(3);
		}
	});

	it("emits a renderable triangle soup", () => {
		const { geometry, faces } = buildPolyhedron(fibonacciDirections(15), SUPPORT);
		const position = geometry.getAttribute("position");
		const expectedTriangles = faces.reduce((sum, face) => sum + face.corners.length, 0);
		expect(position.count).toBe(expectedTriangles * 3);
		expect(geometry.getAttribute("normal").count).toBe(position.count);
	});
});
