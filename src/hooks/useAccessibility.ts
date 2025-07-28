import { useEffect, useState, useRef } from 'react';

// キーボードナビゲーション用のフック
export const useKeyboardNavigation = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isKeyboardUser;
};

// スクリーンリーダー用のライブリージョン管理
export const useLiveRegion = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);

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
      }, 1000);
    }
  };

  return { announce, announcements };
};

// フォーカス管理用のフック
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  };

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  };

  return { trapFocus, saveFocus, restoreFocus };
};

// 色のコントラスト比を計算
export const useContrastRatio = () => {
  const calculateContrast = (foreground: string, background: string): number => {
    const getLuminance = (color: string): number => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;

      const [r, g, b] = rgb.map(val => {
        const num = parseInt(val) / 255;
        return num <= 0.03928 ? num / 12.92 : Math.pow((num + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  };

  const isAccessible = (ratio: number, level: 'AA' | 'AAA' = 'AA'): boolean => {
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  };

  return { calculateContrast, isAccessible };
};

// 動画・アニメーション設定の管理
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// 高コントラストモードの検出
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const detectHighContrast = () => {
      // Windows High Contrast Mode の検出
      const isWindows = navigator.platform.toLowerCase().includes('win');
      if (isWindows) {
        const testElement = document.createElement('div');
        testElement.style.border = '1px solid';
        testElement.style.borderColor = 'rgb(31, 31, 31)';
        testElement.style.position = 'absolute';
        testElement.style.height = '5px';
        testElement.style.top = '-999px';
        testElement.style.backgroundColor = 'rgb(31, 31, 31)';
        
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const bgColor = computedStyle.backgroundColor;
        const borderColor = computedStyle.borderTopColor;
        
        setIsHighContrast(bgColor === borderColor);
        
        document.body.removeChild(testElement);
      }
    };

    detectHighContrast();
  }, []);

  return isHighContrast;
};

// ARIAラベルの動的生成
export const useAriaLabel = (baseLabel: string, additionalInfo?: string) => {
  const [ariaLabel, setAriaLabel] = useState(baseLabel);

  useEffect(() => {
    const newLabel = additionalInfo ? `${baseLabel}, ${additionalInfo}` : baseLabel;
    setAriaLabel(newLabel);
  }, [baseLabel, additionalInfo]);

  return ariaLabel;
};