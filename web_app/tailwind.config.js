/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Atmosphere OS Slate Surfaces
        'background': '#0b1326',
        'surface': '#0b1326',
        'surface-dim': '#0b1326',
        'surface-bright': '#31394d',
        'surface-container-lowest': '#060e20',
        'surface-container-low': '#131b2e',
        'surface-container': '#171f33',
        'surface-container-high': '#222a3d',
        'surface-container-highest': '#2d3449',
        'surface-variant': '#2d3449',
        
        // Text & Outlines
        'on-surface': '#dae2fd',
        'on-surface-variant': '#bcc9cd',
        'on-background': '#dae2fd',
        'outline': '#869397',
        'outline-variant': '#3d494c',
        
        // Thermal Cryogenic Cyan (Cooling)
        'primary': '#4cd7f6',
        'primary-container': '#06b6d4',
        'on-primary': '#003640',
        'on-primary-container': '#00424f',
        'primary-fixed': '#acedff',
        'primary-fixed-dim': '#4cd7f6',
        'surface-tint': '#4cd7f6',
        
        // Thermal Radiant Amber (Heating)
        'secondary': '#ffb95f',
        'secondary-container': '#ee9800',
        'on-secondary': '#472a00',
        'on-secondary-container': '#5b3800',
        'secondary-fixed': '#ffddb8',
        'secondary-fixed-dim': '#ffb95f',
        
        // Eco & Alerts
        'tertiary': '#10b981',
        'tertiary-container': '#059669',
        'error': '#ffb4ab',
        'error-container': '#93000a'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.4)',
        'glow-amber': '0 0 25px -4px rgba(245, 158, 11, 0.35)',
        'glow-thumb': '0 0 12px 2px rgba(76, 215, 246, 0.8)'
      }
    },
  },
  plugins: [],
}
