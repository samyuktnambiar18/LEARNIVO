/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0B0A0F',
          surface: '#121118',
          elevated: '#181620',
          hover: '#1F1C2C',
        },
        accent: {
          primary: '#C7FF4A',   // Lime highlight
          secondary: '#8B5CF6', // Violet accent
          pink: '#FF6B9D',      // Supporting pink
          blue: '#3B82F6',
        },
        text: {
          primary: '#F7F5FA',
          secondary: '#A6A1B2',
          muted: '#6E6A78',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(199, 255, 74, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'lime-glow': '0 0 20px rgba(199, 255, 74, 0.15)',
        'violet-glow': '0 0 20px rgba(139, 92, 246, 0.15)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
