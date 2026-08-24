/**
 * The hero morph shader.
 *
 * Every particle knows two positions — where it idles (`position`, a point in a
 * loose sphere) and where it belongs on the logo (`aTarget`) — and interpolates
 * between them. All of it runs on the GPU from a single `uScroll` uniform, so the
 * CPU cost of the entire animation is one float write per frame.
 *
 * The trick that makes it read as "assembling" rather than "sliding" is the
 * per-particle stagger: each particle's easing window is offset by its own seed,
 * so the mark resolves progressively out of turbulence instead of every point
 * arriving in lockstep.
 */

/** Curl noise built on Ashima's simplex. Divergence-free, so the flow never pools. */
const NOISE_CHUNK = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Finite-difference curl of the simplex field. Six taps is the honest cost of a
// divergence-free flow; cheaper approximations visibly pull particles into knots.
vec3 curl(vec3 p) {
  const float e = 0.12;
  float x1 = snoise(vec3(p.x, p.y + e, p.z));
  float x2 = snoise(vec3(p.x, p.y - e, p.z));
  float y1 = snoise(vec3(p.x, p.y, p.z + e));
  float y2 = snoise(vec3(p.x, p.y, p.z - e));
  float z1 = snoise(vec3(p.x + e, p.y, p.z));
  float z2 = snoise(vec3(p.x - e, p.y, p.z));
  return normalize(vec3(x1 - x2 - (y1 - y2), y1 - y2 - (z1 - z2), z1 - z2 - (x1 - x2)));
}
`;

export const logoVertexShader = /* glsl */ `
precision highp float;

attribute vec3 aTarget;
attribute vec3 aNormal;
attribute float aSeed;

uniform float uScroll;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uSplit;

varying float vProgress;
varying float vSeed;
varying float vSpeed;

${NOISE_CHUNK}

// Cubic ease-out: fast commit, soft landing. Keeps the assembly from feeling linear.
float easeOut(float t) {
  float f = 1.0 - t;
  return 1.0 - f * f * f;
}

float window(float t, float start, float end) {
  return clamp((t - start) / max(end - start, 1e-4), 0.0, 1.0);
}

void main() {
  vSeed = aSeed;

  // Each particle gets its own slice of the assembly window, so the mark resolves
  // progressively rather than in lockstep. The spread and duration are chosen so the
  // LAST particle lands at ~0.57 — before the split at 0.62 — otherwise the logo
  // never exists as a complete form at any single scroll position.
  float stagger = aSeed * 0.20;
  float assembly = easeOut(window(uScroll, 0.05 + stagger, 0.05 + stagger + 0.32));
  vProgress = assembly;

  // Idle drift while dispersed, dying off as the particle commits to its target.
  vec3 origin = position;
  vec3 drift = curl(origin * 0.16 + uTime * 0.045) * (1.0 - assembly) * 1.35;

  vec3 pos = mix(origin + drift, aTarget, assembly);

  // Turbulence scaled by how far the particle still has to travel: motion is
  // violent mid-flight and settles to nothing on arrival.
  float unsettled = assembly * (1.0 - assembly);
  pos += curl(pos * 0.42 + uTime * 0.11) * unsettled * 0.9;

  // Never fully flush to the skin — inflating along the surface normal keeps the
  // crystallised cloud clear of the solid body underneath instead of z-fighting it.
  // Scaled to the mark's 1.3-unit height: too small and the points vanish inside.
  pos += aNormal * assembly * (0.02 + aSeed * 0.05);

  // Dissection: the mark cleaves along Z so the camera can fly through the seam.
  float split = window(uScroll, 0.60, 0.84) * uSplit;
  pos.z += sign(aTarget.z + 0.0001) * split * 1.15;

  // Dispersal: everything streams outward into the footer as a starfield.
  float dispersal = window(uScroll, 0.82, 1.0);
  float burst = easeOut(dispersal);
  pos += normalize(pos + vec3(0.0001)) * burst * (7.0 + aSeed * 16.0);
  pos += curl(pos * 0.08 + uTime * 0.03) * burst * 3.2;

  vSpeed = unsettled + burst * 0.8;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // True perspective sizing. Without the 1/-z term particles read as flat decals.
  // The clamp is load-bearing at both ends: uncapped, particles that pass close to
  // the camera during the fly-through balloon into screen-filling discs, and distant
  // ones collapse below one pixel and drop out of the mark entirely.
  float size = uSize * (0.55 + aSeed * 0.9);
  size *= 1.0 + burst * 0.5;
  gl_PointSize = clamp(size * uPixelRatio * (1.0 / max(-mv.z, 0.1)), 1.0, 7.0);
}
`;

export const logoFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uColorCold;
uniform vec3 uColorWarm;
uniform vec3 uColorAccent;
uniform float uOpacity;

varying float vProgress;
varying float vSeed;
varying float vSpeed;

void main() {
  // Round the square point sprite and give it a soft core.
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float mask = smoothstep(0.5, 0.06, d);

  // Cold indigo while dispersed, mint once crystallised, with a coral minority
  // that keeps the mass from reading as a flat two-tone gradient.
  vec3 color = mix(uColorCold, uColorWarm, vProgress);
  color = mix(color, uColorAccent, step(0.94, vSeed) * 0.75);

  // Hot cores on the fastest particles sell the turbulence.
  color += vSpeed * 0.45;

  // Lift the crystallised mark just past the bloom threshold. Restrained on purpose:
  // tens of thousands of additively-blended points overlap here, so per-particle
  // contribution compounds — pushing this higher clips the whole mark to white and
  // destroys the letterforms it is supposed to describe.
  color *= 0.45 + vProgress * 0.5;

  float alpha = mask * uOpacity * (0.18 + vProgress * 0.34);
  gl_FragColor = vec4(color, alpha);

  #include <colorspace_fragment>
}
`;
