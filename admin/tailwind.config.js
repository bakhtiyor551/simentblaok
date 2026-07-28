/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f7f2',
          100: '#e4ecdf',
          200: '#c9d9bf',
          300: '#a3be94',
          400: '#7a9f6a',
          500: '#5b824c',
          600: '#46673b',
          700: '#385230',
          800: '#2f4229',
          900: '#283724',
          950: '#141e12',
        },
        sand: {
          50: '#faf8f4',
          100: '#f3efe6',
          200: '#e6dcc8',
        },
      },
      fontFamily: {
        display: ['"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
