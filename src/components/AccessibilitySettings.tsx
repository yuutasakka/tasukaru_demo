import React, { useState } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider';
import AccessibleButton from './AccessibleButton';
import AccessibleSelect from './AccessibleSelect';
import AccessibleModal from './AccessibleModal';

const AccessibilitySettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    fontSize,
    setFontSize,
    isKeyboardUser,
    prefersReducedMotion,
    isHighContrast,
    announce
  } = useAccessibilityContext();

  const handleFontSizeChange = (newSize: 'small' | 'medium' | 'large') => {
    setFontSize(newSize);
    announce(`フォントサイズを${newSize === 'small' ? '小' : newSize === 'medium' ? '中' : '大'}に変更しました`, 'polite');
  };

  const fontSizeOptions = [
    { value: 'small', label: '小さい' },
    { value: 'medium', label: '標準' },
    { value: 'large', label: '大きい' }
  ];

  return (
    <>
      {/* アクセシビリティ設定ボタン */}
      <AccessibleButton
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="small"
        className="fixed top-4 right-4 z-40"
        aria-label="アクセシビリティ設定を開く"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
      />

      {/* アクセシビリティ設定モーダル */}
      <AccessibleModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="アクセシビリティ設定"
        description="ウェブサイトの使いやすさを調整できます"
        size="medium"
      >
        <div className="space-y-6">
          {/* フォントサイズ設定 */}
          <div>
            <AccessibleSelect
              label="フォントサイズ"
              options={fontSizeOptions}
              value={fontSize}
              onChange={(e) => handleFontSizeChange(e.target.value as 'small' | 'medium' | 'large')}
              helpText="読みやすいフォントサイズを選択してください"
            />
          </div>

          {/* 現在の設定状況表示 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">現在の設定状況</h3>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span>キーボードナビゲーション</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isKeyboardUser ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isKeyboardUser ? '有効' : '無効'}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span>アニメーション軽減</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  prefersReducedMotion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {prefersReducedMotion ? '有効' : '無効'}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span>高コントラストモード</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isHighContrast ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isHighContrast ? '有効' : '無効'}
                </span>
              </div>
            </div>
          </div>

          {/* アクセシビリティ機能の説明 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">アクセシビリティ機能</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• <strong>キーボードナビゲーション:</strong> Tabキーでページ内を移動できます</p>
              <p>• <strong>スクリーンリーダー対応:</strong> 音声読み上げソフトウェアに対応しています</p>
              <p>• <strong>高コントラスト:</strong> 文字と背景のコントラストを高めています</p>
              <p>• <strong>フォーカス表示:</strong> 現在選択中の要素が明確に表示されます</p>
              <p>• <strong>スキップリンク:</strong> メインコンテンツに直接移動できます</p>
            </div>
          </div>

          {/* ヘルプ情報 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">キーボードショートカット</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• <kbd className="px-1 bg-blue-200 rounded">Tab</kbd>: 次の要素に移動</p>
              <p>• <kbd className="px-1 bg-blue-200 rounded">Shift + Tab</kbd>: 前の要素に移動</p>
              <p>• <kbd className="px-1 bg-blue-200 rounded">Enter</kbd>: 選択/実行</p>
              <p>• <kbd className="px-1 bg-blue-200 rounded">Space</kbd>: チェックボックス/ボタンの実行</p>
              <p>• <kbd className="px-1 bg-blue-200 rounded">Esc</kbd>: モーダル/メニューを閉じる</p>
            </div>
          </div>

          {/* 閉じるボタン */}
          <div className="flex justify-end pt-4">
            <AccessibleButton
              onClick={() => setIsOpen(false)}
              variant="primary"
            >
              設定を保存して閉じる
            </AccessibleButton>
          </div>
        </div>
      </AccessibleModal>
    </>
  );
};

export default AccessibilitySettings;