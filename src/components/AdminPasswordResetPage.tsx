import React, { useState, useEffect } from 'react';
import { AdminPasswordReset, supabase } from './supabaseClient';

interface AdminPasswordResetPageProps {
  onNavigateBack?: () => void;
}

const AdminPasswordResetPage: React.FC<AdminPasswordResetPageProps> = ({ onNavigateBack }) => {
  const [mode, setMode] = useState<'send-email' | 'reset-password'>('send-email');
  
  // メール送信モード用の状態
  const [email, setEmail] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // パスワードリセットモード用の状態
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // パスワード要件チェック用の状態
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  useEffect(() => {
    // URLパラメータをチェックしてモードを決定
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // パスワードリセットトークンが存在する場合
      setMode('reset-password');
      
      // Supabaseセッションの設定
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }
  }, []);

  // リアルタイムパスワード要件チェック
  useEffect(() => {
    setPasswordRequirements({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password)
    });
  }, [password]);

  // メール送信処理
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('メールアドレスを入力してください。');
      return;
    }

    setIsEmailSending(true);
    setError('');
    
    try {
      const result = await AdminPasswordReset.sendPasswordResetEmail(email);
      
      if (result.success) {
        setEmailSent(true);
        setMessage('パスワードリセットメールを送信しました。メールボックスを確認してください。');
      } else {
        setError(result.error || 'メール送信に失敗しました。');
      }
    } catch (error) {
      setError('メール送信中にエラーが発生しました。');
    } finally {
      setIsEmailSending(false);
    }
  };

  // パスワードリセット処理
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('すべてのフィールドを入力してください。');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    // パスワード要件チェック
    const allRequirementsMet = Object.values(passwordRequirements).every(req => req);
    if (!allRequirementsMet) {
      setError('パスワードが要件を満たしていません。');
      return;
    }

    setIsResetting(true);
    setError('');
    
    try {
      const result = await AdminPasswordReset.updatePassword(password, confirmPassword);
      
      if (result.success) {
        setMessage('パスワードが正常に更新されました。ログインページに移動します。');
        
        // 3秒後にログインページにリダイレクト
        setTimeout(() => {
          if (onNavigateBack) {
            onNavigateBack();
          } else {
            window.location.href = '/';
          }
        }, 3000);
      } else {
        setError(result.error || 'パスワード更新に失敗しました。');
      }
    } catch (error) {
      setError('パスワード更新中にエラーが発生しました。');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
             タスカル
          </h1>
          <h2 className="text-xl font-semibold text-gray-600">
            {mode === 'send-email' ? 'パスワードリセット' : 'パスワード変更'}
          </h2>
        </div>

        {mode === 'send-email' ? (
          // メール送信モード
          <div>
            {!emailSent ? (
              <form onSubmit={handleSendEmail} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    管理者メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="admin@aiconectx.co.jp"
                    required
                    disabled={isEmailSending}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm"> {error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isEmailSending}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEmailSending ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      送信中...
                    </div>
                  ) : (
                    'リセットメールを送信'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateBack) {
                        onNavigateBack();
                      } else {
                        window.location.href = '/';
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    ← ログインページに戻る
                  </button>
                </div>
              </form>
            ) : (
              // メール送信完了画面
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="text-green-600 text-4xl mb-4"></div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    メール送信完了
                  </h3>
                  <p className="text-green-700 text-sm">
                    パスワードリセットメールを送信しました。<br />
                    メールボックスを確認し、リンクをクリックしてパスワードを変更してください。
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    if (onNavigateBack) {
                      onNavigateBack();
                    } else {
                      window.location.href = '/';
                    }
                  }}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-all"
                >
                  ログインページに戻る
                </button>
              </div>
            )}
          </div>
        ) : (
          // パスワード変更モード
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                新しいパスワード
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="新しいパスワードを入力"
                required
                disabled={isResetting}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード確認
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="パスワードを再入力"
                required
                disabled={isResetting}
              />
            </div>

            {/* パスワード要件表示 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">パスワード要件:</h4>
              <div className="space-y-2 text-sm">
                <div className={`flex items-center ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.minLength ? '✓' : '○'}</span>
                  8文字以上
                </div>
                <div className={`flex items-center ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.hasUppercase ? '✓' : '○'}</span>
                  大文字を含む
                </div>
                <div className={`flex items-center ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.hasLowercase ? '✓' : '○'}</span>
                  小文字を含む
                </div>
                <div className={`flex items-center ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                  数字を含む
                </div>
                <div className={`flex items-center ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.hasSpecialChar ? '✓' : '○'}</span>
                  特殊文字(@$!%*?&)を含む
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm"> {error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-600 text-sm"> {message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isResetting || !Object.values(passwordRequirements).every(req => req)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResetting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  更新中...
                </div>
              ) : (
                'パスワードを変更'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminPasswordResetPage; 