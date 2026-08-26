# Implementation plan — routing, i18n, prerendering

Status: Phases 0-4 done. Phase 5 (content) blocked on sources — see §8. Written 2026-08-26.

Turns the current single-page client-rendered site into a small bilingual
multi-page site that still ships as static files.

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
