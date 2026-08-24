# Lipsia Digital — Homepage

A single-page, scroll-driven WebGL experience for lipsia.digital. The centrepiece is the LD logo rendered as a GPU particle system that assembles and disperses as you scroll through five distinct morphing states: nebula, convergence, crystallised, dissection, and dispersal.

## Tech Stack

| Concern | Package | Version |
|---|---|---|
| Build | Vite | 8.2.2 |
| UI Framework | React | 19.2.8 |
| UI Runtime | React DOM | 19.2.8 |
| 3D Graphics | three.js | 0.185.1 |
| React 3D Renderer | @react-three/fiber | 9.7.0 |
| 3D Utilities | @react-three/drei | 10.7.8 |
| Post-Processing | @react-three/postprocessing | 3.1.0 |
| Post-FX Library | postprocessing | 6.39.4 |
| Smooth Scroll | lenis | 1.3.26 |
| DOM Motion | motion | 13.1.1 |
| Type Checker | TypeScript | 7.0.2 |
| Linter/Formatter | Biome | 2.5.10 |
| Test Framework | Vitest | 4.1.11 |
| Test Utilities | @testing-library/react | 16.3.2 |

## Getting Started

### Prerequisites

- **Node.js** >= 20.19 (see `.nvmrc`)
- pnpm 11.23+ (the repo pins it via the `packageManager` field; `corepack enable` picks it up automatically)

### Installation

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The app launches on `http://localhost:5173` with HMR enabled.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Start dev server with HMR |
| `pnpm build` | Type-check and build for production (outputs to `dist/`) |
| `pnpm preview` | Preview the production build locally |
| `pnpm lint` | Run the Biome linter |
| `pnpm check` | Run Biome lint + format checks (what CI runs) |
| `pnpm check:fix` | Run Biome checks and apply safe fixes |
| `pnpm format` | Format code with Biome |
| `pnpm typecheck` | Run TypeScript type checker in strict mode |
| `pnpm test` | Run all tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm audit` | Audit production dependencies for security issues |

## Project Structure

```
src/
├── main.tsx                           Entry point
├── App.tsx                            Root component
├── content/
│   └── site.ts                        Typed copy and constants
├── styles/
│   ├── tokens.css                     Design tokens (colors, spacing)
│   └── global.css                     Global styles
├── three/
│   ├── Scene.tsx                      Canvas root, DPR policy
│   ├── LogoParticles.tsx              Hero particle system
│   ├── logoGeometry.ts                SVG → extrude → sample pipeline
│   ├── shaders/
│   │   ├── logo.vert                  Vertex shader (particle animation)
│   │   └── logo.frag                  Fragment shader (color/alpha)
│   ├── ParticleField.tsx              Ambient particle layers
│   ├── Backdrop.tsx                   Depth environment
│   └── Effects.tsx                    Post-processing chain
├── scroll/
│   ├── ScrollProvider.tsx             Lenis + RAF setup
│   └── useScrollProgress.ts           Scroll progress ref store
├── components/
│   ├── Nav.tsx                        Navigation header
│   ├── Hero.tsx                       Hero section with CTA
│   ├── Competence.tsx                 Fields of competence
│   ├── Services.tsx                   Service offerings
│   ├── Tech.tsx                       Technologies & counters
│   ├── Clients.tsx                    Client marquee
│   ├── CTA.tsx                        Call-to-action section
│   └── Footer.tsx                     Footer with contact
├── components/ui/
│   ├── Reveal.tsx                     Scroll-triggered reveal
│   ├── Counter.tsx                    Animated number counter
│   ├── Marquee.tsx                    Scrolling marquee
│   └── Seo.tsx                        Head metadata
├── lib/
│   ├── capabilities.ts                Device capability detection
│   ├── useReducedMotion.ts            prefers-reduced-motion hook
│   └── ErrorBoundary.tsx              React error boundary
└── index.html                         HTML root
```

## Architecture Notes

**Scroll Progress**: Rather than triggering re-renders on every scroll event, scroll progress is managed via a ref-based store (`src/scroll/scrollStore.ts`) with subscriber callbacks. The canvas reads the progress inside `useFrame`, and DOM reveals use IntersectionObserver. This design achieves 60fps scroll without frame drops from React state updates.

**3D Scene**: The hero particle system is a single GPU-driven draw call using GLSL shaders and instanced rendering. Particle positions, morphing, and color are computed on the GPU; the CPU updates one `uScroll` uniform per frame.

**Fixed Canvas**: The WebGL canvas is fixed behind translucent DOM sections using `pointer-events: none` so interactive elements remain accessible.

## Accessibility

- **Reduced Motion**: When `prefers-reduced-motion: reduce` is active, smooth scroll is disabled, particle animation is frozen, and a static SVG fallback of the logo renders.
- **Semantic HTML**: All sections use correct landmark roles (`<nav>`, `<main>`, `<footer>`, `<section>` with `aria-label`).
- **Skip Link**: A visually-hidden skip-to-main link is available to keyboard users.
- **Focus Management**: All interactive elements have visible focus rings (high-contrast outline).
- **Contrast**: All text meets WCAG AA contrast requirements (4.5:1 for body text, 3:1 for large text).
- **Canvas Decoration**: The WebGL canvas is marked `aria-hidden="true"` since it is purely decorative.

## Security

- **Content Security Policy**: Strict CSP with no external script/style origins, no `unsafe-eval`, no third-party embeds. Matches in both `index.html` meta tag and `public/_headers` for all hosting platforms.
- **Headers**: Production headers set `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera/mic/geo/payment/usb), `Cross-Origin-Opener-Policy: same-origin`, and `X-DNS-Prefetch-Control: off`.
- **No Secrets**: `.env` is not committed; only public build-time vars exist (prefixed `VITE_`).
- **Self-Hosted Assets**: All fonts, images, and stylesheets are served locally. No third-party CDN origins.
- **Audit**: `pnpm audit --prod` runs clean and must pass; dependencies are exact-pinned and lockfile is committed.

## Browser Support

- **Modern evergreen browsers** with WebGL 2.0 support (Chrome, Firefox, Safari 15+, Edge).
- **Graceful fallback**: When WebGL is unavailable or unsupported, a static SVG version of the logo renders instead.
- **Device-aware**: Particle count is tiered (48k desktop, 18k mobile, 0 on reduced-motion), and DPR is clamped to `[1, 2]` with adaptive downgrade below 50fps.

## Deployment

This is a static single-page application (SPA). To deploy:

1. Run `pnpm build` to generate `dist/`.
2. Upload `dist/` to your static hosting platform.
3. **Critical**: Ensure `public/_headers` is deployed:
   - On **Netlify** and **Cloudflare Pages**: The `_headers` file is automatically picked up and applied.
   - On other hosts: Manually configure HTTP headers to match `_headers` (see file for full policy).
4. Configure your host to serve `index.html` on all routes (SPA mode).

The build output is fully self-contained with no external dependencies at runtime.

## License

Copyright (c) 2026 Lipsia Digital. All rights reserved. See `LICENSE` for details.
