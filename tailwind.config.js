/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // "แสงทอง" (Saengthong Golden Radiance) & Apple Colors
        saengthong: {
          50: '#fffdf5',
          100: '#fff8db',
          200: '#ffecb3',
          300: '#ffd980',
          400: '#f5b041',
          500: '#d97706',  // Warm Amber Gold (แสงทอง)
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        apple: {
          bg: '#f5f5f7',
          surface: '#ffffff',
          dark: '#1d1d1f',
          darker: '#161617',
          black: '#000000',
          gray: {
            50: '#fbfbfd',
            100: '#f5f5f7',
            200: '#e8e8ed',
            300: '#d2d2d7',
            400: '#b0b0b5',
            500: '#86868b',
            600: '#6e6e73',
            700: '#424245',
            800: '#1d1d1f',
            900: '#161617',
          },
          gold: {
            light: '#fbbf24',
            DEFAULT: '#d97706',
            hover: '#b45309',
            dark: '#92400e',
          },
          blue: {
            light: '#2997ff',
            DEFAULT: '#0071e3',
            hover: '#0077ed',
            dark: '#004fc4',
          },
          amber: {
            DEFAULT: '#f56300',
            hover: '#ff6f00',
          },
        },
        // Primary - "แสงทอง" Warm Gold
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',  // Brand Saengthong Gold
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        // Brand - Saengthong Amber Gold
        brand: {
          50: '#fffdf5',
          100: '#fff8db',
          200: '#ffecb3',
          300: '#ffd980',
          400: '#f5b041',
          500: '#d97706',  // Core Brand Gold
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        // Secondary - Warm Desert Titanium / Copper
        secondary: {
          50: '#fff9f5',
          100: '#ffeedb',
          200: '#ffd9b3',
          300: '#ffbf80',
          400: '#ffa142',
          500: '#ea580c',  // Warm Copper Amber
          600: '#c2410c',
          700: '#9a3412',
          800: '#7c2d12',
          900: '#431407',
        },
        // Accent - Radiant Sunrise Gold
        accent: {
          50: '#fffbf0',
          100: '#fff4d9',
          200: '#ffedb3',
          300: '#ffe18c',
          400: '#ffd666',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Neutral - Apple Cool Grays
        neutral: {
          50: '#fbfbfd',
          100: '#f5f5f7',
          200: '#e8e8ed',
          300: '#d2d2d7',
          400: '#b0b0b5',
          500: '#86868b',
          600: '#6e6e73',
          700: '#424245',
          800: '#1d1d1f',
          900: '#161617',
        },
      },
      fontFamily: {
        sans: [
          'Prompt',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tighter: '-0.035em',
        tight: '-0.022em',
        snug: '-0.011em',
        normal: '0em',
      },
      boxShadow: {
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'apple': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'apple-md': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 16px 48px rgba(0, 0, 0, 0.12)',
        'apple-gold': '0 4px 20px rgba(217, 119, 6, 0.25)',
        'apple-gold-lg': '0 10px 30px rgba(217, 119, 6, 0.35)',
        'apple-card': '0 2px 12px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.12)',
        'apple-card-hover': '0 12px 36px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.15)',
        'apple-dark': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      transitionTimingFunction: {
        'apple-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'apple-spring': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
}
