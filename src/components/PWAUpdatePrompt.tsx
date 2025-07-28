import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PWAUpdatePromptProps {
  className?: string;
}

export const PWAUpdatePrompt: React.FC<PWAUpdatePromptProps> = ({ className = '' }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
    },
    onRegisterError(error) {
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      {showPrompt && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          zIndex: 9999
        }}>
          <div style={{ marginBottom: '12px' }}>
            🔄 新しいバージョンが利用可能です
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={handleUpdate}
              style={{
                backgroundColor: 'white',
                color: '#3b82f6',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              更新する
            </button>
            <button
              onClick={handleDismiss}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#3b82f6',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              後で
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAUpdatePrompt;