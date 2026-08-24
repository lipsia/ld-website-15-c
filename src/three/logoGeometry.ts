/**
 * Turns the LD logo SVG into the two GPU resources the hero needs:
 *
 *   1. an extruded, bevelled solid mesh geometry (the "monolith"), and
 *   2. a flat array of points sampled uniformly over that solid's surface,
 *      which become the particle targets.
 *
 * Doing this at runtime rather than shipping a baked .glb keeps the logo a
 * single 1.6KB SVG — the same file the brand team already maintains. Re-exporting
 * a mesh every time the mark changes would be a standing liability.
 */

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

export interface LogoGeometry {
  /** Extruded solid, centred on the origin and normalised to `targetHeight`. */
  readonly solid: THREE.BufferGeometry;
  /** Surface sample positions, `count * 3` floats, xyz interleaved. */
  readonly targets: Float32Array;
  /** Surface normal at each sample, `count * 3` floats. Used to inflate particles off the skin. */
  readonly normals: Float32Array;
  /** Number of samples actually produced. */
  readonly count: number;
}

const EXTRUDE_OPTIONS: THREE.ExtrudeGeometryOptions = {
  depth: 42,
  bevelEnabled: true,
  bevelThickness: 6,
  bevelSize: 5,
  bevelSegments: 4,
  curveSegments: 12,
};

/**
 * SVG's Y axis points down, three.js's points up, so the extruded mark comes out
 * upside down. Negating Y also mirrors triangle winding, which would leave every
 * face backwards — so the index buffer is reversed to restore it.
 */
function flipY(geometry: THREE.BufferGeometry): void {
  geometry.scale(1, -1, 1);

  const index = geometry.getIndex();
  if (index) {
    const array = index.array;
    for (let i = 0; i < array.length; i += 3) {
      const a = array[i];
      const c = array[i + 2];
      if (a === undefined || c === undefined) continue;
      array[i] = c;
      array[i + 2] = a;
    }
    index.needsUpdate = true;
  }

  geometry.computeVertexNormals();
}

/** Fits the geometry into a predictable world size so camera framing is stable. */
function normalise(geometry: THREE.BufferGeometry, targetHeight: number): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());

  geometry.translate(-centre.x, -centre.y, -centre.z);
  const scale = size.y > 0 ? targetHeight / size.y : 1;
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingSphere();
}

/**
 * Parses the SVG and builds the extruded solid. Kept separate from sampling so the
 * solid can be reused for both the visible mesh and the sampler without re-parsing.
 */
function buildSolid(svgText: string, targetHeight: number): THREE.BufferGeometry {
  const { paths } = new SVGLoader().parse(svgText);

  const shapes: THREE.Shape[] = [];
  for (const path of paths) {
    // ShapePath.toShapes() carries the winding-order hole detection that the
    // deprecated SVGLoader.createShapes() used to wrap. The D's counter-form
    // depends on it, so a regression here is immediately visible.
    shapes.push(...path.toShapes());
  }

  if (shapes.length === 0) {
    throw new Error('logoGeometry: the SVG produced no extrudable shapes');
  }

  const geometry = new THREE.ExtrudeGeometry(shapes, EXTRUDE_OPTIONS);
  flipY(geometry);
  normalise(geometry, targetHeight);
  return geometry;
}

/**
 * Area-weighted surface sampling. Uniform-by-area (rather than per-vertex) matters:
 * the extruded sides have far fewer vertices than the bevels, so vertex-based
 * sampling would leave the flanks of the logo visibly bald.
 */
function sampleSurface(
  solid: THREE.BufferGeometry,
  count: number,
): { targets: Float32Array; normals: Float32Array } {
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(solid)).build();

  const targets = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    sampler.sample(position, normal);
    const o = i * 3;
    targets[o] = position.x;
    targets[o + 1] = position.y;
    targets[o + 2] = position.z;
    normals[o] = normal.x;
    normals[o + 1] = normal.y;
    normals[o + 2] = normal.z;
  }

  return { targets, normals };
}

/**
 * Loads and prepares the logo. `count` is supplied by the device render policy, so
 * a low-tier phone samples the same geometry at a third of the density rather than
 * running a different code path.
 *
 * `targetHeight` is framing-critical: the camera dollies to roughly z=4 at the
 * crystallised stage, where the visible frame is ~3 world units tall. Anything above
 * ~1.5 clips off the top and bottom of the viewport instead of reading as an object.
 */
export async function loadLogoGeometry(
  url: string,
  count: number,
  targetHeight = 1.3,
): Promise<LogoGeometry> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`logoGeometry: failed to load ${url} (${response.status})`);
  }

  const solid = buildSolid(await response.text(), targetHeight);
  const { targets, normals } = sampleSurface(solid, count);

  return { solid, targets, normals, count };
}

/**
 * Fibonacci sphere — the particles' rest state before the logo assembles.
 * The golden-angle spiral gives near-uniform coverage with no clustering at the
 * poles, which a naive lat/long distribution would show as two bright dots.
 */
export function fibonacciSphere(count: number, radius: number): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    // Jitter the radius so the start state reads as a volumetric cloud, not a shell.
    const jitter = radius * (0.55 + 0.45 * fract(Math.sin(i * 12.9898) * 43758.5453));
    const o = i * 3;
    out[o] = Math.cos(theta) * r * jitter;
    out[o + 1] = y * jitter;
    out[o + 2] = Math.sin(theta) * r * jitter;
  }

  return out;
}

function fract(n: number): number {
  return n - Math.floor(n);
}

/** Deterministic per-particle randoms. Stable across reloads so the assembly never re-rolls. */
export function seedAttribute(count: number): Float32Array {
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = fract(Math.sin((i + 1) * 78.233) * 43758.5453);
  }
  return out;
}
