import { useState, useEffect } from 'react';

// オフライン機能を無効化
// セキュリティのためlocalStorageの使用を完全に削除
export const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasOfflineData] = useState(false); // 常にfalse

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // オフライン機能を無効化 - セキュリティのため
  const saveOfflineData = () => {
    return false;
  };

  const getOfflineData = () => {
    return null;
  };

  const clearOfflineData = () => {
    return false;
  };

  const syncOfflineData = async () => {
    return false;
  };

  const checkOfflineData = () => {
    // 何もしない
  };

  return {
    isOnline,
    hasOfflineData,
    saveOfflineData,
    getOfflineData,
    clearOfflineData,
    syncOfflineData,
    checkOfflineData
  };
};

export default useOfflineStorage;