/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Asana-inspired sophisticated neutrals
        neutral: {
          50: '#FAFBFC',
          100: '#F6F8FA',
          200: '#E9ECEF',
          300: '#DFE3E8',
          400: '#C1C7CD',
          500: '#9CA3AF',
          600: '#6B7280',
          700: '#4B5563',
          800: '#2D3748',
          900: '#1A202C',
        },
        // Warm coral accent (replaces purple/violet)
        accent: {
          50: '#FFF5F5',
          100: '#FFE3E3',
          200: '#FFC9C9',
          300: '#FFA8A8',
          400: '#FF8787',
          500: '#FF6B6B', // Primary accent
          600: '#FA5252',
          700: '#F03E3E',
          800: '#E03131',
          900: '#C92A2A',
        },
        // Soft teal for success states
        success: {
          50: '#E6FCF5',
          100: '#C3FAE8',
          200: '#96F2D7',
          300: '#63E6BE',
          400: '#38D9A9',
          500: '#20C997',
          600: '#12B886',
          700: '#0CA678',
          800: '#099268',
          900: '#087F5B',
        },
        // Muted amber for warnings
        warning: {
          50: '#FFF9E6',
          100: '#FFF3BF',
          500: '#FFD43B',
          600: '#FAB005',
          700: '#F08C00',
        },
        // Keep subtle versions for existing functionality
        gray: {
          50: '#FAFBFC',
          100: '#F6F8FA',
          200: '#E9ECEF',
          300: '#DFE3E8',
          400: '#C1C7CD',
          500: '#9CA3AF',
          600: '#6B7280',
          700: '#4B5563',
          800: '#2D3748',
          900: '#1A202C',
        },
        // Keep minimal blue for info (not primary)
        blue: {
          50: '#E7F5FF',
          100: '#D0EBFF',
          500: '#339AF0',
          600: '#228BE6',
          700: '#1C7ED6',
        },
        // Glassmorphism backgrounds
        glass: {
          white: 'rgba(255, 255, 255, 0.7)',
          light: 'rgba(255, 255, 255, 0.5)',
          dark: 'rgba(0, 0, 0, 0.3)',
          darker: 'rgba(0, 0, 0, 0.5)',
        },
      },
      backgroundColor: {
        'glass-white': 'rgba(255, 255, 255, 0.7)',
        'glass-light': 'rgba(255, 255, 255, 0.5)',
        'glass-dark': 'rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      backdropSaturate: {
        DEFAULT: '100%',
        180: '180%',
        200: '200%',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.04), 0 12px 24px rgba(0, 0, 0, 0.06)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.06), 0 20px 40px rgba(0, 0, 0, 0.08)',
        'xl': '0 12px 24px rgba(0, 0, 0, 0.08), 0 32px 64px rgba(0, 0, 0, 0.10)',
        '2xl': '0 16px 32px rgba(0, 0, 0, 0.10), 0 48px 96px rgba(0, 0, 0, 0.12)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass-lg': '0 12px 48px rgba(0, 0, 0, 0.16)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        'none': 'none',
      },
      borderRadius: {
        'none': '0',
        'sm': '6px',
        DEFAULT: '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      borderWidth: {
        DEFAULT: '1px',
        '0': '0',
        '2': '2px',
        '3': '3px',
        '4': '4px',
      },
      spacing: {
        '18': '4.5rem',  // 72px
        '22': '5.5rem',  // 88px
        '26': '6.5rem',  // 104px
        '30': '7.5rem',  // 120px
        '34': '8.5rem',  // 136px
        '38': '9.5rem',  // 152px
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'sm': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'base': ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'lg': ['17px', { lineHeight: '28px', fontWeight: '500' }],
        'xl': ['20px', { lineHeight: '30px', fontWeight: '600' }],
        '2xl': ['24px', { lineHeight: '36px', fontWeight: '600' }],
        '3xl': ['30px', { lineHeight: '40px', fontWeight: '700' }],
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'smooth-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        '250': '250ms',
        '350': '350ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Glassmorphism blob animations
        'blob': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 300ms ease-out forwards',
        'slide-up': 'slide-up 300ms ease-out forwards',
        'slide-down': 'slide-down 300ms ease-out forwards',
        'scale-in': 'scale-in 200ms ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        // Glassmorphism animations
        'blob': 'blob 7s infinite',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
