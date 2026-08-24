# Lipsia Digital — Homepage Rebuild: Implementation Plan

**Goal:** Rebuild <https://lipsia.digital/en/> as a single, high-impact homepage with an
Oxigen-class scroll-driven 3D experience. The **LD logo** is the hero object — the
structural analogue of Oxigen's tree.

**Scope:** Homepage only. No subpages. Nav/footer links to future routes are inert anchors.

---

## 1. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Build | **Vite 8** + TypeScript (strict) | Fast HMR, native ESM, first-class code splitting |
| UI | **React 19** | Concurrent rendering; `useTransition` for scene handoff |
| 3D | **three** + **@react-three/fiber** | Declarative scene graph, reconciler-driven |
| 3D helpers | **@react-three/drei** | `Environment`, `useTexture`, `Float`, perf helpers |
| Post FX | **@react-three/postprocessing** | Bloom / chromatic aberration / vignette |
| Scroll | **lenis** | Sub-pixel smooth scroll; single RAF source shared with R3F |
| DOM motion | **motion** (Framer Motion 12) | Declarative reveals, respects reduced-motion |
| Lint/Format | **Biome 2** | Single fast toolchain, replaces ESLint + Prettier |
| Package manager | **pnpm 11** | Pinned via `packageManager`; matches the sibling `grundstock-frontend` repo |
| Tests | **Vitest** + Testing Library | Unit tests for hooks/utils/content integrity |
| Deploy | Static SPA + security headers | No server runtime → minimal attack surface |

**Deliberately excluded:** CSS frameworks (hand-authored CSS with custom properties keeps
the WebGL/DOM palette in one source of truth), state libraries (scroll progress lives in a
ref-based store, zero re-renders), analytics/fonts from third-party CDNs (CSP hostility).

---

## 2. The Hero: 3D LD Logo

The real logo is a **single SVG path** (`viewBox 0 0 512 512`, fill `#312782`) — a
stylized `L` + `D`. This is the seed geometry for a three-stage morph.

### Pipeline

```
ld-logo.svg path
  │
  ├─► ShapePath.toShapes() ──────► ExtrudeGeometry (depth, bevel)
  │        └─► solid "monolith" mesh: MeshPhysicalMesh, clearcoat + iridescence
  │
  └─► MeshSurfaceSampler over the extruded geometry
           └─► ~48k sampled surface positions → Float32 attribute buffer
                    └─► InstancedMesh / Points with custom GLSL
```

### Morph states (driven by one `uScroll` uniform, 0 → 1)

| Scroll | State | Visual |
|---|---|---|
| 0.00 | **Nebula** | Particles dispersed on a fibonacci sphere, slow drift, deep indigo |
| 0.25 | **Convergence** | Curl-noise flow field pulls particles toward logo surface targets |
| 0.45 | **Crystallised** | Particles locked to logo; solid extruded mesh fades in beneath |
| 0.70 | **Dissection** | Logo splits along Z; camera dollies through the gap |
| 1.00 | **Dispersal** | Particles stream outward into the footer as a starfield |

### Shader design

Per-particle attributes: `aTarget` (logo surface pos), `aOrigin` (sphere pos), `aSeed`.
Vertex shader lerps `aOrigin → aTarget` with a **per-particle staggered ease** —
`smoothstep(aSeed * 0.4, aSeed * 0.4 + 0.6, uScroll)` — so the logo assembles
progressively rather than uniformly. Curl noise adds turbulence weighted by
`1 - progress`, so motion settles as the form resolves. Fragment shader mixes brand
violet → mint by radial velocity, with a soft circular alpha mask.

All animation is **GPU-side**. The CPU touches one uniform per frame.

### Performance budget

- Single draw call for the particle system (instanced/points).
- DPR clamped to `[1, 2]`; adaptive downgrade below 50fps.
- Particle count tiered by device: 48k desktop / 18k mobile / 0 (static SVG) on
  `prefers-reduced-motion` or no-WebGL.
