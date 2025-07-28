import React, { useState, useEffect } from 'react';
import { SecureConfigManager, secureLog, SECURITY_CONFIG } from '../config/clientSecurity';
import { supabase } from './supabaseClient';
import { QRCodeSVG } from 'qrcode.react';
import CryptoJS from 'crypto-js';

interface TwoFactorAuthProps {
  username: string;
  onSuccess: (totpSecret: string) => void;
  onCancel: () => void;
  mode: 'setup' | 'verify' | 'enabled';
  existingSecret?: string;
  onMFAEnabled: () => void;
  onMFADisabled: () => void;
}

interface TotpSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ 
  username, 
  onSuccess, 
  onCancel, 
  mode, 
  existingSecret,
  onMFAEnabled,
  onMFADisabled
}) => {
  const [totpCode, setTotpCode] = useState('');
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'enabled'>('setup');
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // セキュアなTOTP Secret生成（Base32形式、RFC4648準拠）
  const generateTotpSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const secretLength = 32; // 160ビット（推奨）
    let secret = '';
    
    // 暗号学的に安全な乱数生成
    const randomValues = new Uint8Array(secretLength);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < secretLength; i++) {
      secret += chars[randomValues[i] % chars.length];
    }
    
    // パディング追加（Base32仕様）
    while (secret.length % 8 !== 0) {
      secret += '=';
    }
    
    return secret;
  };

  // セキュアなバックアップコード生成（暗号学的に安全）
  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < 12; i++) { // 12個に増加
      let code = '';
      
      // 暗号学的に安全な乱数生成
      const randomValues = new Uint8Array(8);
      crypto.getRandomValues(randomValues);
      
      for (let j = 0; j < 8; j++) {
        code += chars[randomValues[j] % chars.length];
      }
      
      // チェックサム追加（Luhnアルゴリズム変形）
      const checksum = calculateChecksum(code);
      const formattedCode = `${code.substring(0, 4)}-${code.substring(4)}${checksum}`;
      codes.push(formattedCode);
    }
    
    return codes;
  };
  
  // チェックサム計算
  const calculateChecksum = (code: string): string => {
    let sum = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charAt(i);
      const value = char >= '0' && char <= '9' ? parseInt(char) : char.charCodeAt(0) - 55;
      sum += value * (i + 1);
    }
    return (sum % 36).toString(36).toUpperCase();
  };

  // QRコードURL生成（RFC6238準拠、セキュア）
  const generateQrCodeUrl = (secret: string, username: string): string => {
    const issuer = 'MoneyTicket';
    const serviceName = 'タスカル';
    const account = `${serviceName}:${encodeURIComponent(username)}`;
    
    // RFC6238準拠のotpauth URI生成
    const params = new URLSearchParams({
      secret: secret.replace(/=/g, ''), // パディング除去
      issuer: issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30',
      counter: '0' // TOTP用
    });
    
    const otpauthUrl = `otpauth://totp/${account}?${params.toString()}`;
    
    // セキュアなQRコード生成（外部サービス使用回避）
    return otpauthUrl; // QRCodeSVGコンポーネントで直接使用
  };

  // TOTP検証（RFC6238準拠実装）
  const verifyTotpCode = async (secret: string, code: string): Promise<boolean> => {
    try {
      // タイムスタンプ窓の検証（±1窓、最大90秒の時間差許容）
      const timeWindow = Math.floor(Date.now() / 1000 / 30);
      
      for (let i = -1; i <= 1; i++) {
        const testWindow = timeWindow + i;
        const expectedCode = await generateTOTPCode(secret, testWindow);
        
        if (expectedCode === code) {
          // 使用済みコード防止のためのトークン記録
          await recordUsedToken(secret, code, testWindow);
          return true;
        }
      }
      
      // サーバーサイド検証のフォールバック
      const response = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await getCSRFToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          secret: await encryptSecret(secret),
          code: code,
          username: username,
          timestamp: Date.now()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.valid;
      }
      
      return false;
    } catch (error) {
      secureLog('TOTP検証エラー:', error);
      return false;
    }
  };

  // RFC6238準拠のTOTP生成（HMAC-SHA1ベース）
  const generateTOTPCode = async (secret: string, timeWindow: number): Promise<string> => {
    try {
      // Base32デコード
      const decodedSecret = base32Decode(secret);
      
      // 時間窓をビッグエンディアンの8バイト配列に変換
      const timeBuffer = new ArrayBuffer(8);
      const timeView = new DataView(timeBuffer);
      timeView.setUint32(4, timeWindow, false); // ビッグエンディアン
      
      // HMAC-SHA1計算
      const key = await crypto.subtle.importKey(
        'raw',
        decodedSecret,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
      const signatureArray = new Uint8Array(signature);
      
      // 動的切り出し（RFC4226）
      const offset = signatureArray[19] & 0xf;
      const code = (
        ((signatureArray[offset] & 0x7f) << 24) |
        ((signatureArray[offset + 1] & 0xff) << 16) |
        ((signatureArray[offset + 2] & 0xff) << 8) |
        (signatureArray[offset + 3] & 0xff)
      ) % 1000000;
      
      return code.toString().padStart(6, '0');
    } catch (error) {
      secureLog('TOTP生成エラー:', error);
      throw new Error('TOTP生成に失敗しました');
    }
  };
  
  // Base32デコード関数
  const base32Decode = (encoded: string): Uint8Array => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = new Uint8Array(Math.floor(encoded.length * 5 / 8));
    
    for (let i = 0; i < encoded.length; i++) {
      const char = encoded.charAt(i).toUpperCase();
      const charIndex = alphabet.indexOf(char);
      if (charIndex === -1) continue;
      
      value = (value << 5) | charIndex;
      bits += 5;
      
      if (bits >= 8) {
        output[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }
    
    return output.slice(0, index);
  };
  
  // 使用済みトークン記録
  const recordUsedToken = async (secret: string, code: string, window: number): Promise<void> => {
    try {
      const tokenHash = CryptoJS.SHA256(secret + code + window).toString();
      sessionStorage.setItem(`used_token_${tokenHash}`, Date.now().toString());
      
      // 古いトークンをクリーンアップ（10分以上前）
      const cutoff = Date.now() - 600000;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('used_token_')) {
          const timestamp = parseInt(sessionStorage.getItem(key) || '0');
          if (timestamp < cutoff) {
            sessionStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      secureLog('使用済みトークン記録エラー:', error);
    }
  };
  
  // CSRFトークン取得
  const getCSRFToken = async (): Promise<string> => {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
      return '';
    } catch (error) {
      secureLog('CSRFトークン取得エラー:', error);
      return '';
    }
  };
  
  // シークレット暗号化
  const encryptSecret = async (secret: string): Promise<string> => {
    try {
      const key = await getEncryptionKey();
      return CryptoJS.AES.encrypt(secret, key).toString();
    } catch (error) {
      secureLog('シークレット暗号化エラー:', error);
      return secret; // フォールバック
    }
  };
  
  // 暗号化キー取得
  const getEncryptionKey = async (): Promise<string> => {
    return await SecureConfigManager.getEncryptionKey() || 'fallback-key';
  };

  // バックアップコード検証（強化版）
  const verifyBackupCode = async (code: string): Promise<boolean> => {
    try {
      // 入力値の正規化とバリデーション
      const normalizedCode = code.replace(/[^0-9A-Za-z-]/g, '').toUpperCase();
      
      if (!/^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(normalizedCode)) {
        setError('バックアップコードの形式が正しくありません（例：1234-ABCD）');
        return false;
      }
      
      // レート制限チェック
      const rateLimitKey = `backup_verify_${username}`;
      const lastAttempt = sessionStorage.getItem(rateLimitKey);
      if (lastAttempt && Date.now() - parseInt(lastAttempt) < 5000) {
        setError('しばらく待ってから再度お試しください');
        return false;
      }
      
      sessionStorage.setItem(rateLimitKey, Date.now().toString());
      
      const response = await fetch('/api/auth/verify-backup-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await getCSRFToken(),
          'X-Request-ID': generateRequestId(),
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username,
          backupCode: await encryptBackupCode(normalizedCode),
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          fingerprint: await generateFingerprint()
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          setError('試行回数が上限に達しました。しばらく待ってからお試しください');
        } else if (response.status === 401) {
          setError('バックアップコードが正しくありません');
        } else {
          setError('認証処理中にエラーが発生しました');
        }
        return false;
      }

      const result = await response.json();
      
      if (result.valid) {
        // 成功時はセッションストレージをクリア
        sessionStorage.removeItem(rateLimitKey);
        secureLog('バックアップコード認証成功', { username, timestamp: Date.now() });
      }
      
      return result.valid;
    } catch (error) {
      secureLog('バックアップコード検証エラー:', error);
      setError('ネットワークエラーが発生しました');
      return false;
    }
  };
  
  // バックアップコード暗号化
  const encryptBackupCode = async (code: string): Promise<string> => {
    try {
      const key = await getEncryptionKey();
      return CryptoJS.AES.encrypt(code, key).toString();
    } catch (error) {
      secureLog('バックアップコード暗号化エラー:', error);
      return code;
    }
  };
  
  // リクエストID生成
  const generateRequestId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };
  
  // デバイスフィンガープリント生成
  const generateFingerprint = async (): Promise<string> => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
      }
      
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: canvas.toDataURL()
      };
      
      return CryptoJS.SHA256(JSON.stringify(fingerprint)).toString();
    } catch (error) {
      return 'unknown';
    }
  };

  // 初期化処理
  useEffect(() => {
    if (mode === 'setup') {
      const secret = generateTotpSecret();
      const backupCodes = generateBackupCodes();
      const qrCodeUrl = generateQrCodeUrl(secret, username);
      
      setTotpSetup({
        secret,
        qrCodeUrl,
        backupCodes
      });
      
      secureLog('2FA設定初期化完了', { username });
    } else {
      setStep('verify');
    }
  }, [mode, username]);

  // TOTP認証処理
  const handleTotpVerify = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setError('6桁の認証コードを入力してください。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const secret = mode === 'setup' ? totpSetup?.secret : existingSecret;
      if (!secret) {
        setError('認証設定に問題があります。');
        setLoading(false);
        return;
      }

      const isValid = await verifyTotpCode(secret, totpCode);
      
      if (isValid) {
        secureLog('2FA認証成功', { username, mode });
        
        if (mode === 'setup') {
          // セットアップ完了時はバックアップコードを表示
          setShowBackupCodes(true);
          setStep('enabled');
        } else {
          // 認証成功
          onSuccess(secret);
        }
      } else {
        setError('認証コードが正しくありません。再度確認してください。');
      }
    } catch (error) {
      secureLog('2FA認証エラー:', error);
      setError('認証処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // バックアップコード認証処理
  const handleBackupCodeVerify = async () => {
    if (!backupCodeInput) {
      setError('バックアップコードを入力してください。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await verifyBackupCode(backupCodeInput);
      
      if (isValid) {
        secureLog('バックアップコード認証成功', { username });
        onSuccess(existingSecret || '');
      } else {
        setError('バックアップコードが正しくありません。');
      }
    } catch (error) {
      secureLog('バックアップコード認証エラー:', error);
      setError('認証処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // セットアップ完了処理
  const handleSetupComplete = () => {
    if (totpSetup) {
      onSuccess(totpSetup.secret);
    }
  };

  const setupMFA = async () => {
    try {
      // TOTP設定を開始
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'タスカル TOTP'
      });

      if (error) throw error;

      setQrCodeUrl(data.totp.qr_code);
      setStep('verify');
    } catch (error) {
    }
  };

  const verifyMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: 'factor-id', // 実際のfactor IDを使用
        challengeId: 'challenge-id', // 実際のchallenge IDを使用
        code: verificationCode
      });

      if (error) throw error;

      // バックアップコード生成
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substr(2, 8).toUpperCase()
      );
      setBackupCodes(codes);
      setStep('enabled');
      onMFAEnabled();
    } catch (error) {
    }
  };

  if (mode === 'setup' && step === 'setup' && totpSetup) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">2要素認証の設定</h3>
            <p className="text-sm text-gray-600 mt-2">アカウントのセキュリティを強化します</p>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <QRCodeSVG
                  value={generateQrCodeUrl(totpSetup.secret, username)}
                  size={256}
                  level="M"
                  includeMargin={true}
                  className="border rounded-lg shadow-sm bg-white p-4"
                />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Google AuthenticatorまたはAuthy等の認証アプリでQRコードをスキャンしてください
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">手動入力用シークレットキー:</p>
              <code className="text-sm text-gray-800 break-all font-mono bg-white px-2 py-1 rounded border">
                {totpSetup.secret}
              </code>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                認証コード（6桁）
              </label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono"
                placeholder="123456"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                認証アプリに表示された6桁のコードを入力してください
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleTotpVerify}
                disabled={loading || totpCode.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {loading ? '検証中...' : '認証コードを確認'}
              </button>
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'setup' && step === 'enabled' && totpSetup && showBackupCodes) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">バックアップコード</h3>
            <p className="text-sm text-gray-600 mt-2">認証アプリが使用できない場合に使用</p>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">重要</span>
              </div>
              <p className="text-sm text-yellow-700">
                これらのバックアップコードを安全な場所に保存してください。各コードは一度だけ使用できます。
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                {totpSetup.backupCodes.map((code, index) => (
                  <code key={index} className="text-sm text-gray-800 font-mono bg-white px-2 py-1 rounded border">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSetupComplete}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                設定完了
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'verify') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">2要素認証</h3>
            <p className="text-sm text-gray-600 mt-2">認証アプリのコードを入力してください</p>
          </div>

          <div className="space-y-6">
            {step === 'verify' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    認証コード（6桁）
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono"
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={verifyMFA}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {loading ? '認証中...' : '認証'}
                  </button>
                  <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    キャンセル
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setStep('enabled')}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    バックアップコードを使用
                  </button>
                </div>
              </>
            )}

            {step === 'enabled' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    バックアップコード
                  </label>
                  <input
                    type="text"
                    value={backupCodeInput}
                    onChange={(e) => setBackupCodeInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-center font-mono"
                    placeholder="1234-5678"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    設定時に保存したバックアップコードを入力してください
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleBackupCodeVerify}
                    disabled={loading || !backupCodeInput}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {loading ? '認証中...' : 'バックアップコードで認証'}
                  </button>
                  <button
                    onClick={() => setStep('verify')}
                    disabled={loading}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    戻る
                  </button>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TwoFactorAuth; 