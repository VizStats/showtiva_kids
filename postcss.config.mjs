// Tailwind v4 runs as a PostCSS plugin and is configured in CSS: there is no
// tailwind.config.js. Tokens, keyframes and base styles live in app/globals.css.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
