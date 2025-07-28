import { CookieOptions } from 'express';

/**
 * セキュアなCookie設定
 */
export function getSecureCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,           // XSS対策: JavaScriptからアクセス不可
    secure: isProduction,     // HTTPS通信時のみ送信
    sameSite: 'strict',       // CSRF対策: 同一サイトからのみ送信
    maxAge: 30 * 60 * 1000,   // 30分（短期間の有効期限）
    path: '/',
    ...(isProduction && {
      domain: '.moneyticket.vercel.app' // 本番環境のドメイン
    })
  };
}

/**
 * JWT設定
 */
export const JWT_CONFIG = {
  // アクセストークンの有効期限: 15分（短期）
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  
  // リフレッシュトークンの有効期限: 7日間
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  
  // セッションの絶対的な有効期限: 30日間
  ABSOLUTE_SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000,
  
  // トークンのaudience
  AUDIENCE: 'moneyticket-app',
  
  // トークンのissuer
  ISSUER: 'moneyticket-auth'
};

/**
 * セッションCookie設定
 */
export const SESSION_COOKIE_CONFIG = {
  name: 'session_id',
  httpOnly: true,
  secure: true,           // 常にHTTPS必須
  sameSite: 'strict' as const,
  maxAge: 30 * 60 * 1000, // 30分
  path: '/'
};

/**
 * CSRF Cookie設定
 */
export const CSRF_COOKIE_CONFIG = {
  name: 'csrf_token',
  httpOnly: false,        // JavaScriptから読み取り可能にする必要あり
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 1000, // 1時間
  path: '/'
};

/**
 * 認証トークンCookie設定
 */
export const AUTH_COOKIE_CONFIG = {
  name: 'auth_token',
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15分（JWTと同期）
  path: '/'
};

/**
 * リフレッシュトークンCookie設定
 */
export const REFRESH_COOKIE_CONFIG = {
  name: 'refresh_token',
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
  path: '/api/auth/refresh' // リフレッシュエンドポイントのみ
};