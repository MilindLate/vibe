/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FE2C55', hover: '#E6254A', light: '#FF6B81' },
        vibe: { dark: '#121212', card: '#1C1C1C', border: '#2F2F2F' },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
        'heart-burst': 'heartBurst 0.6s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        heartBurst: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        bounceIn: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.3)' },
          '60%': { transform: 'scale(0.9)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
