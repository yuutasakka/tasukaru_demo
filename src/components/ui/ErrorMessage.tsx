import React from 'react';

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

interface ErrorMessageProps {
  message: string;
  type?: ErrorType;
  onClose?: () => void;
  autoHide?: boolean;
  duration?: number;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  type = 'error',
  onClose,
  autoHide = false,
  duration = 5000
}) => {
  React.useEffect(() => {
    if (autoHide && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onClose]);

  const styles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '❌'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠️'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ️'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✅'
    }
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} ${style.border} ${style.text} border rounded-lg p-4 mb-4 relative`}>
      <div className="flex items-start">
        <span className="text-xl mr-3 flex-shrink-0">{style.icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// トースト通知
export const Toast: React.FC<ErrorMessageProps & { isVisible: boolean }> = ({ 
  isVisible,
  ...props 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <ErrorMessage {...props} />
    </div>
  );
};