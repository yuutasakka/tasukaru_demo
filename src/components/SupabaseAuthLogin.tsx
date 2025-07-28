import React, { useState } from 'react';
import { supabase } from './supabaseClient';

interface SupabaseAuthLoginProps {
  onLogin: () => void;
  onNavigateHome: () => void;
}

export const SupabaseAuthLogin: React.FC<SupabaseAuthLoginProps> = ({ onLogin, onNavigateHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // メール／パスワードでログイン
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else if (error.message.includes('Email not confirmed')) {
          setError('メールアドレスの確認が完了していません。確認メールをご確認ください。');
        } else {
          setError(`ログインエラー: ${error.message}`);
        }
      } else if (data.user) {
        // プロファイルからパスワード変更要求をチェック
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('requires_password_change')
          .eq('id', data.user.id)
          .single();

        // 最後にログイン時刻を更新
        if (!profileError) {
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);
        }

        onLogin();
      }
    } catch (err) {
      setError('ログイン処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 新規ユーザー登録
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });
      
      if (error) {
        setError(`登録エラー: ${error.message}`);
      } else {
        setError('確認メールを送信しました。メールをご確認ください。');
      }
    } catch (err) {
      setError('登録処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // OAuth（Google / GitHub）
  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${window.location.origin}/admin`
        }
      });
      
      if (error) {
        setError(`OAuth認証エラー: ${error.message}`);
      }
    } catch (err) {
      setError('OAuth認証でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {isSignUp ? '管理者登録' : '管理画面ログイン'}
          </h2>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleEmailLogin} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="パスワードを入力"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className={`border rounded-lg p-3 ${
              error.includes('確認メール') 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <p className={`text-sm ${
                error.includes('確認メール') ? 'text-green-700' : 'text-red-700'
              }`}>
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                {isSignUp ? '登録中...' : 'ログイン中...'}
              </div>
            ) : (
              isSignUp ? 'アカウント作成' : 'メールでログイン'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-800 text-sm transition-colors duration-200"
          >
            {isSignUp ? 'すでにアカウントをお持ちですか？ログイン' : '新規アカウント作成'}
          </button>
        </div>


        <div className="mt-8 text-center">
          <button
            onClick={onNavigateHome}
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors duration-200"
          >
            ← ホームページに戻る
          </button>
        </div>
      </div>
    </div>
  );
};