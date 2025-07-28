import React, { useState, useEffect } from 'react';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {!isOnline ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#f59e0b',
          color: 'white',
          padding: '8px',
          textAlign: 'center',
          fontSize: '14px',
          zIndex: 9999
        }}>
          🔌 オフラインです - 一部機能が制限されます
        </div>
      ) : (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#10b981',
          color: 'white',
          padding: '8px',
          textAlign: 'center',
          fontSize: '14px',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease-out'
        }}>
          ✅ オンラインに復帰しました
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;