import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = '処理中...', 
  fullScreen = false 
}) => {
  if (!isLoading) return null;

  const overlayClass = fullScreen 
    ? 'fixed inset-0 z-50' 
    : 'absolute inset-0 z-40';

  return (
    <div className={`${overlayClass} flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm`}>
      <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded-2xl shadow-2xl">
        {/* スピナー */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        
        {/* メッセージ */}
        <p className="text-lg font-medium text-gray-700">{message}</p>
        
        {/* プログレスドット */}
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

// ボタン用のローディング状態
export const ButtonLoading: React.FC<{ loading?: boolean }> = ({ loading }) => {
  if (!loading) return null;

  return (
    <div className="inline-flex items-center">
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>処理中...</span>
    </div>
  );
};

// スケルトンローディング
export const SkeletonLoader: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="animate-pulse">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          {index === 0 && <div className="h-4 bg-gray-200 rounded w-1/2"></div>}
        </div>
      ))}
    </div>
  );
};