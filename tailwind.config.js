/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f6912d',
          blue: '#53cfdd',
          yellow: '#fddd00',
          pink: '#e96a6a',
          daylight: '#fffdf0',
          butter: '#ffeec6',
          black: '#1a1a1a',
        },
      },
      fontFamily: {
        heading: ['var(--font-passion-one)', 'sans-serif'],
        body: ['var(--font-noto-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
