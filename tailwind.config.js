/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <--- ¡ESTA LÍNEA ES CRÍTICA!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}