// グローバルメッセージ表示コンポーネント

import React from 'react';

interface GlobalMessageDisplayProps {
  globalError: string;
  globalSuccess: string;
  clearMessages: () => void;
}

const GlobalMessageDisplay: React.FC<GlobalMessageDisplayProps> = ({
  globalError,
  globalSuccess,
  clearMessages
}) => {
  if (!globalError && !globalSuccess) {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-2">
      {globalError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            <span>{globalError}</span>
          </div>
          <button 
            onClick={clearMessages}
            className="text-red-700 hover:text-red-900"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      {globalSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-check-circle mr-2"></i>
            <span>{globalSuccess}</span>
          </div>
          <button 
            onClick={clearMessages}
            className="text-green-700 hover:text-green-900"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default GlobalMessageDisplay;