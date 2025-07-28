import React from 'react';

interface LoginSelectionPageProps {
  onSelectTraditionalAuth: () => void;
  onSelectSupabaseAuth: () => void;
  onNavigateHome: () => void;
  onNavigateToRegistration?: () => void;
}

const LoginSelectionPage: React.FC<LoginSelectionPageProps> = ({
  onSelectTraditionalAuth,
  onSelectSupabaseAuth,
  onNavigateHome,
  onNavigateToRegistration
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* ロゴアイコン */}
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* メインカード */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              管理画面にログインします。
            </h1>
            <p className="text-gray-600 text-sm">
              ログイン方式を選択してください
            </p>
          </div>

          {/* ログイン方式選択 */}
          <div className="space-y-4">
            {/* 従来認証ボタン */}
            <button
              onClick={onSelectTraditionalAuth}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                従来認証でログイン
              </div>
              <p className="text-blue-100 text-sm mt-1">ユーザー名とパスワード認証</p>
            </button>

            {/* 区切り線 */}
            <div className="flex items-center">
              <hr className="flex-grow border-gray-200" />
              <span className="mx-4 text-gray-500 text-sm">または</span>
              <hr className="flex-grow border-gray-200" />
            </div>

            {/* Supabase認証ボタン */}
            <button
              onClick={onSelectSupabaseAuth}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                Supabase認証でログイン
              </div>
              <p className="text-purple-100 text-sm mt-1">メール・OAuth認証</p>
            </button>
          </div>

          {/* OAuth認証プレビュー（将来の拡張用） */}
          <div className="mt-8 space-y-3" style={{ display: 'none' }}>
            <button
              type="button"
              disabled={true}
              className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google で続行
            </button>
            
            <button
              type="button"
              disabled={true}
              className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.163-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.750-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.990-5.367 11.990-11.986C24.007 5.367 18.641.001.012 0z"/>
              </svg>
              Apple で続行
            </button>
          </div>

          {/* 新規登録申請 */}
          {onNavigateToRegistration && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-4">
                管理者アカウントをお持ちでない場合は、
                <br />
                新規登録申請を行ってください。
              </p>
              
              <button
                onClick={onNavigateToRegistration}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                新規登録申請はこちら
              </button>
            </div>
          )}

          {/* ホームへ戻るリンク */}
          <div className="mt-6 text-center">
            <button
              onClick={onNavigateHome}
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors duration-200"
            >
              ← ホームページに戻る
            </button>
          </div>
        </div>

        {/* セキュリティ情報 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>このページは暗号化された接続で保護されています</p>
          <p className="mt-1">タスカル 管理システム</p>
        </div>
      </div>
    </div>
  );
};

export default LoginSelectionPage; 