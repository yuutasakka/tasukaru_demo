import React, { useState } from 'react';

interface DemoNoticeProps {
  onDemoAccess: (demoToken: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const DemoNotice: React.FC<DemoNoticeProps> = ({ 
  onDemoAccess, 
  isVisible, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestDemoAccess = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo-send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestDemoAccess: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'デモアクセスの取得に失敗しました');
      }

      const result = await response.json();
      
      if (result.success && result.demoToken) {
        onDemoAccess(result.demoToken);
        onClose();
      } else {
        throw new Error('デモトークンの取得に失敗しました');
      }
    } catch (error: any) {
      setError(error.message || 'デモアクセスの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* デモアイコン */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">デモ環境アクセス</h2>
          <p className="text-gray-600 text-sm">
            SMS認証システムを安全に体験できます
          </p>
        </div>

        {/* デモの説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            デモ環境の特徴
          </h3>
          <ul className="text-blue-700 text-sm space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-0.5">•</span>
              実際のSMS送信は行いません
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-0.5">•</span>
              デモ用電話番号で認証を体験
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-0.5">•</span>
              セキュリティ機能は本番環境と同等
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-0.5">•</span>
              30分間のセッション制限
            </li>
          </ul>
        </div>

        {/* デモ用電話番号の案内 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            使用可能な電話番号
          </h4>
          <div className="text-yellow-700 text-sm">
            <p className="mb-2">以下のデモ用電話番号をご使用ください：</p>
            <div className="bg-yellow-100 rounded-lg p-3 font-mono text-xs">
              090-0000-0001 〜 090-0000-0010
            </div>
            <p className="mt-2 text-xs">
              <strong>認証コード:</strong> <span className="font-mono bg-yellow-100 px-1 rounded">123456</span>
            </p>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="space-y-3">
          <button
            onClick={handleRequestDemoAccess}
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                デモアクセス準備中...
              </div>
            ) : (
              <>
                <div className="text-lg">デモ環境にアクセス</div>
                <div className="text-sm opacity-90 mt-1">SMS認証を安全に体験</div>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors duration-200 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            キャンセル
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 text-xs leading-relaxed">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            このデモ環境では実際のデータは保存されません。本番環境とは完全に分離されています。
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoNotice;