/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0A0B0D',
        'bg-card': '#16181C',
        'bg-elevated': '#1F2125',
        'text-primary': '#F5F5F7',
        'text-secondary': '#A0A0A8',
        'text-tertiary': '#5A5A62',
        'accent': '#00D9A3',
        'accent-soft': 'rgba(0, 217, 163, 0.15)',
        'accent-glow': 'rgba(0, 217, 163, 0.30)',
        'success': '#00D9A3',
        'warning': '#FFB340',
        'danger': '#FF453A',
        'neutral': '#A0A0A8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
