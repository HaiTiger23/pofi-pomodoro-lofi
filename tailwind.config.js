/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{vue,js}', './node_modules/flowbite/**/*.js'],
  darkMode: 'media',
  theme: { extend: {} },
  plugins: [require('flowbite/plugin')]
};
