/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.md",
    "./themes/**/*.html",
    "./assets/**/*.js",
    "./assets/sass/**/*.scss",
    "./*.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1a6fdb',
          orange: '#f07120',
        },
        neutral: {
          dark: '#111827',
          muted: '#6B7280',
          light: '#F9FAFB',
          border: '#E5E7EB',
        }
      },
      fontFamily: {
        heading: ['Poppins', 'DM Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
