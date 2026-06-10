/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F2F1EC',
        surface: '#FFFFFF',
        ink: '#26282B',
        muted: '#7A7E83',
        primary: '#1E5C46',
        amber: '#D9A441',
        him: '#3D5A80',
        her: '#A8466B',
        danger: '#C0492F',
        ok: '#5E8C61',
      },
      fontFamily: {
        golos: ['"Golos Text"', 'sans-serif'],
        unbounded: ['Unbounded', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
      },
      boxShadow: {
        card: '0 1px 3px rgb(38 40 43 / 0.07)',
      },
      maxWidth: {
        app: '480px',
      },
    },
  },
  plugins: [],
};
