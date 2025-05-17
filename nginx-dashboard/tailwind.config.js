/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-color) / <alpha-value>)',
        foreground: 'rgb(var(--text-color) / <alpha-value>)',
        
        card: 'rgb(var(--card-bg) / <alpha-value>)',
        'card-foreground': 'rgb(var(--card-text) / <alpha-value>)',
        
        primary: 'rgb(var(--primary-color) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--primary-text) / <alpha-value>)',
        
        secondary: 'rgb(var(--secondary-bg) / <alpha-value>)',
        'secondary-foreground': 'rgb(var(--secondary-text) / <alpha-value>)',
        
        muted: 'rgb(var(--muted-bg) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-text) / <alpha-value>)',
        
        accent: 'rgb(var(--accent-bg) / <alpha-value>)',
        'accent-foreground': 'rgb(var(--accent-text) / <alpha-value>)',
        
        destructive: 'rgb(var(--destructive-color) / <alpha-value>)',
        'destructive-foreground': 'rgb(255 255 255 / <alpha-value>)',
        
        success: 'rgb(var(--success-color) / <alpha-value>)',
        'success-foreground': 'rgb(255 255 255 / <alpha-value>)',
        
        warning: 'rgb(var(--warning-color) / <alpha-value>)',
        'warning-foreground': 'rgb(255 255 255 / <alpha-value>)',
        
        info: 'rgb(var(--info-color) / <alpha-value>)',
        'info-foreground': 'rgb(255 255 255 / <alpha-value>)',
        
        border: 'rgb(var(--border-color) / <alpha-value>)',
        input: 'rgb(var(--border-color) / <alpha-value>)',
        ring: 'rgb(var(--primary-color) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}