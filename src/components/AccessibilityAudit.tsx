import React, { useEffect, useState } from 'react';
import { useContrastRatio, useHighContrast } from '../hooks/useAccessibility';

interface AuditResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  suggestion?: string;
}

const AccessibilityAudit: React.FC = () => {
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { calculateContrast, isAccessible } = useContrastRatio();
  const isHighContrast = useHighContrast();

  // 開発環境でのみ表示
  const isDevelopment = (import.meta as any).env?.DEV;

  useEffect(() => {
    if (!isDevelopment) return;

    const runAudit = () => {
      const results: AuditResult[] = [];

      // 1. Alt属性のチェック
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
          results.push({
            type: 'error',
            message: `画像にalt属性がありません (画像 ${index + 1})`,
            element: img.src,
            suggestion: 'alt属性を追加するか、装飾的な画像の場合はaria-hidden="true"を設定してください'
          });
        }
      });

      // 2. ヘディング構造のチェック
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1));
        if (level > lastLevel + 1) {
          results.push({
            type: 'warning',
            message: `ヘディングレベルがスキップされています (${heading.tagName})`,
            element: heading.textContent || '',
            suggestion: 'ヘディングは順序立てて使用してください (h1→h2→h3...)'
          });
        }
        lastLevel = level;
      });

      // 3. ボタンのアクセシブル名のチェック
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button, index) => {
        const accessibleName = button.textContent?.trim() || 
                              button.getAttribute('aria-label') || 
                              button.getAttribute('aria-labelledby');
        if (!accessibleName) {
          results.push({
            type: 'error',
            message: `ボタンにアクセシブル名がありません (ボタン ${index + 1})`,
            suggestion: 'ボタンにテキスト、aria-label、またはaria-labelledbyを設定してください'
          });
        }
      });

      // 4. リンクのアクセシブル名のチェック
      const links = document.querySelectorAll('a');
      links.forEach((link, index) => {
        const accessibleName = link.textContent?.trim() || 
                              link.getAttribute('aria-label') || 
                              link.getAttribute('aria-labelledby');
        if (!accessibleName) {
          results.push({
            type: 'error',
            message: `リンクにアクセシブル名がありません (リンク ${index + 1})`,
            element: link.href,
            suggestion: 'リンクにテキスト、aria-label、またはaria-labelledbyを設定してください'
          });
        }
      });

      // 5. フォーム要素のラベルチェック
      const formElements = document.querySelectorAll('input, select, textarea');
      formElements.forEach((element, index) => {
        const id = element.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = element.getAttribute('aria-label');
        const ariaLabelledby = element.getAttribute('aria-labelledby');
        
        if (!label && !ariaLabel && !ariaLabelledby) {
          results.push({
            type: 'error',
            message: `フォーム要素にラベルがありません (${element.tagName.toLowerCase()} ${index + 1})`,
            suggestion: 'label要素、aria-label、またはaria-labelledbyを設定してください'
          });
        }
      });

      // 6.色のコントラスト比チェック（サンプル）
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
      textElements.forEach((element) => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const ratio = calculateContrast(color, backgroundColor);
          if (!isAccessible(ratio)) {
            results.push({
              type: 'warning',
              message: `コントラスト比が不十分です (${ratio.toFixed(2)}:1)`,
              element: element.textContent?.substring(0, 50) + '...',
              suggestion: 'WCAG AA基準（4.5:1以上）を満たすようにしてください'
            });
          }
        }
      });

      // 7. フォーカス可能要素のチェック
      const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
      focusableElements.forEach((element) => {
        const tabIndex = element.getAttribute('tabindex');
        if (tabIndex && parseInt(tabIndex) > 0) {
          results.push({
            type: 'warning',
            message: 'positive tabindexが使用されています',
            element: element.tagName.toLowerCase(),
            suggestion: 'tabindex="0"または負の値を使用することを推奨します'
          });
        }
      });

      setAuditResults(results);
    };

    // 初回実行
    runAudit();

    // DOM変更の監視
    const observer = new MutationObserver(() => {
      setTimeout(runAudit, 1000); // 1秒後に再実行
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['alt', 'aria-label', 'aria-labelledby', 'tabindex']
    });

    return () => observer.disconnect();
  }, [isDevelopment, calculateContrast, isAccessible]);

  if (!isDevelopment) return null;

  const errorCount = auditResults.filter(r => r.type === 'error').length;
  const warningCount = auditResults.filter(r => r.type === 'warning').length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`
          px-4 py-2 rounded-lg shadow-lg font-medium
          ${errorCount > 0 
            ? 'bg-red-600 text-white' 
            : warningCount > 0 
              ? 'bg-yellow-600 text-white'
              : 'bg-green-600 text-white'
          }
          hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2
        `}
        aria-label={`アクセシビリティ監査結果: エラー ${errorCount}件, 警告 ${warningCount}件`}
      >
        A11y: {errorCount}E / {warningCount}W
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 overflow-y-auto bg-white border rounded-lg shadow-xl">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-900">アクセシビリティ監査</h3>
            <p className="text-sm text-gray-600">
              エラー: {errorCount}件 / 警告: {warningCount}件
            </p>
            {isHighContrast && (
              <p className="text-sm text-blue-600 mt-1">
                高コントラストモードが検出されました
              </p>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {auditResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                アクセシビリティの問題は検出されませんでした
              </div>
            ) : (
              auditResults.map((result, index) => (
                <div key={index} className="p-3 border-b border-gray-100">
                  <div className="flex items-start space-x-2">
                    <span className={`
                      inline-block w-2 h-2 rounded-full mt-2 flex-shrink-0
                      ${result.type === 'error' ? 'bg-red-500' : 
                        result.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}
                    `} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {result.message}
                      </p>
                      {result.element && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          要素: {result.element}
                        </p>
                      )}
                      {result.suggestion && (
                        <p className="text-xs text-blue-600 mt-1">
                          推奨: {result.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityAudit;