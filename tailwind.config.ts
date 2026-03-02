import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#1a2035',
        surface: '#0f1624',
        card: '#151d2e',
        accent: '#4f8ef7',
        'accent-hover': '#6ba3f9',
        'text-primary': '#ffffff',
        'text-secondary': '#8b9ab5',
        'text-muted': '#5a6882',
        border: '#242f4a',
        'border-light': '#2e3d5e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
