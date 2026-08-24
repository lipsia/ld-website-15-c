import type React from 'react';

interface StaticFallbackProps {
  className?: string;
}

/**
 * StaticFallback component renders when WebGL is unavailable or reduced motion is enabled.
 * Displays the LD logo with a soft radial-gradient glow built from design tokens.
 * Positioned to sit where the 3D logo would: fixed, centered, behind the content.
 */
export function StaticFallback({ className }: StaticFallbackProps): React.ReactElement {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 'var(--z-canvas)' as unknown as number,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  // Radial gradient glow using brand tokens: center violet fading to deep surface.
  const glowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at center, rgba(95, 39, 212, 0.15) 0%, rgba(30, 213, 164, 0.05) 30%, var(--surface-0) 100%)',
    pointerEvents: 'none',
  };

  const logoContainerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const logoStyle: React.CSSProperties = {
    width: '120px',
    height: '120px',
    maxWidth: '100%',
    maxHeight: '100%',
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={glowStyle} />
      <div style={logoContainerStyle}>
        <img
          src="/assets/ld-logo.svg"
          alt=""
          aria-hidden="true"
          loading="eager"
          width={120}
          height={120}
          style={logoStyle}
        />
      </div>
    </div>
  );
}
