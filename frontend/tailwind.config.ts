import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#09090b',
        surface: '#18181b',
        border: '#27272a',
        'text-primary': '#f4f4f5',
        'text-muted': '#a1a1aa',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
} satisfies Config;
