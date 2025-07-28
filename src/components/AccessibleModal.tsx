import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
// import FocusTrap from 'react-focus-trap'; // Removed due to TypeScript errors
import { useFocusManagement, useLiveRegion } from '../hooks/useAccessibility';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  description?: string;
  size?: 'small' | 'medium' | 'large';
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  autoFocus?: boolean;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  description,
  size = 'medium',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  autoFocus = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { saveFocus, restoreFocus } = useFocusManagement();
  const { announce } = useLiveRegion();

  // モーダルのサイズ設定
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl'
  };

  useEffect(() => {
    if (isOpen) {
      // フォーカスを保存
      saveFocus();
      
      // body のスクロールを無効化
      document.body.style.overflow = 'hidden';
      
      // スクリーンリーダーに通知
      announce(`ダイアログが開かれました: ${title}`, 'assertive');
      
      // ESCキーでの閉じる機能
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      // body のスクロールを復元
      document.body.style.overflow = '';
      
      // フォーカスを復元
      restoreFocus();
      
      // スクリーンリーダーに通知
      announce('ダイアログが閉じられました', 'assertive');
      
      // クリーンアップ不要の場合はundefinedを返す
      return undefined;
    }
  }, [isOpen, onClose, closeOnEscape, title, announce, saveFocus, restoreFocus]);

  // オーバーレイクリックでの閉じる機能
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div 
          ref={modalRef}
          className={`
            bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]}
            transform transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          tabIndex={-1}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 
              id="modal-title" 
              className="text-xl font-semibold text-gray-900"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="
                text-gray-400 hover:text-gray-600 focus:outline-none 
                focus:ring-2 focus:ring-blue-500 rounded-full p-1
                transition-colors duration-200
              "
              aria-label="ダイアログを閉じる"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>

          {/* 説明（オプション） */}
          {description && (
            <div id="modal-description" className="px-6 pt-4">
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          )}

          {/* コンテンツ */}
          <div className="p-6">
            {children}
          </div>
        </div>
    </div>
  );

  // ポータルを使用してbodyに直接レンダリング
  return createPortal(modalContent, document.body);
};

export default AccessibleModal;