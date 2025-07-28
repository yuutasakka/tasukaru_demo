import React from 'react';
import { useAdminSession } from './hooks/useAdminSession';

interface SessionTimerProps {
  onSessionExpired?: () => void;
  warningThreshold?: number; // 警告を表示する残り時間（ミリ秒）
}

const SessionTimer: React.FC<SessionTimerProps> = ({ 
  onSessionExpired, 
  warningThreshold = 5 * 60 * 1000 // デフォルト5分
}) => {
  const { session, isValid, timeRemaining, extendSession, logout } = useAdminSession();

  // セッション期限切れ時のコールバック
  React.useEffect(() => {
    if (!isValid && session && onSessionExpired) {
      onSessionExpired();
    }
  }, [isValid, session, onSessionExpired]);

  // 時間のフォーマット（mm:ss）
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // セッションが無効または存在しない場合は何も表示しない
  if (!session || !isValid) {
    return null;
  }

  const isWarning = timeRemaining <= warningThreshold;
  const isCritical = timeRemaining <= 60000; // 1分以下

  return (
    <div className={`session-timer flex items-center space-x-4 px-4 py-2 rounded-lg ${
      isCritical 
        ? 'bg-red-100 border border-red-300' 
        : isWarning 
        ? 'bg-yellow-100 border border-yellow-300'
        : 'bg-blue-100 border border-blue-300'
    }`}>
      {/* セッション情報 */}
      <div className="flex items-center space-x-2">
        <i className={`fas fa-clock text-sm ${
          isCritical 
            ? 'text-red-600' 
            : isWarning 
            ? 'text-yellow-600'
            : 'text-blue-600'
        }`}></i>
        <span className={`text-sm font-medium ${
          isCritical 
            ? 'text-red-800' 
            : isWarning 
            ? 'text-yellow-800'
            : 'text-blue-800'
        }`}>
          残り時間: {formatTime(timeRemaining)}
        </span>
      </div>

      {/* ユーザー情報 */}
      <div className="flex items-center space-x-2">
        <i className="fas fa-user text-sm text-gray-600"></i>
        <span className="text-sm text-gray-700">{session.username}</span>
      </div>

      {/* アクション */}
      <div className="flex items-center space-x-2">
        {isWarning && (
          <button
            onClick={extendSession}
            className={`px-3 py-1 text-xs font-medium rounded-md border ${
              isCritical
                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                : 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700'
            }`}
            title="セッションを30分延長"
          >
            <i className="fas fa-plus mr-1"></i>
            延長
          </button>
        )}
        
        <button
          onClick={logout}
          className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          title="ログアウト"
        >
          <i className="fas fa-sign-out-alt mr-1"></i>
          ログアウト
        </button>
      </div>

      {/* 警告メッセージ */}
      {isCritical && (
        <div className="flex items-center space-x-2 ml-4">
          <i className="fas fa-exclamation-triangle text-red-600"></i>
          <span className="text-xs text-red-800 font-medium">
            セッションがまもなく期限切れになります
          </span>
        </div>
      )}
    </div>
  );
};

export default SessionTimer;