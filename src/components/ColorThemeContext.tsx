import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ColorTheme, colorThemes, defaultColorTheme } from '../../data/colorVariations';

interface ColorThemeContextType {
  currentTheme: ColorTheme;
  setCurrentTheme: (themeId: string) => void;
  themes: ColorTheme[];
  applyTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export const useColorTheme = () => {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
};

interface ColorThemeProviderProps {
  children: ReactNode;
}

export const ColorThemeProvider: React.FC<ColorThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentThemeState] = useState<ColorTheme>(defaultColorTheme);

  // CSS カスタムプロパティを適用する関数
  const applyTheme = (theme: ColorTheme) => {
    const root = document.documentElement;
    
    // CSS変数を動的に設定
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // 追加のCSS変数も設定
    root.style.setProperty('--primary-navy', theme.colors.primaryNavy);
    root.style.setProperty('--primary-blue', theme.colors.primaryBlue);
    root.style.setProperty('--accent-gold', theme.colors.accentGold);
    root.style.setProperty('--accent-emerald', theme.colors.accentEmerald);
    root.style.setProperty('--accent-rose', theme.colors.accentRose);
    root.style.setProperty('--gradient-gold', theme.colors.gradientGold);
    root.style.setProperty('--gradient-emerald', theme.colors.gradientEmerald);
    root.style.setProperty('--gradient-rose', theme.colors.gradientRose);
    
    // ニュートラルカラー
    root.style.setProperty('--neutral-100', theme.colors.neutral100);
    root.style.setProperty('--neutral-200', theme.colors.neutral200);
    root.style.setProperty('--neutral-300', theme.colors.neutral300);
    root.style.setProperty('--neutral-400', theme.colors.neutral400);
    root.style.setProperty('--neutral-500', theme.colors.neutral500);
    root.style.setProperty('--neutral-600', theme.colors.neutral600);
    root.style.setProperty('--neutral-700', theme.colors.neutral700);
    root.style.setProperty('--neutral-800', theme.colors.neutral800);
    root.style.setProperty('--neutral-900', theme.colors.neutral900);
    
    // ラグジュアリーカラー
    root.style.setProperty('--luxury-gold', theme.colors.luxuryGold);
    root.style.setProperty('--luxury-emerald', theme.colors.luxuryEmerald);
    root.style.setProperty('--luxury-rose', theme.colors.luxuryRose);
  };

  // テーマ変更関数
  const setCurrentTheme = (themeId: string) => {
    const theme = colorThemes.find(t => t.id === themeId);
    if (theme) {
      setCurrentThemeState(theme);
      applyTheme(theme);
      // セッションストレージに保存
      sessionStorage.setItem('selectedColorTheme', themeId);
    }
  };

  // 初期化とセッションストレージからの読み込み
  useEffect(() => {
    const savedThemeId = sessionStorage.getItem('selectedColorTheme');
    if (savedThemeId) {
      const savedTheme = colorThemes.find(t => t.id === savedThemeId);
      if (savedTheme) {
        setCurrentThemeState(savedTheme);
        applyTheme(savedTheme);
        return;
      }
    }
    
    // デフォルトテーマを適用
    applyTheme(defaultColorTheme);
  }, []);

  const value: ColorThemeContextType = {
    currentTheme,
    setCurrentTheme,
    themes: colorThemes,
    applyTheme
  };

  return (
    <ColorThemeContext.Provider value={value}>
      {children}
    </ColorThemeContext.Provider>
  );
}; 