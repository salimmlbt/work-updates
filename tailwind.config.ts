
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        // Slide In
        'slide-in-right': { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'slide-in-left':  { '0%': { transform: 'translateX(-100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'slide-in-top':   { '0%': { transform: 'translateY(-100%)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-in-bottom':{ '0%': { transform: 'translateY(100%)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      
        // Slide Out
        'slide-out-right': { '0%': { transform: 'translateX(0)', opacity: '1' }, '100%': { transform: 'translateX(100%)', opacity: '0' } },
        'slide-out-left':  { '0%': { transform: 'translateX(0)', opacity: '1' }, '100%': { transform: 'translateX(-100%)', opacity: '0' } },
        'slide-out-top':   { '0%': { transform: 'translateY(0)', opacity: '1' }, '100%': { transform: 'translateY(-100%)', opacity: '0' } },
        'slide-out-bottom':{ '0%': { transform: 'translateY(0)', opacity: '1' }, '100%': { transform: 'translateY(100%)', opacity: '0' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 300ms ease-out forwards',
        'slide-in-left':  'slide-in-left 300ms ease-out forwards',
        'slide-in-top':   'slide-in-top 300ms ease-out forwards',
        'slide-in-bottom':'slide-in-bottom 300ms ease-out forwards',
        'slide-out-right':'slide-out-right 300ms ease-in-out forwards',
        'slide-out-left': 'slide-out-left 300ms ease-in-out forwards',
        'slide-out-top':  'slide-out-top 300ms ease-in-out forwards',
        'slide-out-bottom':'slide-out-bottom 300ms ease-in-out forwards',
      },
      
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
