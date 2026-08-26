# Implementation plan

Status: Phases 0-4 done. Phase 5 (content) blocked on sources — see §9. Written 2026-08-26,
last updated 2026-08-27.

The single plan document for this project, in two parts:

- **§1-§10** — routing, i18n and prerendering. These numbers are cited from code
  comments, CLAUDE.md and the README: **do not renumber them.**
- **§11-§16** — the original homepage build, completed and merged in from the former
  root-level `IMPLEMENTATION_PLAN.md`.

Part I turns the single-page client-rendered site into a small bilingual multi-page site
that still ships as static files.

---

## 1. Decisions

### 1.1 TanStack Router, not TanStack Start

`grundstock-frontend` uses TanStack **Start**. We use TanStack **Router** only.
The reason is in grundstock's own `src/server.ts`:

> `// CSP is deliberately absent for now: TanStack Start injects inline hydration`
> `// scripts that need nonce/hash support — revisit with docs/PLAN.md §8`

grundstock ships no Content-Security-Policy because Start inlines a hydration
payload. Our `script-src 'self'` with no `unsafe-inline` is a hard requirement
(see CLAUDE.md, "Accessibility & security"), so adopting Start would mean
importing a known regression from the other repo rather than the house style.

Router in SPA mode serialises nothing, so nothing needs inlining and the CSP
survives untouched. Everything else is shared with grundstock: file-based
routes in `src/routes/`, a tracked `routeTree.gen.ts`, `src/router.tsx`, and
the `rewrite: { input: deLocalizeUrl, output: localizeUrl }` trick that lets
one unprefixed route tree serve both locales.

If a career form later needs a server endpoint, Start is an incremental
upgrade from Router and the route files carry over unchanged. That decision
can be deferred until there is an actual endpoint to write.

### 1.2 Static prerendering instead of SSR

There is no dynamic data on any planned page. A build-time prerender of each
route × locale gives everything SSR would give us here — real HTML, real
headings, meta and JSON-LD in the shell — with no server to deploy or secure,
and no inline hydration payload.

Verified cheap for this codebase: the only module-scope `document` access is
`src/main.tsx:10` (the entry, never server-rendered), and all four exported
functions in `src/lib/capabilities.ts` already guard on
`typeof window === "undefined"`. Everything else touching `window`,
`document` or `navigator` sits inside hooks and effects, which do not run
during `renderToString`.

### 1.3 The 3D scene is home-only

`LogoParticles` (the LD logo, ~48k particles) and `ParticleField` (the ambient
dust shell) are both confined to the home page. Team, career and the legal
pages render on flat `--surface-0` with no `<canvas>`, no WebGL context and no
render loop.

Because no page needs a *partial* scene, `<Scene>` is mounted by
`src/routes/index.tsx` directly. No variant prop, no route-level scene
declaration, nothing in `__root.tsx`.

---

## 2. Target route table

Routes are declared unprefixed once; Paraglide's URL strategy supplies the
`/en` variants.

| Route file | German | English |
| --- | --- | --- |
| `index.tsx` | `/` | `/en` |
| `team.tsx` | `/team` | `/en/team` |
| `karriere.tsx` | `/karriere` | `/en/career` |
| `impressum.tsx` | `/impressum` | `/en/imprint` |
| `datenschutz.tsx` | `/datenschutz` | `/en/privacy` |

`baseLocale` is `de`: lipsia.digital's root is `lang="de-DE"`, and it matches
grundstock. Localised pathnames (`karriere` / `career`) are worth the extra
`urlPatterns` entries for search.

Impressum and Datenschutz are included because they are legally required for a
German company and already exist on the live site — not scope creep.

---

## 3. Phases

Phases 0 and 1 are independent. Phases 2 and 3 both rewrite `src/content/`
and should land together.

### Phase 0 — SEO defects (no dependencies)

Two real bugs, both live today.

1. **No `og:image` anywhere.** `src/components/ui/Seo.tsx` declares
   `twitter:card = summary_large_image` with no image, so every shared link
   renders as a bare text card. Add a self-hosted 1200×630 asset.
2. **`robots.txt` advertises a sitemap that 404s.** It points at
   `https://lipsia.digital/sitemap.xml`; `public/` has no such file. Either
   generate it (Phase 4) or drop the line until we do.

Measured baseline, for reference — a crawler that does not run JS currently
gets `title` (from the static shell) and **0 characters of body text, 0
headings**, no canonical, no Open Graph, no JSON-LD. With JS: 2872 characters
and 6 headings. Google renders JS; LinkedIn, Slack, WhatsApp, Bing and most AI
crawlers do not.

### Phase 1 — Routing

Add `@tanstack/react-router` + `@tanstack/router-plugin`.

New:
- `src/routes/__root.tsx` — html shell, `Nav`, `Footer`, skip link,
  `ScrollProvider`. No 3D.
- `src/routes/index.tsx` — the current homepage sections **plus** `<Scene>`,
  `ErrorBoundary`, `StaticFallback` and the `policy` memo, all moved out of
  `App.tsx`.
- `src/routes/{team,karriere,impressum,datenschutz}.tsx` — placeholders.
- `src/router.tsx` — `createRouter`, `scrollRestoration: true`,
  `defaultPreload: "intent"`.

Changed:
- `src/App.tsx` — reduces to `RouterProvider`, or is deleted.
- `src/components/Nav.tsx` — currently emits same-page anchors (`#services`).
  Must handle both: anchors when on home, cross-page `<Link>` otherwise.
- `src/main.tsx` — `createRoot` → `hydrateRoot` (Phase 3 depends on this, but
  changing it here keeps the two phases independent).

`vite.config.ts` gains the router plugin. `routeTree.gen.ts` is generated and
**tracked** (grundstock tracks it; `src/paraglide/` it does not).

### Phase 2 — i18n

Add `@inlang/paraglide-js`.

New:
- `project.inlang/settings.json` — `baseLocale: "de"`, `locales: ["de","en"]`,
  `pathPattern: "./messages/{locale}.json"`.
- `paraglide.config.ts` — single source of compiler options, imported by both
  `vite.config.ts` and `scripts/compile-i18n.ts`. Copied from grundstock,
  including its warning that the bare `paraglide-js compile` CLI must not be
  used.
- `messages/de.json`, `messages/en.json`.
- `src/components/ui/LocaleSwitcher.tsx`.
- `scripts/compile-i18n.ts`, wired into a `prepare` hook so CI and fresh
  clones compile before typecheck.

Strategy: `["url", "cookie", "preferredLanguage", "baseLocale"]`. `url` is
canonical for search; `cookie` persists an explicit switcher choice;
`preferredLanguage` replaces the server-side `Accept-Language` negotiation
grundstock does in a Worker, which we have no server for.

`src/paraglide/` is gitignored.

**The load-bearing refactor.** `src/content/site.ts` is a module-scope
`as const` object holding ~122 strings inside typed structures. Paraglide's
`m.*()` are function calls that read the ambient locale, so evaluating them at
module scope would freeze the language at import time and the switcher would
silently do nothing — the page would simply never change language. Every
export becomes a function (`getHero()`, `getServices()`), or components call
`m.*` at render. The typed shapes in `src/types.ts` stay as they are; only the
string leaves move.

`src/content/site.test.ts` must be rewritten alongside it.

German copy is **transcribed** from lipsia.digital, not translated here.
CLAUDE.md's rule that this copy is marketing-owned and verbatim applies to
both locales.

### Phase 3 — Prerender

New: `scripts/prerender.ts`, run after `vite build`.

For each route × locale: set the Paraglide locale, render the router to a
string with a memory history, and write `dist/<localised-path>/index.html`
with the correct `<html lang>`, the hoisted head tags, and the built asset
tags. React 19 emits `<title>`/`<meta>` rendered anywhere in the tree into the
head during SSR, so no head library is needed.

Output: 10 documents. No inline scripts — the CSP is unchanged.

**Hydration mismatch to handle explicitly.** `getRenderPolicy()` returns a
conservative default when `window` is undefined and the real policy on the
client, so a naive prerender emits `<StaticFallback>` server-side and
`<Scene>` client-side. Gate the scene behind a `mounted` flag so the first
client render matches the server output and the canvas mounts in an effect.
This also stops the WebGL init from blocking hydration.

`PixelWordmark` needs no special handling: the server emits the wrapper and an
empty `<canvas>`, and the effect fills it — markup matches.

### Phase 4 — Per-page SEO

- `Seo.tsx` takes per-route title / description / canonical instead of reading
  `SITE` directly.
- `hreflang` alternate pairs plus `x-default` on every page.
- `og:locale` per locale (`de_DE` / `en_US`); it is hardcoded `en_US` today.
- `sitemap.xml` generated from the route tree × locales in the same build step
  as the prerender, which retires the Phase 0 workaround.
- JSON-LD `Organization` stays global; add `WebPage` per route.

### Phase 5 — Content for the new pages

Team, career, Impressum and Datenschutz copy, both locales, transcribed from
the live site where it exists. Needs marketing sign-off for anything new.

---

## 4. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | **three.js disposal under navigation.** CONFIRMED REAL in Phase 1, partly fixed — see §7. | Two leaks fixed; one residual, tracked in §7. |
| 2 | **Hydration mismatch from capability detection.** See §3 Phase 3. | `mounted` gate; assert zero hydration warnings in the prerender smoke test. |
| 3 | **Paraglide `urlPatterns` redirect loops.** grundstock hit an infinite 307 between the router's trailing-slash normalisation and `localizeUrl`, and fixed it with explicit patterns making the localised root `/en` not `/en/`. | Copy their explicit-pattern config verbatim; test every route × locale for a single-hop resolution. |
| 4 | **`scrollStore` is global and document-driven.** `uScroll` assumes one long scrolling page. Short pages with no scene may leave it at a stale value. | Reset the store on route change; scene is home-only so the blast radius is small. |
| 5 | **CSP regression.** The whole reason for choosing Router over Start. Easy to lose accidentally to a plugin that inlines a script. | Assert on the built output: fail the build if `dist/**/*.html` contains any inline `<script>` without `src`. |
| 6 | **Prerender + lazy `three` chunk.** `Scene` is `lazy()`; a prerender that awaits Suspense could pull three.js into the server render for no reason. | Scene is behind the `mounted` gate, so it is never reached during prerender. Assert `three` does not appear in any prerendered HTML. |

---

## 5. Verification gates

Every phase must leave `pnpm typecheck`, `pnpm check`, `pnpm test` and
`pnpm build` clean, plus:

- **Phase 1** — navigation loop leak test; every route reachable; Nav anchors
  still work on home; no canvas present on non-home routes (assert no
  `<canvas>` in the DOM).
- **Phase 2** — switcher changes every visible string; no string frozen at
  import time (regression test for the `as const` trap); both locales
  typecheck against the same message keys.
- **Phase 3** — 10 HTML files emitted; each has non-zero body text and its
  correct `<html lang>`; zero hydration warnings; no inline `<script>`.
- **Phase 4** — hreflang round-trips (each page's alternates point back at
  it); sitemap matches the route table exactly.
- **All phases** — the existing non-negotiables from CLAUDE.md: reduced-motion
  fallback, no-WebGL fallback, AA contrast, visible focus, no mobile overflow.

---

## 6. Open questions

1. Team and career copy — does it exist on the live site, or does marketing
   need to write it?
2. Does the career page need a form? If so it needs an endpoint, which is the
   one thing that would justify revisiting §1.1.
3. `motion` (framer) is currently a dependency used by `Counter` and
   `Reveal`. Worth checking whether route transitions want it too, or whether
   it can stay confined.

---

## 7. Phase 1 findings: the navigation leak

Measured by driving 10-70 client-side home <-> team cycles and diffing V8 heap
snapshots by constructor. Worth recording because two of the three readings I
took along the way were wrong in instructive ways.

**Method matters.** A first pass using full page loads (`page.goto`) showed no
growth at all — a fresh JS context each time never exercises the React unmount
path. Only client-side navigation reveals the leak. A second pass over 30
cycles looked like it was decelerating (caches settling); extending to 70
cycles showed it flat at ~65 KB/cycle, i.e. linear. Three data points were not
enough to tell a settling curve from a leak.

**Isolation.** Navigating between two pages that have no canvas
(team <-> karriere) flattens to ~0.03 MB per 10 cycles: the shell, router, nav
and footer are clean. Disabling the hero `Scene` left the leak unchanged;
disabling `ClientDice` removed it entirely. The hero canvas is clean; the die's
canvas is not.

**Fixed.**
1. `useLogoTextures` disposed its fifteen client-logo textures only on the
   lost-race path. On the normal path they went into state and nothing ever
   released them — fifteen leaked textures per visit. Now disposed in the
   effect cleanup, verified `Texture` 0.00/cycle.
2. The `webglcontextlost` handler was an inline arrow, so it could never be
   unregistered. It is now a named module-level function, removed on unmount,
   and the renderer is explicitly disposed.

**Residual, unresolved.** One `WebGLRenderer`, two `PerspectiveCamera`s and two
`ShaderMaterial`s are still retained per mount of the die. Ruled out by
experiment: the textures (fixed, counts flat), our own context-lost listener
(removing it changed nothing), and mounting the `Canvas` unconditionally rather
than after the texture state update (changed nothing). `gl.dispose()` is
confirmed to run once per cycle, and three's `dispose()` does remove its own
listeners in 0.185.1 — so the retainer is upstream of our code, most likely
R3F's root teardown. `gl.forceContextLoss()` made no measurable difference in
either direction and was left out.

Production impact, measured over 40 navigations: no visual degradation (all
three canvases produce byte-identical output at cycle 40), no page errors, but
one recovered `THREE.WebGLRenderer: Context Lost` per cycle as the browser
reclaims the retained context. Tolerable, not correct. Next step would be a
minimal reproduction against `@react-three/fiber` upstream rather than more
guessing in this repo.

Note on tooling: `HeapProfiler` class names are minified in the production
build (`object:dl`), so this analysis has to be run against `pnpm dev`.

---

## 8. Phase 3 outcome and its one accepted limitation

The prerender works and delivers what it was for: 10 static documents, each with real
copy, its own `lang`, its own self-referential canonical, reciprocal hreflang and a
generated sitemap. A crawler that does not run JavaScript now gets between 700 and 3400
characters of the correct language instead of zero.

