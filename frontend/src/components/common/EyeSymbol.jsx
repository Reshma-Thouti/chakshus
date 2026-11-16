/**
 * components/common/EyeSymbol.jsx
 *
 * Precision Ophthalmic Eye Symbol (SVG).
 * Represents vision, retina, and optics for चक्षुस् (Chakshus).
 */

import React from 'react';

export default function EyeSymbol({ size = 24, color = 'var(--remidio-cyan, #00C2CB)', strokeWidth = 1.8, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Outer Eye Geometry / Palpebral Aperture */}
      <path
        d="M2 12C4.8 6.8 8.2 4.2 12 4.2C15.8 4.2 19.2 6.8 22 12C19.2 17.2 15.8 19.8 12 19.8C8.2 19.8 4.8 17.2 2 12Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Iris Ring */}
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Central Pupil / Optical Focus Point */}
      <circle
        cx="12"
        cy="12"
        r="1.8"
        fill={color}
      />
      {/* Optical Reflection Accent */}
      <path
        d="M10.2 9.8C10.8 9.3 11.5 9.1 12.3 9.2"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
