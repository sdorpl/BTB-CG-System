/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}",
    "./src/**/*.{html,js}",
    "./renderer.js",
    "./app.js"
  ],
  theme: {
    extend: {
      colors: {
        'gray-850': '#1a2030',
        'gray-925': '#0d1320',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: ["dark", "dracula", "synthwave"], 
  }
}
