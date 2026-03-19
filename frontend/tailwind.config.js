/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg:       '#080B12',
        darkCard:     '#0E1420',
        darkMuted:    '#111827',
        darkBorder:   '#1A2640',
        textSecond:   '#7A8FAD',
        textMuted:    '#3D4F68',
        primary:      '#4F8EF7',
        primaryHover: '#3A7AE8',
        orange:       '#F97316',
        teal:         '#14B8A6',
        gold:         '#F59E0B',
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(26,38,64,0.9)',
        glow:    '0 0 32px rgba(79,142,247,0.2)',
        'glow-sm': '0 0 14px rgba(79,142,247,0.12)',
        orange:  '0 0 20px rgba(249,115,22,0.25)',
      },
    },
  },
  plugins: [],
}
