import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EnhancedRateLimiter } from '../utils/enhancedRateLimiter';
import { secureLog } from '../config/clientSecurity';

// Google reCAPTCHA v3の型定義
declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface DeviceInfo {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  touchSupport: boolean;
  webGLRenderer?: string;
}

interface EnhancedPhoneAuthProps {
  onSuccess: (phoneNumber: string) => void;
  onError: (error: string) => void;
}

export const EnhancedPhoneAuth: React.FC<EnhancedPhoneAuthProps> = ({
  onSuccess,
  onError
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [riskScore, setRiskScore] = useState(0);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [fingerprint, setFingerprint] = useState<string>('');
  
  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaWidgetId = useRef<number | null>(null);

  // デバイス情報を収集
  const collectDeviceInfo = useCallback((): DeviceInfo => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    let webGLRenderer: string | undefined;
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        webGLRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }

    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory,
      touchSupport: 'ontouchstart' in window,
      webGLRenderer
    };
  }, []);

  // デバイスフィンガープリントを生成
  useEffect(() => {
    const deviceInfo = collectDeviceInfo();
    const fp = EnhancedRateLimiter.generateDeviceFingerprint(deviceInfo);
    setFingerprint(fp);
    secureLog('Device fingerprint generated', { fingerprint: fp.substring(0, 8) + '...' });
  }, [collectDeviceInfo]);

  // reCAPTCHA v3の初期化
  useEffect(() => {
    const loadReCaptcha = () => {
      if (window.grecaptcha) return;

      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadReCaptcha();
  }, []);

  // CAPTCHAを表示
  const showCaptcha = useCallback(() => {
    if (!window.grecaptcha || !captchaRef.current || captchaWidgetId.current !== null) return;

    try {
      captchaWidgetId.current = window.grecaptcha.render(captchaRef.current, {
        sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'your-site-key',
        size: 'invisible',
        callback: (token: string) => {
          setCaptchaToken(token);
          secureLog('CAPTCHA token received');
        },
        'expired-callback': () => {
          setCaptchaToken(null);
          secureLog('CAPTCHA token expired');
        }
      });
    } catch (error) {
      secureLog('CAPTCHA render error:', error);
    }
  }, []);

  // CAPTCHAを実行
  const executeCaptcha = useCallback(async (): Promise<string | null> => {
    if (!window.grecaptcha || captchaWidgetId.current === null) {
      secureLog('CAPTCHA not initialized');
      return null;
    }

    try {
      window.grecaptcha.execute(captchaWidgetId.current);
      
      // CAPTCHAトークンを待つ（最大10秒）
      let attempts = 0;
      while (!captchaToken && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      return captchaToken;
    } catch (error) {
      secureLog('CAPTCHA execution error:', error);
      return null;
    }
  }, [captchaToken]);

  // 電話番号の検証とフォーマット
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.startsWith('0')) {
      return digits.slice(0, 11); // 日本の携帯番号（11桁）
    }
    
    return digits;
  };

  // OTP送信処理
  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      onError('有効な電話番号を入力してください');
      return;
    }

    setLoading(true);

    try {
      // クライアントサイドでのリスク評価
      const deviceInfo = collectDeviceInfo();
      const context = {
        phoneNumber: phoneNumber.startsWith('0') ? '+81' + phoneNumber.substring(1) : phoneNumber,
        ipAddress: 'client-ip', // 実際のIPはサーバーサイドで取得
        fingerprint: deviceInfo,
        requestTime: new Date(),
        sessionId
      };

      const riskAssessment = await EnhancedRateLimiter.checkRateLimit(context);
      setRiskScore(riskAssessment.riskScore);
      
      if (!riskAssessment.allowed) {
        onError(riskAssessment.reason || '認証リクエストが拒否されました');
        setLoading(false);
        return;
      }

      // CAPTCHAが必要な場合
      if (riskAssessment.requireCaptcha || requireCaptcha) {
        setRequireCaptcha(true);
        showCaptcha();
        
        const token = await executeCaptcha();
        if (!token) {
          onError('CAPTCHA認証に失敗しました');
          setLoading(false);
          return;
        }
      }

      // APIリクエスト
      const response = await fetch('/api/send-otp-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'X-Device-Fingerprint': fingerprint,
          ...(captchaToken && { 'X-Captcha-Token': captchaToken })
        },
        body: JSON.stringify({
          phoneNumber: context.phoneNumber,
          deviceInfo: {
            fingerprint,
            userAgent: deviceInfo.userAgent,
            screenResolution: deviceInfo.screenResolution,
            timezone: deviceInfo.timezone,
            language: deviceInfo.language,
            platform: deviceInfo.platform
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // リスクスコアベースのエラーメッセージ
        if (response.status === 429) {
          if (data.riskFlags?.includes('PHONE_ENUMERATION')) {
            onError('不審なアクセスパターンが検出されました。しばらくしてからお試しください。');
          } else if (data.riskFlags?.includes('IP_HOPPING')) {
            onError('セキュリティ上の理由により、認証を一時的に制限しています。');
          } else {
            onError(data.error || 'SMS送信回数の上限に達しました');
          }
        } else {
          onError(data.error || 'SMS送信に失敗しました');
        }
        
        // 追加検証が必要な場合
        if (data.requireAdditionalVerification) {
          setRequireCaptcha(true);
        }
        
        setLoading(false);
        return;
      }

      setShowOtpInput(true);
      setLoading(false);
    } catch (error) {
      secureLog('OTP送信エラー:', error);
      onError('ネットワークエラーが発生しました');
      setLoading(false);
    }
  };

  // OTP検証処理
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      onError('6桁の認証コードを入力してください');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/verify-otp-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'X-Device-Fingerprint': fingerprint
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.startsWith('0') ? '+81' + phoneNumber.substring(1) : phoneNumber,
          otp,
          fingerprint
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setRemainingAttempts(data.remainingAttempts || 0);
        
        if (data.remainingAttempts === 0) {
          onError('認証コードの入力回数が上限に達しました。新しいコードを取得してください。');
          setShowOtpInput(false);
          setOtp('');
        } else {
          onError(data.error || '認証コードが正しくありません');
        }
        
        setLoading(false);
        return;
      }

      onSuccess(phoneNumber);
    } catch (error) {
      secureLog('OTP検証エラー:', error);
      onError('ネットワークエラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <div className="enhanced-phone-auth">
      <style>{`
        .enhanced-phone-auth {
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .risk-indicator {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .risk-low {
          background-color: #d4edda;
          color: #155724;
        }
        
        .risk-medium {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .risk-high {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .phone-input-group {
          margin-bottom: 20px;
        }
        
        .phone-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        
        .phone-input:focus {
          outline: none;
          border-color: #007bff;
        }
        
        .otp-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 20px;
          text-align: center;
          letter-spacing: 0.5em;
        }
        
        .submit-button {
          width: 100%;
          padding: 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .submit-button:hover:not(:disabled) {
          background-color: #0056b3;
        }
        
        .submit-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        .attempts-remaining {
          margin-top: 10px;
          font-size: 14px;
          color: #666;
        }
        
        .security-notice {
          margin-top: 15px;
          padding: 10px;
          background-color: #e3f2fd;
          border-radius: 8px;
          font-size: 13px;
          color: #1565c0;
        }
      `}</style>

      {/* リスクインジケーター */}
      {riskScore > 0 && (
        <div className={`risk-indicator ${
          riskScore < 30 ? 'risk-low' : 
          riskScore < 60 ? 'risk-medium' : 
          'risk-high'
        }`}>
          <span>
            {riskScore < 30 ? '✓ セキュリティチェック: 正常' :
             riskScore < 60 ? '⚠ 追加認証が必要な場合があります' :
             '🛡️ セキュリティ保護が有効になっています'}
          </span>
        </div>
      )}

      {!showOtpInput ? (
        <div className="phone-input-group">
          <label htmlFor="phone">電話番号</label>
          <input
            id="phone"
            type="tel"
            className="phone-input"
            placeholder="090-1234-5678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
            maxLength={11}
            disabled={loading}
          />
          <button
            className="submit-button"
            onClick={handleSendOTP}
            disabled={loading || !phoneNumber}
          >
            {loading ? '送信中...' : 'SMS認証コードを送信'}
          </button>
        </div>
      ) : (
        <div className="otp-input-group">
          <label htmlFor="otp">認証コード（6桁）</label>
          <input
            id="otp"
            type="text"
            className="otp-input"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            disabled={loading}
            autoComplete="one-time-code"
          />
          {remainingAttempts < 5 && (
            <div className="attempts-remaining">
              残り入力可能回数: {remainingAttempts}回
            </div>
          )}
          <button
            className="submit-button"
            onClick={handleVerifyOTP}
            disabled={loading || otp.length !== 6}
          >
            {loading ? '確認中...' : '認証する'}
          </button>
        </div>
      )}

      {/* 見えないCAPTCHA */}
      <div ref={captchaRef} style={{ display: 'none' }}></div>

      {/* セキュリティ通知 */}
      {requireCaptcha && (
        <div className="security-notice">
          🔒 セキュリティ保護のため、追加の確認を行っています
        </div>
      )}
    </div>
  );
};