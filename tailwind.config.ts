import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FAFAFA',
        'primary-foreground': '#18181B',
        primaryAccent: '#18181B',
        brand: '#FF4017',
        background: {
          DEFAULT: '#111113',
          secondary: '#27272A'
        },
        foreground: '#FAFAFA',
        secondary: '#f5f5f5',
        'secondary-foreground': '#18181B',
        border: 'rgba(var(--color-border-default))',
        accent: '#27272A',
        'accent-foreground': '#FAFAFA',
        muted: '#A1A1AA',
        'muted-foreground': '#71717A',
        destructive: '#E53935',
        'destructive-foreground': '#FAFAFA',
        positive: '#22C55E'
      },
      fontFamily: {
        geist: 'var(--font-geist-sans)',
        dmmono: 'var(--font-dm-mono)'
      },
      borderRadius: {
        xl: '10px'
      }
    }
  },
  plugins: [tailwindcssAnimate]
} satisfies Config
