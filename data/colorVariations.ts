export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primaryNavy: string;
    primaryBlue: string;
    accentGold: string;
    accentEmerald: string;
    accentRose: string;
    gradientGold: string;
    gradientEmerald: string;
    gradientRose: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
    neutral600: string;
    neutral700: string;
    neutral800: string;
    neutral900: string;
    luxuryGold: string;
    luxuryEmerald: string;
    luxuryRose: string;
  };
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'default',
    name: 'デフォルト（ブルー＆ゴールド）',
    description: '信頼性と高級感を表現するクラシックな配色',
    colors: {
      primaryNavy: '#1e3a5f',
      primaryBlue: '#2563eb',
      accentGold: '#f59e0b',
      accentEmerald: '#10b981',
      accentRose: '#f43f5e',
      gradientGold: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      gradientEmerald: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      gradientRose: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
      neutral100: '#f8fafc',
      neutral200: '#e2e8f0',
      neutral300: '#cbd5e1',
      neutral400: '#94a3b8',
      neutral500: '#64748b',
      neutral600: '#475569',
      neutral700: '#334155',
      neutral800: '#1e293b',
      neutral900: '#0f172a',
      luxuryGold: '#fbbf24',
      luxuryEmerald: '#34d399',
      luxuryRose: '#fb7185'
    }
  },
  {
    id: 'green',
    name: 'グリーン＆ゴールド',
    description: '成長と繁栄を象徴する自然な配色',
    colors: {
      primaryNavy: '#1f3a2e',
      primaryBlue: '#047857',
      accentGold: '#f59e0b',
      accentEmerald: '#10b981',
      accentRose: '#f43f5e',
      gradientGold: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      gradientEmerald: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      gradientRose: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
      neutral100: '#f0fdf4',
      neutral200: '#dcfce7',
      neutral300: '#bbf7d0',
      neutral400: '#86efac',
      neutral500: '#4ade80',
      neutral600: '#22c55e',
      neutral700: '#16a34a',
      neutral800: '#15803d',
      neutral900: '#14532d',
      luxuryGold: '#fbbf24',
      luxuryEmerald: '#34d399',
      luxuryRose: '#fb7185'
    }
  },
  {
    id: 'purple',
    name: 'パープル＆ゴールド',
    description: '洗練された高級感のあるプレミアム配色',
    colors: {
      primaryNavy: '#2d1b4e',
      primaryBlue: '#7c3aed',
      accentGold: '#f59e0b',
      accentEmerald: '#8b5cf6',
      accentRose: '#f43f5e',
      gradientGold: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      gradientEmerald: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      gradientRose: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
      neutral100: '#faf5ff',
      neutral200: '#f3e8ff',
      neutral300: '#e9d5ff',
      neutral400: '#c4b5fd',
      neutral500: '#a78bfa',
      neutral600: '#8b5cf6',
      neutral700: '#7c3aed',
      neutral800: '#6d28d9',
      neutral900: '#581c87',
      luxuryGold: '#fbbf24',
      luxuryEmerald: '#a78bfa',
      luxuryRose: '#fb7185'
    }
  },
  {
    id: 'red',
    name: 'レッド＆ゴールド',
    description: '情熱とエネルギーを表現する力強い配色',
    colors: {
      primaryNavy: '#4c1d1d',
      primaryBlue: '#dc2626',
      accentGold: '#f59e0b',
      accentEmerald: '#ef4444',
      accentRose: '#f43f5e',
      gradientGold: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      gradientEmerald: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      gradientRose: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
      neutral100: '#fef2f2',
      neutral200: '#fecaca',
      neutral300: '#fca5a5',
      neutral400: '#f87171',
      neutral500: '#ef4444',
      neutral600: '#dc2626',
      neutral700: '#b91c1c',
      neutral800: '#991b1b',
      neutral900: '#7f1d1d',
      luxuryGold: '#fbbf24',
      luxuryEmerald: '#f87171',
      luxuryRose: '#fb7185'
    }
  },
  {
    id: 'dark',
    name: 'ダークモード',
    description: 'モダンで洗練されたダークテーマ',
    colors: {
      primaryNavy: '#0f0f0f',
      primaryBlue: '#3b82f6',
      accentGold: '#fbbf24',
      accentEmerald: '#10b981',
      accentRose: '#f43f5e',
      gradientGold: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      gradientEmerald: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      gradientRose: 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
      neutral100: '#1f1f1f',
      neutral200: '#2d2d2d',
      neutral300: '#3d3d3d',
      neutral400: '#4d4d4d',
      neutral500: '#6b7280',
      neutral600: '#9ca3af',
      neutral700: '#d1d5db',
      neutral800: '#e5e7eb',
      neutral900: '#f9fafb',
      luxuryGold: '#fbbf24',
      luxuryEmerald: '#34d399',
      luxuryRose: '#fb7185'
    }
  }
];

export const defaultColorTheme = colorThemes[0]; 