- Target: 60fps desktop, ≥30fps mid-tier mobile, LCP < 2.5s (hero canvas is lazy,
  DOM headline paints first).

---

## 3. Page Composition

1. **Hero** — full-viewport canvas. `We bring visions to life` + service triad, CTAs.
2. **Fields of Competence** — Software Engineering / CRM System / IT Consulting.
3. **Services** — Websites & Webapps / E-Commerce / Custom Applications / Enterprise Platforms.
4. **Technologies & Digital Competencies** — narrative copy + animated counters (30+ experts, 10+ languages).
5. **Clients** — `who place their trust in us`; marquee of client marks.
6. **CTA** — `With us you can grow.`
7. **Footer** — quick links, contact (Reichsstraße 1-9, 04109 Leipzig · info@lipsia.digital · 01523 3881705).

All copy is lifted verbatim from the live English site.

---

## 4. Architecture

```
src/
├── main.tsx, App.tsx
├── content/          site.ts            ← single source of truth for all copy (typed, frozen)
├── styles/           tokens.css, global.css
├── three/
│   ├── Scene.tsx                        ← canvas root, DPR + perf policy
│   ├── LogoParticles.tsx                ← THE hero object (team lead)
│   ├── logoGeometry.ts                  ← SVG → extrude → sample
│   ├── shaders/logoShader.ts             ← GLSL as tagged template strings
│   ├── ParticleField.tsx, Backdrop.tsx  ← ambient depth layers
│   └── Effects.tsx                      ← postprocessing chain
├── scroll/           ScrollProvider.tsx, useScrollProgress.ts   ← Lenis, ref-based
├── components/       Nav, Hero, Competence, Services, Tech, Clients, CTA, Footer
├── components/ui/    Reveal, Counter, Marquee, Seo
└── lib/              capabilities.ts, useReducedMotion.ts, ErrorBoundary.tsx
```

**Key invariant:** scroll progress is distributed via **ref + subscriber callbacks**, never
React state. DOM reveals use IntersectionObserver; the 3D scene reads the ref inside
`useFrame`. Zero scroll-driven re-renders.

---

## 5. Security & Best Practices

- **CSP** (meta + `_headers`): `default-src 'self'`; no `unsafe-eval`; `object-src 'none'`;
  `frame-ancestors 'none'`; `base-uri 'self'`.
- Headers: `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (deny camera/mic/geo), HSTS.
- Zero `dangerouslySetInnerHTML`; zero `eval`; all external links `rel="noopener noreferrer"`.
- All assets self-hosted (fonts included) — no third-party origins at runtime.
- No secrets in the repo; `.env.example` documents build-time-only public vars.
- `pnpm audit --prod` clean; exact-pinned deps; `pnpm-lock.yaml` committed.
- A11y: semantic landmarks, visible focus rings, skip link, `aria-hidden` on the
  decorative canvas, full `prefers-reduced-motion` static fallback, AA contrast.
- SEO: unique title/description, Open Graph, Twitter card, JSON-LD `Organization`.

---

## 6. Team & Work Split

Files are partitioned so no two agents write the same path.

| Role | Owns |
|---|---|
| **Lead** (me) | Scaffold, tokens, types, `LogoParticles` + shaders + `logoGeometry`, `Scene`, integration, final review |
| **Senior A** (sonnet) | Scroll system (Lenis provider, progress store), `ParticleField`, `Backdrop`, `Effects`, camera rig |
| **Senior B** (sonnet) | All DOM sections + `Reveal`/`Counter`/`Marquee`, responsive CSS, a11y |
| **Junior 1** (haiku) | Repo hygiene: `.gitignore`, `biome.json`, `tsconfig`, README, LICENSE, `_headers`, `.env.example` |
| **Junior 2** (haiku) | `content/site.ts` (verbatim copy), client marks, `Seo` component + JSON-LD |
| **Junior 3** (haiku) | `capabilities.ts`, `useReducedMotion`, `ErrorBoundary`, `Loader` |

Senior A reviews Junior 3's work; Senior B reviews Junior 2's. Lead reviews both seniors
and the hero shader work personally.
