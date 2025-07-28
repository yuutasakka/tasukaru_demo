import React, { useState, useEffect } from 'react';

interface DemoPhoneVerificationProps {
  demoToken: string;
  onVerificationSuccess: (sessionData: any) => void;
  onBack: () => void;
}

type DemoStep = 'phone-input' | 'otp-verification' | 'success' | 'error';

const DEMO_PHONE_NUMBERS = [
  '09000000001', '09000000002', '09000000003', '09000000004', '09000000005',
  '09000000006', '09000000007', '09000000008', '09000000009', '09000000010'
];

export const DemoPhoneVerification: React.FC<DemoPhoneVerificationProps> = ({
  demoToken,
  onVerificationSuccess,
  onBack
}) => {
  const [step, setStep] = useState<DemoStep>('phone-input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // カウントダウンタイマー
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 電話番号の正規化
  const normalizePhoneNumber = (phone: string): string => {
    return phone.replace(/[^\d]/g, '');
  };

  // デモ用電話番号の検証
  const validateDemoPhoneNumber = (phone: string): boolean => {
    const normalized = normalizePhoneNumber(phone);
    return DEMO_PHONE_NUMBERS.includes(normalized);
  };

  // デモOTP送信
  const handleSendDemoOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!validateDemoPhoneNumber(phoneNumber)) {
        throw new Error('デモ用電話番号を入力してください（例: 090-0000-0001）');
      }

      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      
      const response = await fetch('/api/demo-send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          demoToken: demoToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'デモ用SMS送信に失敗しました');
      }

      const result = await response.json();
      
      if (result.success) {
        setStep('otp-verification');
        setCountdown(60);
      } else {
        throw new Error(result.error || 'デモ用SMS送信に失敗しました');
      }
      
    } catch (error: any) {
      setError(error.message || 'デモ用SMS送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // デモOTP検証
  const handleVerifyDemoOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!otpCode || otpCode.length !== 6) {
        throw new Error('6桁の認証コードを入力してください');
      }

      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      
      const response = await fetch('/api/demo-verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          code: otpCode,
          demoToken: demoToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setFailedAttempts(prev => prev + 1);
        throw new Error(errorData.error || 'デモ用認証に失敗しました');
      }

      const result = await response.json();
      
      if (result.success) {
        setStep('success');
        
        // デモセッションデータを作成
        const demoSessionData = {
          phoneNumber: normalizedPhone,
          demoToken: demoToken,
          smsVerified: true,
          isDemo: true,
          sessionId: result.sessionId,
          verifiedAt: new Date().toISOString()
        };

        // 2秒後に成功コールバックを呼ぶ
        setTimeout(() => {
          onVerificationSuccess(demoSessionData);
        }, 2000);
      } else {
        setFailedAttempts(prev => prev + 1);
        throw new Error(result.error || 'デモ用認証に失敗しました');
      }
      
    } catch (error: any) {
      setError(error.message || 'デモ用認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // デモOTP再送信
  const handleResendDemoOTP = async () => {
    if (countdown > 0) return;
    
    setError(null);
    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      
      const response = await fetch('/api/demo-send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          demoToken: demoToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'デモ用SMS再送信に失敗しました');
      }

      setCountdown(60);
      
    } catch (error: any) {
      setError(error.message || 'デモ用SMS再送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        
        {/* デモ環境ヘッダー */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-t-2xl p-4 mb-0">
          <div className="flex items-center justify-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
            </svg>
            <span className="font-bold text-lg">🧪 デモ環境</span>
          </div>
          <p className="text-center text-sm opacity-90 mt-1">
            SMS認証システムの安全な体験版
          </p>
        </div>

        {/* 電話番号入力ステップ */}
        {step === 'phone-input' && (
          <div className="bg-white rounded-b-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">デモ用電話番号を入力</h3>
              <p className="text-gray-600 text-sm">
                以下のデモ用電話番号のいずれかを入力してください
              </p>
            </div>

            {/* デモ用電話番号一覧 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-yellow-800 mb-3 text-sm">使用可能なデモ用電話番号</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {DEMO_PHONE_NUMBERS.slice(0, 6).map((phone, index) => (
                  <button
                    key={phone}
                    onClick={() => setPhoneNumber(phone)}
                    className="text-left p-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors font-mono text-xs"
                  >
                    {phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                  </button>
                ))}
              </div>
              <p className="text-yellow-700 text-xs mt-3">
                <strong>認証コード:</strong> <span className="font-mono bg-yellow-200 px-1 rounded">123456</span>
              </p>
            </div>

            <form onSubmit={handleSendDemoOTP} className="space-y-6">
              <div>
                <label htmlFor="demo-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  デモ用電話番号
                </label>
                <input
                  type="tel"
                  id="demo-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="090-0000-0001"
                  className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 shadow-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  上記のデモ用電話番号のいずれかを入力してください
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    デモ認証コード準備中...
                  </div>
                ) : (
                  <>
                    <span className="text-lg">デモ認証コードを取得</span>
                    <div className="text-sm opacity-90 mt-1">実際のSMSは送信されません</div>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-800 py-2 transition-colors duration-200 text-sm"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                戻る
              </button>
            </div>
          </div>
        )}

        {/* OTP検証ステップ */}
        {step === 'otp-verification' && (
          <div className="bg-white rounded-b-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">デモ認証コードを入力</h3>
              <p className="text-gray-600 text-sm mb-2">
                デモ用電話番号: <strong>{phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</strong>
              </p>
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm font-semibold">
                  デモ認証コード: <span className="font-mono text-lg">123456</span>
                </p>
                <p className="text-yellow-700 text-xs mt-1">
                  実際のSMSは送信されません。上記コードを入力してください。
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyDemoOTP} className="space-y-6">
              <div>
                <label htmlFor="demo-otp-input" className="sr-only">6桁のデモ認証コードを入力</label>
                <input
                  id="demo-otp-input"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-4 text-center text-3xl font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 tracking-widest shadow-sm bg-gray-50"
                  maxLength={6}
                  required
                />
                {otpCode.length > 0 && otpCode.length < 6 && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    あと{6 - otpCode.length}桁入力してください
                  </p>
                )}
              </div>

              {/* 失敗回数表示 */}
              {failedAttempts > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-orange-700 text-sm text-center">
                    認証失敗: {failedAttempts}/5回<br />
                    <span className="text-xs">デモ認証コード: 123456</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    デモ認証中...
                  </div>
                ) : (
                  <>
                    <span className="text-lg">デモ認証を完了</span>
                    <div className="text-sm opacity-90 mt-1">デモ診断結果を表示します</div>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              {countdown > 0 ? (
                <p className="text-gray-500 text-sm">
                  再送信まで <strong className="font-mono">{countdown}秒</strong>
                </p>
              ) : (
                <button
                  onClick={handleResendDemoOTP}
                  disabled={loading}
                  className="text-yellow-600 hover:text-yellow-800 text-sm transition-colors duration-200 font-medium"
                >
                  デモ認証コードを再取得
                </button>
              )}

              <button
                onClick={() => {
                  setStep('phone-input');
                  setError(null);
                  setCountdown(0);
                  setFailedAttempts(0);
                }}
                className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors duration-200 text-sm"
              >
                電話番号を変更
              </button>
            </div>
          </div>
        )}

        {/* 成功ステップ */}
        {step === 'success' && (
          <div className="bg-white rounded-b-2xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">デモ認証完了！</h3>
            <p className="text-gray-600 mb-6 text-lg">
              デモ認証が正常に完了しました。<br />
              <strong className="text-yellow-600">デモ診断結果</strong>ページに移動します...
            </p>
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
            <p className="text-sm text-gray-500">
              しばらくお待ちください...
            </p>
          </div>
        )}

        {/* 画面下部の信頼性表示 */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <span className="text-yellow-500 mr-2">•</span>
              デモ環境
            </div>
            <div className="flex items-center">
              <span className="text-orange-500 mr-2">•</span>
              安全な体験
            </div>
            <div className="flex items-center">
              <span className="text-red-500 mr-2">•</span>
              SMS送信なし
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            タスカル - デモ環境でシステムを安全に体験
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoPhoneVerification;