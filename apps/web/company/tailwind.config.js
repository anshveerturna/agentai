/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      transitionDuration: {
        'theme': 'var(--theme-transition-duration)',
      },
      transitionTimingFunction: {
        'theme': 'var(--theme-transition-timing)',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.theme-transition': {
          'transition-property': 'background-color, color, border-color, fill, stroke, opacity, box-shadow',
          'transition-duration': 'var(--theme-transition-duration)',
          'transition-timing-function': 'var(--theme-transition-timing)',
        },
        '.theme-transition-transform': {
          'transition-property': 'background-color, color, border-color, fill, stroke, opacity, box-shadow, transform',
          'transition-duration': 'var(--theme-transition-duration)',
          'transition-timing-function': 'var(--theme-transition-timing)',
        },
      })
    }
  ],
};
