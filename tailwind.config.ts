import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          violet: '#8b5cf6',
          teal: '#14b8a6',
        },
        app: {
          bg: '#ffffff',
          muted: '#f8fafc',
        },
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        input: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
