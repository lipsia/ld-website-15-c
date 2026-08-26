import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { paraglideCompilerOptions } from "./paraglide.config";

export default defineConfig({
	// Consume the `#/*` alias straight from tsconfig instead of duplicating it here.
	resolve: { tsconfigPaths: true },
	plugins: [
		// Generates src/paraglide/ from messages/*.json. Options come from
		// paraglide.config.ts so the plugin and scripts/compile-i18n.ts cannot drift.
		paraglideVitePlugin(paraglideCompilerOptions),
		// Must precede plugin-react: it generates routeTree.gen.ts from src/routes/,
		// and react() would otherwise transform the stale tree on a cold start.
		//
		// autoCodeSplitting is OFF deliberately. Every document is prerendered, so the
		// visitor is already looking at the finished page when the JS arrives; a lazily
		// imported route component makes the router render its Suspense fallback (null)
		// over that content for a frame, i.e. a blank flash where there was a page.
		// The route components are small — the heavy chunk is `three`, which is lazily
		// imported on its own and unaffected.
		tanstackRouter({ target: "react", autoCodeSplitting: false }),
		react(),
	],
	build: {
		target: "es2022",
		sourcemap: false,
		cssMinify: true,
		// three + the R3F stack dominate the bundle; isolating them lets the
		// DOM shell paint from a small critical chunk while WebGL streams in.
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules")) {
						if (id.includes("three") || id.includes("postprocessing")) return "three";
						if (id.includes("react")) return "react";
						return "vendor";
					}
					return undefined;
				},
			},
		},
		chunkSizeWarningLimit: 900,
	},
	server: { port: 5173, strictPort: false },
	preview: { port: 4173 },
});
