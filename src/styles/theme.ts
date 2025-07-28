// Design System Theme Configuration
// EmotionベースのCSS-in-JSテーマシステム

export const theme = {
  // Color System - 既存のCSS変数と統一
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // メイン
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af', // ダーク
      900: '#1e3a8a',
    },
    
    // セマンティックカラー
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    
    // ニュートラルカラー
    neutral: {
      white: '#ffffff',
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151', // メインテキスト
        800: '#1f2937',
        900: '#111827'
      },
      black: '#000000'
    }
  },
  
  // Typography System
  typography: {
    fonts: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace'
    },
    
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem'  // 60px
    },
    
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    
    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8
    }
  },
  
  // Spacing System (4px base unit)
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
    32: '8rem',    // 128px
    40: '10rem',   // 160px
    48: '12rem',   // 192px
    56: '14rem',   // 224px
    64: '16rem'    // 256px
  },
  
  // Border Radius
  radii: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px'
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  
  // Gradients - 既存のグラデーション統一
  gradients: {
    hero: 'linear-gradient(135deg, #ff6b35 0%, #f35627 100%)',
    primary: 'linear-gradient(135deg, #ff6b35 0%, #f35627 100%)',
    card: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
    button: 'linear-gradient(135deg, #ff6b35 0%, #f35627 100%)'
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Z-index scale
  zIndices: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  },
  
  // Layout
  layout: {
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    }
  },
  
  // Animation & Transition
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out'
  }
} as const;

// Theme types for TypeScript
export type Theme = typeof theme;

// Color helper functions
export const getColor = (path: string, theme: Theme) => {
  const keys = path.split('.');
  let value: any = theme.colors;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value || path;
};

// Responsive helper
export const media = {
  sm: `@media (min-width: ${theme.breakpoints.sm})`,
  md: `@media (min-width: ${theme.breakpoints.md})`,
  lg: `@media (min-width: ${theme.breakpoints.lg})`,
  xl: `@media (min-width: ${theme.breakpoints.xl})`,
  '2xl': `@media (min-width: ${theme.breakpoints['2xl']})`
};

export default theme;