/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:      '#7C6FFF',
        primaryHover: '#9B8FFF',
        orange:       '#FF6B35',
        teal:         '#00D4AA',
        darkBg:       '#0D0D14',
        darkCard:     '#161622',
        darkBorder:   '#2A2A3D',
        darkMuted:    '#1E1E2E',
        textPrimary:  '#FFFFFF',
        textSecond:   '#8B8BA8',
        textMuted:    '#4A4A6A',
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
}