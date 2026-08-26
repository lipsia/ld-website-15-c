// Compiles src/paraglide/ with the exact options the vite plugin uses, so a fresh
// clone or a CI run can typecheck before ever starting vite. Run from the repo root;
// needs Node >= 23.6 for native TypeScript execution (.nvmrc pins 24).
import { compile } from "@inlang/paraglide-js";
import { paraglideCompilerOptions } from "../paraglide.config.ts";

await compile(paraglideCompilerOptions);
