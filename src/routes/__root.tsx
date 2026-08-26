import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Footer } from "#/components/Footer";
import { Nav } from "#/components/Nav";
import { m } from "#/paraglide/messages";
import { ScrollProvider } from "#/scroll/ScrollProvider";

/**
 * The shell every page shares: scroll store, skip link, nav, footer.
 *
 * Deliberately contains NO 3D. The WebGL scene is mounted by the home route alone —
 * both the LD logo (LogoParticles) and the ambient dust shell (ParticleField) are
 * home-only, so team, career and the legal pages render on flat --surface-0 with no
 * canvas, no WebGL context and no render loop. See docs/PLAN.md §1.3.
 */
function RootLayout() {
	return (
		<ScrollProvider>
			<a className="skip-link" href="#main">
				{m.skip_to_content()}
			</a>

			<Nav />

			<main id="main">
				<Outlet />
			</main>

			<Footer />
		</ScrollProvider>
	);
}

export const Route = createRootRoute({ component: RootLayout });
