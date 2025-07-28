// CSRF保護ユーティリティ
import crypto from 'crypto';

interface CSRFToken {
  token: string;
  expiresAt: Date;
  sessionId: string;
}

export class CSRFProtection {
  private static tokens = new Map<string, CSRFToken>();
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1時間

  /**
   * CSRFトークンの生成
   */
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY);

    this.tokens.set(token, {
      token,
      expiresAt,
      sessionId
    });

    // 古いトークンのクリーンアップ
    this.cleanupExpiredTokens();

    return token;
  }

  /**
   * CSRFトークンの検証
   */
  static verifyToken(token: string, sessionId: string): boolean {
    const storedToken = this.tokens.get(token);

    if (!storedToken) {
      return false;
    }

    // 有効期限チェック
    if (new Date() > storedToken.expiresAt) {
      this.tokens.delete(token);
      return false;
    }

    // セッションIDの一致確認
    if (storedToken.sessionId !== sessionId) {
      return false;
    }

    // ダブルサブミット防止のため、使用済みトークンを削除
    this.tokens.delete(token);

    return true;
  }

  /**
   * 期限切れトークンのクリーンアップ
   */
  private static cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Double Submit Cookie Pattern の実装
   */
  static generateDoubleSubmitToken(secret: string): {
    cookieToken: string;
    headerToken: string;
  } {
    const randomValue = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const data = `${randomValue}.${timestamp}`;
    
    // HMAC署名
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    const token = `${data}.${signature}`;
    
    return {
      cookieToken: token,
      headerToken: token
    };
  }

  /**
   * Double Submit Cookie の検証
   */
  static verifyDoubleSubmitToken(
    cookieToken: string,
    headerToken: string,
    secret: string
  ): boolean {
    // トークンが一致しない場合
    if (cookieToken !== headerToken) {
      return false;
    }

    const parts = cookieToken.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [randomValue, timestamp, signature] = parts;
    const data = `${randomValue}.${timestamp}`;

    // タイムスタンプの検証（24時間以内）
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    if (isNaN(tokenTime) || now - tokenTime > 24 * 60 * 60 * 1000) {
      return false;
    }

    // 署名の検証
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');

    return signature === expectedSignature;
  }

  /**
   * SameSite Cookieの設定値を生成
   */
  static getCookieOptions(isProduction: boolean): {
    sameSite: 'strict' | 'lax' | 'none';
    secure: boolean;
    httpOnly: boolean;
    path: string;
    maxAge: number;
  } {
    return {
      sameSite: isProduction ? 'strict' : 'lax',
      secure: isProduction,
      httpOnly: true,
      path: '/',
      maxAge: this.TOKEN_EXPIRY
    };
  }
}

// React Hook for CSRF protection
export function useCSRFToken() {
  const [csrfToken, setCSRFToken] = useState<string>('');

  useEffect(() => {
    // CSRFトークンをメタタグから取得
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      setCSRFToken(metaTag.getAttribute('content') || '');
    } else {
      // APIからトークンを取得
      fetch('/api/csrf-token', {
        credentials: 'same-origin'
      })
        .then(res => res.json())
        .then(data => setCSRFToken(data.token))
        .catch(err => console.error('Failed to fetch CSRF token:', err));
    }
  }, []);

  return csrfToken;
}

// Axios インターセプター for CSRF
export function setupAxiosCSRF(axios: any, getToken: () => string) {
  axios.interceptors.request.use(
    (config: any) => {
      const token = getToken();
      if (token && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
        config.headers['X-CSRF-Token'] = token;
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );
}

import { useState, useEffect } from 'react';