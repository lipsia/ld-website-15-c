# ld-website-15-c

Single-page marketing site for lipsia.digital. Centrepiece is the LD logo as a GPU particle system (three.js + React 19).

## Setup

- Node is pinned by `.nvmrc` (24). pnpm comes from corepack, pinned by the
  `packageManager` field — never install pnpm directly.
- `pnpm: command not found` after switching Node version means corepack's shim is
  missing for that install (they are per-Node-version): `corepack enable pnpm`, and if
  that is silent, add `--install-directory "$(dirname "$(which node)")"`.

## Commands

- `pnpm dev` — Start dev server (Vite)
- `pnpm build` — Production build
- `pnpm preview` — Preview built site
- `pnpm typecheck` — Type check (TypeScript strict)
- `pnpm lint` — Run Biome linter
- `pnpm format` — Format code
- `pnpm check` — Run linter + formatter check
- `pnpm check:fix` — Auto-fix lint + format issues
- `pnpm test` — Run Vitest
- `pnpm test:watch` — Watch mode
- `pnpm audit` — Audit dependencies

## Structure & conventions

- `src/three/` — WebGL layer. `Scene.tsx` is canvas root; `LogoParticles.tsx`, `logoGeometry.ts`, `shaders/logoShader.ts` are the hero particle system; `ParticleField.tsx`, `Backdrop.tsx`, `Effects.tsx`, `CameraRig.tsx` are ambient layers.
- `src/scroll/` — `scrollStore.ts` is a ref-based scroll store (zero re-renders per 60fps scroll); `ScrollProvider.tsx` feeds it from native scroll events. Scroll is NOT hijacked — smooth-scroll libraries were tried and removed because interpolating the scroll position makes every gesture feel like an ease-in-out animation. The scene damps `uScroll` in its own loop instead.
- `src/components/` — DOM sections; `src/components/ui/` — primitives (Reveal, Counter, Marquee, Seo).
- `src/content/site.ts` — ALL copy, transcribed verbatim from lipsia.digital. Never rewrite, "improve" or fix marketing copy.
- `src/lib/` — `capabilities.ts` produces a `RenderPolicy` (particle count / DPR / postprocessing by device tier); also reduced-motion hook, ErrorBoundary, Loader, StaticFallback.
- `src/styles/tokens.css` — ONLY place colours/spacing/type-scale are defined. Never hardcode hex or px font-size. Mirror in `src/three/palette.ts` for shaders — must stay in sync.
- Import via `#/*` alias (→ `src/*`), not deep relative paths.

## WebGL layer

- Scene is decorative and `aria-hidden`; all content is real DOM above it.
- `three` is a lazy chunk — first paint never waits on it.
- Particle count / DPR / postprocessing come from `RenderPolicy` in `src/lib/capabilities.ts`, never hardcoded per component.
- Every three.js resource created imperatively must be disposed (React StrictMode double-mounts).
- Never allocate objects (Vector3, Color, arrays) inside `useFrame`.

## Two traps that already bit us

1. **Uniforms must be written through the material, not through a local object.** `THREE.ShaderMaterial` clones the uniforms object it is given, so mutating your local copy silently never reaches the GPU. Use the helpers in `src/three/uniforms.ts`.
2. **Colours must be converted to linear space before going into a shader uniform.** three.js r152+ works in linear and encodes to sRGB once at output, so feeding raw sRGB values gets them encoded twice and washes the scene out. `toVec3()` in `src/three/palette.ts` handles this.

## Accessibility & security

- `prefers-reduced-motion` and missing WebGL both fall back to a static mark.
- Semantic landmarks, skip link, visible focus rings, AA contrast are requirements not nice-to-haves.
- Strict CSP with no third-party origins — no CDN fonts, scripts or textures. Everything self-hosted.
- No `dangerouslySetInnerHTML`. No secrets in the repo.

## Git

- `main` is the default branch (no `develop`).
- Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- Developer runs all git write operations himself — never stage, commit or push.
- Pre-commit (husky + lint-staged) runs Biome on staged files + full typecheck.
- CI runs typecheck, check, test and build on pushes to main and all PRs.
