// Centralized theme configuration
export const themeConfig = {
  light: {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      gradient: 'from-slate-50 via-white to-slate-50',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
    },
    border: {
      default: '#e2e8f0',
      hover: '#cbd5e1',
      focus: '#3b82f6',
    },
    card: {
      background: '#ffffff',
      border: '#e2e8f0',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      hoverShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    button: {
      primary: 'from-sky-500 to-indigo-600',
      primaryHover: 'from-sky-600 to-indigo-700',
      secondary: 'bg-slate-100',
      secondaryHover: 'bg-slate-200',
    },
  },
  dark: {
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      gradient: 'from-slate-950 via-slate-900 to-slate-950',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      inverse: '#0f172a',
    },
    border: {
      default: '#334155',
      hover: '#475569',
      focus: '#3b82f6',
    },
    card: {
      background: '#1e293b',
      border: '#334155',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
      hoverShadow: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
    },
    button: {
      primary: 'from-sky-500 to-indigo-600',
      primaryHover: 'from-sky-600 to-indigo-700',
      secondary: 'bg-slate-800',
      secondaryHover: 'bg-slate-700',
    },
  },
} as const;

