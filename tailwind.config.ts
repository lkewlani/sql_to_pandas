import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Enforce minimum sizes from design doc
        base: ['1rem', { lineHeight: '1.6' }],         // 16px body
        code: ['0.875rem', { lineHeight: '1.7' }],     // 14px code blocks
      },
    },
  },
  plugins: [],
}

export default config
