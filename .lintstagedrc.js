export default {
	"*.{ts,tsx,js,jsx,json,jsonc,css}": ["biome check --write --no-errors-on-unmatched"],
	// function form: runs the full typecheck once when any TS file is staged
	"*.{ts,tsx}": () => "pnpm typecheck",
};
