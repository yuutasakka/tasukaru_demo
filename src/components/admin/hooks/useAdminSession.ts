import { useState, useEffect, useCallback } from 'react';
import { SecureStorage } from '../../adminUtils';
import { secureLog } from '@/config/clientSecurity';

interface AdminSession {
  userId: string;
  username: string;
  expiryTime: string;
  lastActivity: number;
  permissions: string[];
}

interface UseAdminSessionReturn {
  session: AdminSession | null;
  isValid: boolean;
  timeRemaining: number;
  extendSession: () => void;
  logout: () => void;
  checkValidity: () => boolean;
}

export const useAdminSession = (): UseAdminSessionReturn => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // セッション有効性チェック
  const checkValidity = useCallback((): boolean => {
    try {
      const savedSession = SecureStorage.getSecureItem('admin_session');
      if (!savedSession) {
        setIsValid(false);
        setSession(null);
        return false;
      }

      const currentTime = new Date().getTime();
      const expiryTime = new Date(savedSession.expiryTime).getTime();
      const remaining = Math.max(0, expiryTime - currentTime);

      if (remaining <= 0) {
        secureLog('セッションが期限切れです');
        setIsValid(false);
        setSession(null);
        setTimeRemaining(0);
        // 期限切れセッションをクリア
        SecureStorage.removeSecureItem('admin_session');
        sessionStorage.removeItem('admin_authenticated');
        return false;
      }

      setSession(savedSession);
      setIsValid(true);
      setTimeRemaining(remaining);
      return true;
    } catch (error) {
      secureLog('セッションデータの解析エラー:', error);
      setIsValid(false);
      setSession(null);
      setTimeRemaining(0);
      return false;
    }
  }, []);

  // セッション延長
  const extendSession = useCallback(() => {
    try {
      if (!session) return;

      const newExpiryTime = new Date(Date.now() + (30 * 60 * 1000)).toISOString(); // 30分延長
      const updatedSession = {
        ...session,
        expiryTime: newExpiryTime,
        lastActivity: Date.now()
      };

      SecureStorage.setSecureItem('admin_session', updatedSession);
      setSession(updatedSession);
      setTimeRemaining(30 * 60 * 1000);
      
      secureLog('セッションが延長されました');
    } catch (error) {
      secureLog('セッション延長エラー:', error);
    }
  }, [session]);

  // ログアウト
  const logout = useCallback(() => {
    try {
      SecureStorage.removeSecureItem('admin_session');
      sessionStorage.removeItem('admin_authenticated');
      
      setSession(null);
      setIsValid(false);
      setTimeRemaining(0);
      
      secureLog('ログアウトしました');
    } catch (error) {
      secureLog('ログアウトエラー:', error);
    }
  }, []);

  // 初期化とタイマー設定
  useEffect(() => {
    // 初回チェック
    checkValidity();

    // 定期的なセッションチェック（1分ごと）
    const validityInterval = setInterval(checkValidity, 60000);

    // タイマー更新（1秒ごと）
    const timeUpdateInterval = setInterval(() => {
      if (session) {
        const currentTime = new Date().getTime();
        const expiryTime = new Date(session.expiryTime).getTime();
        const remaining = Math.max(0, expiryTime - currentTime);
        setTimeRemaining(remaining);

        // 残り時間が0になったら無効化
        if (remaining <= 0) {
          setIsValid(false);
          setSession(null);
        }
      }
    }, 1000);

    return () => {
      clearInterval(validityInterval);
      clearInterval(timeUpdateInterval);
    };
  }, [checkValidity, session]);

  // アクティビティ監視
  useEffect(() => {
    const handleActivity = () => {
      if (session && isValid) {
        // 最後のアクティビティ時間を更新
        const updatedSession = {
          ...session,
          lastActivity: Date.now()
        };
        SecureStorage.setSecureItem('admin_session', updatedSession);
        setSession(updatedSession);
      }
    };

    // マウス・キーボードイベントを監視
    const events = ['mousedown', 'keydown', 'scroll', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session, isValid]);

  // ページ可視性変更の監視
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // ページが非表示になった時、セッション状態を保存
        if (session && isValid) {
          const sessionState = {
            lastActivity: Date.now(),
            isLoggedIn: true
          };
          sessionStorage.setItem('admin_session_state', JSON.stringify(sessionState));
        }
      } else {
        // ページが再表示された時、セッション状態をチェック
        const sessionState = sessionStorage.getItem('admin_session_state');
        if (sessionState) {
          try {
            const data = JSON.parse(sessionState);
            const timeDiff = Date.now() - data.lastActivity;
            
            // 30分以上非アクティブの場合はログアウト
            if (timeDiff > 30 * 60 * 1000) {
              logout();
            } else {
              // セッション有効性を再チェック
              checkValidity();
            }
          } catch (error) {
            secureLog('セッション状態の解析エラー:', error);
            checkValidity();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, isValid, logout, checkValidity]);

  // ブラウザを閉じる時の処理
  useEffect(() => {
    const handleBeforeUnload = () => {
      // セッションストレージの一時情報をクリア（ローカルストレージの認証情報は保持）
      sessionStorage.removeItem('admin_authenticated');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    session,
    isValid,
    timeRemaining,
    extendSession,
    logout,
    checkValidity
  };
};