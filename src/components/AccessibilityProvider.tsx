import React, { createContext, useContext, useEffect, useState } from 'react';
import { useKeyboardNavigation, useReducedMotion, useHighContrast } from '../hooks/useAccessibility';

interface AccessibilityContextType {
  isKeyboardUser: boolean;
  prefersReducedMotion: boolean;
  isHighContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  announcements: string[];
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const isKeyboardUser = useKeyboardNavigation();
  const prefersReducedMotion = useReducedMotion();
  const isHighContrast = useHighContrast();
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // セッションストレージからフォントサイズ設定を復元
  useEffect(() => {
    const savedFontSize = sessionStorage.getItem('accessibility-font-size') as 'small' | 'medium' | 'large';
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
  }, []);

  // フォントサイズ変更時にセッションストレージに保存
  useEffect(() => {
    sessionStorage.setItem('accessibility-font-size', fontSize);
    
    // CSS custom propertiesを更新
    const fontSizes = {
      small: {
        '--font-size-xs': '0.75rem',
        '--font-size-sm': '0.875rem',
        '--font-size-base': '1rem',
        '--font-size-lg': '1.125rem',
        '--font-size-xl': '1.25rem',
        '--font-size-2xl': '1.5rem',
        '--font-size-3xl': '1.875rem'
      },
      medium: {
        '--font-size-xs': '0.875rem',
        '--font-size-sm': '1rem',
        '--font-size-base': '1.125rem',
        '--font-size-lg': '1.25rem',
        '--font-size-xl': '1.5rem',
        '--font-size-2xl': '1.875rem',
        '--font-size-3xl': '2.25rem'
      },
      large: {
        '--font-size-xs': '1rem',
        '--font-size-sm': '1.125rem',
        '--font-size-base': '1.25rem',
        '--font-size-lg': '1.5rem',
        '--font-size-xl': '1.875rem',
        '--font-size-2xl': '2.25rem',
        '--font-size-3xl': '3rem'
      }
    };

    const root = document.documentElement;
    Object.entries(fontSizes[fontSize]).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [fontSize]);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // 重複メッセージを避ける
    if (announcements.includes(message)) {
      return;
    }

    setAnnouncements(prev => [...prev, message]);

    // ライブリージョンに追加
    const liveRegion = document.querySelector(`[aria-live="${priority}"]`);
    if (liveRegion) {
      liveRegion.textContent = message;
      
      // メッセージをクリア
      setTimeout(() => {
        liveRegion.textContent = '';
        setAnnouncements(prev => prev.filter(msg => msg !== message));
      }, 3000);
    }
  };

  const value = {
    isKeyboardUser,
    prefersReducedMotion,
    isHighContrast,
    fontSize,
    setFontSize,
    announcements,
    announce
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {/* グローバルスタイルの適用 */}
      <div 
        className={`
          ${isKeyboardUser ? 'keyboard-user' : ''}
          ${prefersReducedMotion ? 'reduce-motion' : ''}
          ${isHighContrast ? 'high-contrast' : ''}
          font-size-${fontSize}
        `}
        data-font-size={fontSize}
        data-keyboard-user={isKeyboardUser}
        data-reduced-motion={prefersReducedMotion}
        data-high-contrast={isHighContrast}
      >
        {children}
        
        {/* ライブリージョン */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="accessibility-announcer-polite"
        />
        <div
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
          id="accessibility-announcer-assertive"
        />
      </div>
    </AccessibilityContext.Provider>
  );
};