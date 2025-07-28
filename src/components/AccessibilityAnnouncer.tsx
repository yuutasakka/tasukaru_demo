import React, { useEffect } from 'react';
import { useLiveRegion } from '../hooks/useAccessibility';

// グローバルなアナウンサーコンポーネント
const AccessibilityAnnouncer: React.FC = () => {
  const { announce } = useLiveRegion();

  useEffect(() => {
    // ページロード時のアナウンス
    announce('ページが読み込まれました', 'polite');

    // ルート変更の監視（React Routerを使用している場合）
    const handleRouteChange = () => {
      const title = document.title;
      announce(`ページが変更されました: ${title}`, 'polite');
    };

    // カスタムイベントリスナー
    window.addEventListener('routechange', handleRouteChange);
    
    // フォーカス変更の監視
    let lastFocusedElement: Element | null = null;
    const handleFocusChange = () => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== lastFocusedElement) {
        lastFocusedElement = activeElement;
        
        // 重要な要素のフォーカス変更をアナウンス
        if (activeElement.tagName === 'BUTTON') {
          const text = activeElement.textContent || activeElement.getAttribute('aria-label');
          if (text) {
            announce(`ボタン: ${text}`, 'polite');
          }
        }
        
        if (activeElement.getAttribute('role') === 'tab') {
          const text = activeElement.textContent || activeElement.getAttribute('aria-label');
          if (text) {
            announce(`タブ: ${text}`, 'polite');
          }
        }
      }
    };

    document.addEventListener('focusin', handleFocusChange);

    return () => {
      window.removeEventListener('routechange', handleRouteChange);
      document.removeEventListener('focusin', handleFocusChange);
    };
  }, [announce]);

  return (
    <>
      {/* スクリーンリーダー用のライブリージョン */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="polite-announcer"
      />
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="assertive-announcer"
      />
      
      {/* アプリケーションの状態表示 */}
      <div
        role="status"
        aria-label="アプリケーションの状態"
        className="sr-only"
        id="app-status"
      />
    </>
  );
};

export default AccessibilityAnnouncer;