**We do NOT hydrate that markup.** `src/main.tsx` uses `createRoot`, not
`hydrateRoot`, deliberately. TanStack Router's client always wraps route matches in
`<Suspense>` while React's `renderToString` takes the branch that does not, so the two
trees differ structurally and `hydrateRoot` discards the document anyway (React #418)
while logging an error on every page load. Four attempts to reconcile them failed and
are recorded so nobody repeats them:

1. Stripping the CSP-blocked `scrollRestoration` bootstrap from the HTML — that tag is
   part of the React tree, so removing it *caused* a mismatch. `scrollRestoration` is
   now off instead, which costs us scroll position when returning to the home page.
2. `await router.load()` before hydrating — resolves loaders, not lazy components.
3. `autoCodeSplitting: false` — no effect on the wrapper. Kept off anyway, for a
   different reason: it prevents a blank Suspense fallback flashing over prerendered
   content.
4. `ssr: {}` on the router and `wrapInSuspense: true` on every route — moved the
   mismatch one level deeper rather than removing it.

The cost is that React re-renders instead of adopting: prerendered pixels are on screen
immediately, then the identical tree replaces them. For a marketing site with no
interactive state to preserve that is acceptable. Revisit if Router gains a supported
prerender path, or if adopting TanStack Start ever becomes worth the CSP nonce work
(its `ssr` option takes a `nonce`, which is the intended escape hatch).

### Trailing slashes bit twice

Worth stating because both instances were invisible in German. The prerendered files
live at `/en/career/index.html`, so a static host serves them for the slashed URL,
while the routes and canonicals use the unslashed form.

- `LocaleSwitcher` fed the raw pathname to `localizeHref`, producing `href="/team"` in
  the HTML and `href="/team/"` on the client.
- Paraglide's `deLocalizeUrl` could not match the slashed form against its urlPatterns,
  so the client matched no route and rendered an empty page — but ONLY on the three
  routes whose localised segment differs from the German one (`career` vs `karriere`),
  because `/en/team` matches either way. Fixed with `trailingSlash: "never"`.

## 9. Phase 5: what is actually available

Checked against the live site:

| Page | German source | English source |
| --- | --- | --- |
| Team | **HTTP 500 on lipsia.digital** — no source at all | none |
| Karriere | `/karriere/` returns content | none |
| Impressum | `/impressum/` returns content | none |
| Datenschutz | `/datenschutz/` returns content | none |

So Phase 5 cannot be completed by transcription alone. The German Impressum and
Datenschutz could be transcribed verbatim, but they are legally operative texts and
there is no English version to transcribe — machine-translating a privacy policy is not
an acceptable substitute. Team has no source in any language.

All four pages therefore still render `PagePlaceholder`, which states plainly that the
copy is pending rather than looking finished. **Impressum and Datenschutz carrying real
text is a deploy blocker for a German company.**

---

## 10. Post-plan fixes

Found by auditing the finished build rather than by following the plan, so recorded
separately.

**Prerendered content was invisible without JavaScript.** `Reveal` wraps content in a
motion element whose hidden initial state (`opacity: 0`) is baked into the prerendered
HTML — correct while JS is on its way, permanent if it never arrives. Verified: `/team`
with scripting disabled showed its body text and no heading at all. Crawlers were
unaffected (they read the DOM, and the text was there), which is exactly why a
text-extraction check missed it and a screenshot did not.

Fixed with `@media (scripting: none)` in global.css targeting `[data-reveal]`, plus a
`<noscript>` copy for browsers without that media feature. `!important` is required
because motion writes the hidden state inline.

Neither mechanism covers the case where JS is *enabled but fails to load*. Fixing that
would mean rendering Reveal visible and animating down from there, which trades a rare
failure mode for content that visibly disappears before it fades back in on every
normal load. Not worth it.

**No 404.** An unmatched path rendered nav and footer around an empty `<main>`. The root
route now has a `notFoundComponent`, and the build writes a prerendered `404.html` in
the base locale for the static host to serve. Client-side navigation to a bad path
follows the active locale; the static file cannot, since a host has one 404 page and no
way to negotiate a language for it.

**`vite.config.ts` imported `./paraglide.config` without an extension**, which Vite's
`configLoader: 'native'` (a planned default) warns about. Fixed.

The CSP guard now covers `404.html` too — it was checking only the ten route documents.

---

## Part II — Original homepage build (completed)

The plan the site was first built to, kept because its tech-stack rationale, shader
design and performance budget are still the reference for that layer. Section numbers
were shifted by ten on merge; nothing outside this file cited them.

**Original goal:** rebuild <https://lipsia.digital/en/> as a single, high-impact homepage
with an Oxigen-class scroll-driven 3D experience, the LD logo as the hero object.

**Original scope:** homepage only, no subpages, nav/footer links to future routes left as
inert anchors. Superseded by Part I — the site now has five routes in two languages, and
the inert `href="#"` placeholders became real links in Phase 1.

Claims that later work overtook are annotated inline; everything else still holds.

## 11. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Build | **Vite 8** + TypeScript (strict) | Fast HMR, native ESM, first-class code splitting |
| UI | **React 19** | Concurrent rendering; `useTransition` for scene handoff |
| 3D | **three** + **@react-three/fiber** | Declarative scene graph, reconciler-driven |
| 3D helpers | **@react-three/drei** | `Environment`, `useTexture`, `Float`, perf helpers |

> **One correction:** `useTexture` is NOT used and should not be. It suspends inside the
> Canvas, which under StrictMode's double-mount left the die reusing a canvas whose WebGL
> context was already gone — a white rectangle, in dev only. `ClientDice.tsx` loads
> textures with a plain `TextureLoader` before the Canvas renders.
| Post FX | **@react-three/postprocessing** | Bloom / chromatic aberration / vignette |
| Scroll | **native** | No scroll hijacking — smoothing the scroll position reads as lag, not polish. The scene damps its own progress uniform instead. |
| DOM motion | **motion** (Framer Motion 12) | Declarative reveals, respects reduced-motion |
| Lint/Format | **Biome 2** | Single fast toolchain, replaces ESLint + Prettier |
| Package manager | **pnpm 11** | Pinned via `packageManager`; matches the sibling `grundstock-frontend` repo |
| Tests | **Vitest** + Testing Library | Unit tests for hooks/utils/content integrity |
| Deploy | Static SPA + security headers | No server runtime → minimal attack surface |

> **Since superseded (§1.2):** still no server runtime, but the site is now prerendered
> to static HTML at build time rather than shipped as a bare SPA shell.

**Deliberately excluded:** CSS frameworks (hand-authored CSS with custom properties keeps
the WebGL/DOM palette in one source of truth), state libraries (scroll progress lives in a
ref-based store, zero re-renders), analytics/fonts from third-party CDNs (CSP hostility).

---

## 12. The Hero: 3D LD Logo

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

> **Since changed:** the final stage is a per-particle *dissolve* — the mark fades to
> nothing by ~0.88 instead of drifting on as debris behind the later sections.

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

## 13. Page Composition

1. **Hero** — full-viewport canvas. `We bring visions to life` + service triad, CTAs.
2. **Fields of Competence** — Software Engineering / CRM System / IT Consulting.
3. **Services** — Websites & Webapps / E-Commerce / Custom Applications / Enterprise Platforms.
4. **Technologies & Digital Competencies** — narrative copy + animated counters (30+ experts, 10+ languages).
5. **Clients** — `who place their trust in us`; marquee of client marks.

   > **Since changed:** the marquee became a draggable 15-sided die, one client logo per
   > face (`src/three/ClientDice.tsx`, `polyhedron.ts`). `Marquee.tsx` no longer exists.
6. **CTA** — `With us you can grow.`
7. **Footer** — quick links, contact (Reichsstraße 1-9, 04109 Leipzig · info@lipsia.digital · 01523 3881705).

All copy is lifted verbatim from the live English site.

> **Since extended (§2 Phase 2):** German is now the base locale, transcribed verbatim
> from lipsia.digital, with English alongside it. Copy lives in `messages/{de,en}.json`.

---

## 14. Architecture

```
src/
├── main.tsx, router.tsx, entry-server.tsx, routes/
├── content/          site.ts            ← single source of truth for all copy (typed, frozen)
├── styles/           tokens.css, global.css
├── three/
│   ├── Scene.tsx                        ← canvas root, DPR + perf policy
│   ├── LogoParticles.tsx                ← THE hero object (team lead)
│   ├── logoGeometry.ts                  ← SVG → extrude → sample
│   ├── shaders/logoShader.ts             ← GLSL as tagged template strings
│   ├── ParticleField.tsx, Backdrop.tsx  ← ambient depth layers
│   └── Effects.tsx                      ← postprocessing chain
├── scroll/           ScrollProvider.tsx, useScrollProgress.ts   ← native scroll, ref-based
├── components/       Nav, Hero, Competence, Services, Tech, Clients, CTA, Footer
├── components/ui/    Reveal, Counter, Seo, SiteLink, LocaleSwitcher, ...
└── lib/              capabilities.ts, useReducedMotion.ts, ErrorBoundary.tsx
```

**Key invariant:** scroll progress is distributed via **ref + subscriber callbacks**, never
React state. DOM reveals use IntersectionObserver; the 3D scene reads the ref inside
`useFrame`. Zero scroll-driven re-renders.

---

## 15. Security & Best Practices

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

> **Note:** the Open Graph card was declared `summary_large_image` with no image at all
> until Phase 0 added one. See §3 Phase 0.

---

## 16. Team & Work Split

Files are partitioned so no two agents write the same path.

| Role | Owns |
|---|---|
| **Lead** (me) | Scaffold, tokens, types, `LogoParticles` + shaders + `logoGeometry`, `Scene`, integration, final review |
| **Senior A** (sonnet) | Scroll system (provider, progress store), `ParticleField`, `Backdrop`, `Effects`, camera rig |
| **Senior B** (sonnet) | All DOM sections + `Reveal`/`Counter`/`Marquee`, responsive CSS, a11y |
| **Junior 1** (haiku) | Repo hygiene: `.gitignore`, `biome.json`, `tsconfig`, README, LICENSE, `_headers`, `.env.example` |
| **Junior 2** (haiku) | `content/site.ts` (verbatim copy), client marks, `Seo` component + JSON-LD |
| **Junior 3** (haiku) | `capabilities.ts`, `useReducedMotion`, `ErrorBoundary`, `Loader` |

Senior A reviews Junior 3's work; Senior B reviews Junior 2's. Lead reviews both seniors
and the hero shader work personally.
