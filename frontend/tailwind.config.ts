import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        quantum: {
          bg: '#030712',
          panel: '#0f172a',
          border: '#1e293b',
          cyan: '#00f5ff',
          blue: '#0080ff',
          purple: '#8b5cf6',
          orange: '#f97316',
          pink: '#ec4899',
          green: '#22c55e',
          yellow: '#eab308',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
