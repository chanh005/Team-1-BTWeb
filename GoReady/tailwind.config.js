/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './admin/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#548dd7',
          50: '#f0f5fc',
          100: '#dbe8f7',
          200: '#b7d0ef',
          300: '#8fb5e5',
          400: '#6ea0dd',
          500: '#548dd7',
          600: '#3d72bb',
          700: '#325c98',
          800: '#2a4b7c',
          900: '#243f65',
        },
        accent: {
          DEFAULT: '#87EDFF',
          light: '#c3f7ff',
          dark: '#4cd3ec',
        },
        cream: {
          DEFAULT: '#FBFFD6',
          dark: '#f0f5b0',
        },
        surface: '#f8fafc',
      },
      fontFamily: {
        heading: ['"Outfit"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 30px -8px rgba(84,141,215,0.25)',
        soft: '0 4px 16px -4px rgba(15,23,42,0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        fadeIn: 'fadeIn .25s ease-out',
        slideUp: 'slideUp .35s ease-out',
        scaleIn: 'scaleIn .2s ease-out',
      },
    },
  },
  plugins: [],
};
