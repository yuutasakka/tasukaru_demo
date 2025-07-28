import React, { useState, useEffect } from 'react';
import { DiagnosisAnswers } from './DiagnosisFlow';
import { measureAsync, PERF_TARGETS } from './PerformanceMonitor';

interface SMSAuthFlowProps {
  diagnosisAnswers: DiagnosisAnswers;
  onAuthComplete: (phoneNumber: string) => void;
  onCancel: () => void;
}


const SMSAuthFlow: React.FC<SMSAuthFlowProps> = ({ 
  diagnosisAnswers, 
  onAuthComplete, 
  onCancel 
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [resendCount, setResendCount] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // OTPタイマー（5分）
  useEffect(() => {
    if (step === 'otp' && remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, remainingTime]);

  // 電話番号の正規化（全角数字を半角に変換 + ハイフン自動削除）
  const normalizePhoneNumber = (phone: string): string => {
    // 全角数字を半角数字に変換
    const halfWidthPhone = phone.replace(/[０-９]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    });
    // 数字以外を削除
    return halfWidthPhone.replace(/\D/g, '');
  };

  // 電話番号のバリデーション
  const validatePhoneNumber = (phone: string): boolean => {
    const normalized = normalizePhoneNumber(phone);
    return /^(090|080|070)\d{8}$/.test(normalized);
  };

  // 電話番号入力ハンドラ
  const handlePhoneNumberChange = (value: string) => {
    const normalized = normalizePhoneNumber(value);
    if (normalized.length <= 11) {
      setPhoneNumber(normalized);
    }
    setError('');
  };

  // 既存認証済みチェック（Cookie経由）
  const checkExistingAuth = async (phone: string): Promise<boolean> => {
    try {
      // API経由でサーバーサイドで確認
      const response = await fetch('/api/auth-check', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Cookieを送信
      });
      
      if (response.ok) {
        const { authenticated, user } = await response.json();
        // 同じ電話番号で認証済みかチェック
        return authenticated && user?.phoneNumber === normalizePhoneNumber(phone);
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  // SMS送信処理
  const handleSendSMS = async () => {
    const performSendSMS = async () => {
      if (!validatePhoneNumber(phoneNumber)) {
        setError('正しい電話番号を入力してください（090/080/070で始まる11桁）');
        return;
      }

      if (!agreedToTerms) {
        setError('利用規約とプライバシーポリシーへの同意が必要です');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        // 既存認証済みチェック
        const isAlreadyVerified = await checkExistingAuth(phoneNumber);
        if (isAlreadyVerified) {
          setError('すでに認証済みです。再診断できません。');
          setIsLoading(false);
          return;
        }

        // 1時間あたり3回制限チェック（実装は後で）
        if (resendCount >= 3) {
          setError('送信回数の上限に達しました。1時間後にお試しください。');
          setIsLoading(false);
          return;
        }

        // API経由でサーバーサイドでSMS送信
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber })
        });
        
        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || 'SMS送信に失敗しました');
        }
        
        // 成功時の処理
        setStep('otp');
        setRemainingTime(300); // 5分
        setResendCount(prev => prev + 1);
        setCanResend(false);
        
        // 再送可能までの時間（60秒）
        setTimeout(() => {
          setCanResend(true);
        }, 60000);

      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('SMS送信に失敗しました。後ほどお試しください。');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (process.env.NODE_ENV !== 'production') {
      await measureAsync('SMS送信', PERF_TARGETS.smsSend, performSendSMS);
    } else {
      await performSendSMS();
    }
  };

  // OTP認証
  const handleVerify = async (otp: string) => {
    const performVerify = async () => {
      if (otp.length !== 6) {
        setError('6桁のOTPを入力してください。');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        // API経由でサーバーサイドでOTP検証
        const response = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber, otp })
        });
        
        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || '認証に失敗しました');
        }
        
        const result = await response.json();
        const isValid = result.success;
        
        if (isValid) {
          // 認証成功
          // ユーザーデータの保存処理はクライアントサイドで完結
          
          onAuthComplete(phoneNumber);
        } else {
          setError('認証コードが正しくありません。');
          // 失敗回数をカウントアップ（5回でIPブロック）
        }

      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('認証に失敗しました。もう一度お試しください。');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (process.env.NODE_ENV !== 'production') {
      await measureAsync('認証処理', PERF_TARGETS.smsVerify, performVerify);
    } else {
      await performVerify();
    }
  };

  // 再送処理
  const handleResendOTP = () => {
    if (canResend && resendCount < 3) {
      handleSendSMS();
    }
  };

  // 電話番号変更処理
  const handleChangePhoneNumber = () => {
    setStep('phone');
    setOtpInput('');
    setError('');
    setRemainingTime(0);
    setCanResend(true);
    setResendCount(0);
  };

  // 時間フォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 電話番号表示用フォーマット
  const formatPhoneForDisplay = (phone: string): string => {
    if (phone.length >= 8) {
      return `${phone.slice(0, 3)}-****-${phone.slice(-4)}`;
    }
    return phone;
  };

  return (
    <div className="py-10 md:py-16">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-gradient-to-br from-white via-white to-cyan-50 rounded-3xl shadow-2xl p-8 flex flex-col items-center min-h-[420px] border border-cyan-100">
          
          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">
             電話番号認証
          </h2>
          
          {/* Description */}
          <p className="text-base md:text-lg text-gray-600 mb-6 text-center leading-relaxed">
            {step === 'phone' 
              ? 'ご本人確認のため、電話番号を入力してください。' 
              : `${formatPhoneForDisplay(phoneNumber)} に送信された6桁の認証コードを入力してください。`}
          </p>
          
          {/* Error Message */}
          {error && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center font-medium">
               {error}
            </div>
          )}
          
          {/* Phone Input Step */}
          {step === 'phone' && (
            <div className="w-full space-y-6">
              <div className="relative">
                <input
                  type="tel"
                  placeholder="例: 09012345678"
                  value={phoneNumber}
                  onChange={e => handlePhoneNumberChange(e.target.value)}
                  maxLength={11}
                  disabled={isLoading}
                  className="w-full text-lg md:text-xl px-4 py-4 border-2 border-cyan-200 rounded-xl text-center font-mono tracking-wider focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm">🇯🇵</span>
                </div>
              </div>
              
              <button
                onClick={handleSendSMS}
                disabled={phoneNumber.length !== 11 || isLoading || !agreedToTerms}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none min-h-[56px] ${
                  phoneNumber.length === 11 && !isLoading && agreedToTerms
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:ring-cyan-500'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>送信中...</span>
                  </div>
                ) : (
                  '📨 SMS認証コードを送信'
                )}
              </button>

              {/* 利用規約・プライバシーポリシー同意チェックボックス */}
              <div className="flex items-start space-x-3">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="terms-agreement-sms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-all duration-200 ${
                    agreedToTerms 
                      ? 'bg-cyan-500 border-cyan-500' 
                      : 'bg-white border-gray-300 hover:border-cyan-400'
                  }`}
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  >
                    {agreedToTerms && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <label htmlFor="terms-agreement-sms" className="text-sm text-gray-700 leading-relaxed cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                  <a href="/privacy-policy" target="_blank" className="text-cyan-600 hover:text-cyan-800 underline">プライバシーポリシー</a>
                  および
                  <a href="/terms-of-service" target="_blank" className="text-cyan-600 hover:text-cyan-800 underline">利用規約</a>
                  に同意します
                </label>
              </div>
            </div>
          )}
          
          {/* OTP Input Step */}
          {step === 'otp' && (
            <div className="w-full space-y-6">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="6桁の認証コード"
                  disabled={isLoading}
                  className="w-full text-2xl md:text-3xl px-4 py-4 border-2 border-cyan-200 rounded-xl text-center font-mono tracking-[0.5em] bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                />
              </div>
              
              {/* Timer */}
              <div className="text-center">
                <div className={`text-base font-medium px-4 py-2 rounded-lg ${
                  remainingTime > 0 
                    ? 'text-cyan-600 bg-cyan-50' 
                    : 'text-red-600 bg-red-50'
                }`}>
                  {remainingTime > 0 
                    ? `⏰ 有効期限: ${formatTime(remainingTime)}` 
                    : '⏰ 認証コードの有効期限が切れました'
                  }
                </div>
              </div>
              
              {/* Verify Button */}
              <button
                onClick={() => handleVerify(otpInput)}
                disabled={otpInput.length !== 6 || isLoading}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none min-h-[56px] ${
                  otpInput.length === 6 && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:ring-blue-500'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>認証中...</span>
                  </div>
                ) : (
                  ' 認証する'
                )}
              </button>
              
              {/* Resend Button */}
              <button
                onClick={handleResendOTP}
                disabled={!canResend || resendCount >= 3 || isLoading}
                className={`w-full py-3 px-6 rounded-xl font-medium text-base transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                  canResend && resendCount < 3 && !isLoading
                    ? 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500'
                    : 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                🔄 認証コードを再送信 {resendCount > 0 && `(${resendCount}/3)`}
              </button>
              
              {/* Phone Number Change Button */}
              <button
                onClick={handleChangePhoneNumber}
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-xl font-medium text-base transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 電話番号を変更
              </button>
            </div>
          )}
          
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="mt-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded px-2 py-1"
          >
            ← 戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default SMSAuthFlow; 