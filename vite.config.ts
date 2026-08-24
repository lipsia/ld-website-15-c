import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	// Consume the `#/*` alias straight from tsconfig instead of duplicating it here.
	resolve: { tsconfigPaths: true },
	plugins: [react()],
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
