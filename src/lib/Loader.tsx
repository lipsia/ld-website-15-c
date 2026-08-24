"use client";

import type React from "react";
import { useReducedMotion } from "./useReducedMotion";

interface LoaderProps {
	label?: string;
}

/**
 * Loader component shown while the lazily-loaded WebGL chunk streams in.
 * Minimal, brand-appropriate, centered indicator.
 * Respects reduced motion: renders static state when motion is disabled.
 */
export function Loader({ label = "Loading experience" }: LoaderProps): React.ReactElement {
	const reducedMotion = useReducedMotion();

	// Inline styles for layout and positioning.
	const containerStyle: React.CSSProperties = {
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		background: "var(--surface-0)",
		zIndex: 999,
	};

	const contentStyle: React.CSSProperties = {
		textAlign: "center",
	};

	const spinnerStyle: React.CSSProperties = {
		width: "2rem",
		height: "2rem",
		marginBottom: "1rem",
		borderRadius: "50%",
		background: reducedMotion
			? "var(--ld-violet)"
			: "conic-gradient(var(--ld-violet), var(--accent), var(--ld-violet))",
		opacity: reducedMotion ? 1 : 0.8,
	};

	const labelStyle: React.CSSProperties = {
		fontSize: "var(--step--1)",
		color: "var(--text-mid)",
		fontFamily: "system-ui, -apple-system, sans-serif",
	};

	const srOnlyStyle: React.CSSProperties = {
		position: "absolute",
		width: "1px",
		height: "1px",
		padding: 0,
		margin: "-1px",
		overflow: "hidden",
		clip: "rect(0, 0, 0, 0)",
		whiteSpace: "nowrap",
		borderWidth: 0,
	};

	return (
		<>
			<style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .loader-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
			<div style={containerStyle} role="status" aria-live="polite" aria-label={label}>
				<div style={contentStyle}>
					<div className={reducedMotion ? "" : "loader-spinner"} style={spinnerStyle} />
					<p style={labelStyle}>{label}</p>
					<p style={srOnlyStyle}>Loading the experience, please wait.</p>
				</div>
			</div>
		</>
	);
}
