import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/scene.css";
import "./styles/sections.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root container #root is missing from index.html");

createRoot(container).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
