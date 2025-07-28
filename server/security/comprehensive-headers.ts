/**
 * 包括的なセキュリティヘッダー実装
 */

import { Request, Response, NextFunction } from 'express';

/**
 * セキュリティヘッダー設定
 */
export interface SecurityHeaderOptions {
  enableHSTS?: boolean;
  hstsMaxAge?: number;
  hstsIncludeSubdomains?: boolean;
  hstsPreload?: boolean;
  enableCSP?: boolean;
  cspDirectives?: Record<string, string[]>;
  enableXContentTypeOptions?: boolean;
  enableXFrameOptions?: boolean;
  xFrameOption?: 'DENY' | 'SAMEORIGIN';
  enableXXSSProtection?: boolean;
  enableReferrerPolicy?: boolean;
  referrerPolicy?: string;
  enablePermissionsPolicy?: boolean;
  permissionsPolicyDirectives?: Record<string, string[]>;
  enableExpectCT?: boolean;
  expectCTMaxAge?: number;
  enableCrossOriginPolicies?: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * デフォルトのセキュリティヘッダー設定
 */
const defaultOptions: SecurityHeaderOptions = {
  // HSTS (HTTP Strict Transport Security)
  enableHSTS: true,
  hstsMaxAge: 31536000, // 1年
  hstsIncludeSubdomains: true,
  hstsPreload: true,

  // Content Security Policy
  enableCSP: true,
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'media-src': ["'self'"],
    'frame-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  },

  // その他のセキュリティヘッダー
  enableXContentTypeOptions: true,
  enableXFrameOptions: true,
  xFrameOption: 'DENY',
  enableXXSSProtection: true,
  enableReferrerPolicy: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  enablePermissionsPolicy: true,
  permissionsPolicyDirectives: {
    'accelerometer': ["'none'"],
    'camera': ["'none'"],
    'geolocation': ["'none'"],
    'gyroscope': ["'none'"],
    'magnetometer': ["'none'"],
    'microphone': ["'none'"],
    'payment': ["'none'"],
    'usb': ["'none'"]
  },
  enableExpectCT: true,
  expectCTMaxAge: 86400, // 24時間
  enableCrossOriginPolicies: true
};

/**
 * 包括的なセキュリティヘッダーミドルウェア
 */
export function comprehensiveSecurityHeaders(options: SecurityHeaderOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // HSTS (HTTP Strict Transport Security)
    if (config.enableHSTS && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
      const hstsValue = [
        `max-age=${config.hstsMaxAge}`,
        config.hstsIncludeSubdomains ? 'includeSubDomains' : '',
        config.hstsPreload ? 'preload' : ''
      ].filter(Boolean).join('; ');
      
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Content Security Policy
    if (config.enableCSP && config.cspDirectives) {
      const cspValue = Object.entries(config.cspDirectives)
        .map(([directive, values]) => {
          if (values.length === 0) return directive;
          return `${directive} ${values.join(' ')}`;
        })
        .join('; ');
      
      res.setHeader('Content-Security-Policy', cspValue);
      
      // レポート専用モード（開発環境用）
      if (process.env.NODE_ENV === 'development') {
        res.setHeader('Content-Security-Policy-Report-Only', cspValue);
      }
    }

    // X-Content-Type-Options
    if (config.enableXContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (config.enableXFrameOptions) {
      res.setHeader('X-Frame-Options', config.xFrameOption || 'DENY');
    }

    // X-XSS-Protection (レガシーブラウザ向け)
    if (config.enableXXSSProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (config.enableReferrerPolicy) {
      res.setHeader('Referrer-Policy', config.referrerPolicy || 'strict-origin-when-cross-origin');
    }

    // Permissions-Policy (Feature-Policyの後継)
    if (config.enablePermissionsPolicy && config.permissionsPolicyDirectives) {
      const permissionsValue = Object.entries(config.permissionsPolicyDirectives)
        .map(([feature, allowList]) => `${feature}=(${allowList.join(' ')})`)
        .join(', ');
      
      res.setHeader('Permissions-Policy', permissionsValue);
    }

    // Expect-CT
    if (config.enableExpectCT && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
      res.setHeader('Expect-CT', `max-age=${config.expectCTMaxAge}, enforce`);
    }

    // Cross-Origin Policies
    if (config.enableCrossOriginPolicies) {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }

    // セキュリティ関連の不要なヘッダーを削除
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // カスタムヘッダー
    if (config.customHeaders) {
      Object.entries(config.customHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
      });
    }

    next();
  };
}

/**
 * 本番環境用の厳格なセキュリティヘッダー設定
 */
export const productionSecurityHeaders: SecurityHeaderOptions = {
  ...defaultOptions,
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'strict-dynamic'", "'nonce-'"],
    'style-src': ["'self'", "'nonce-'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://api.moneyticket.com'],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'media-src': ["'none'"],
    'frame-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'block-all-mixed-content': [],
    'upgrade-insecure-requests': [],
    'require-trusted-types-for': ["'script'"]
  },
  referrerPolicy: 'no-referrer',
  customHeaders: {
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }
};

/**
 * 開発環境用の緩和されたセキュリティヘッダー設定
 */
export const developmentSecurityHeaders: SecurityHeaderOptions = {
  ...defaultOptions,
  enableHSTS: false, // 開発環境ではHTTPを許可
  cspDirectives: {
    ...defaultOptions.cspDirectives,
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*'],
    'style-src': ["'self'", "'unsafe-inline'", 'http://localhost:*'],
    'connect-src': ["'self'", 'http://localhost:*', 'ws://localhost:*']
  },
  enableExpectCT: false
};

/**
 * Nonceベースのセキュリティヘッダー生成
 */
export function generateNonceBasedHeaders(nonce: string): Record<string, string> {
  const cspWithNonce = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],
    'style-src': ["'self'", `'nonce-${nonce}'`],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"]
  };

  const cspValue = Object.entries(cspWithNonce)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');

  return {
    'Content-Security-Policy': cspValue,
    'X-Nonce': nonce
  };
}

/**
 * APIエンドポイント用セキュリティヘッダー
 */
export const apiSecurityHeaders: SecurityHeaderOptions = {
  enableCSP: false, // APIではCSPは不要
  enableXContentTypeOptions: true,
  enableXFrameOptions: true,
  xFrameOption: 'DENY',
  enableReferrerPolicy: true,
  referrerPolicy: 'no-referrer',
  customHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-API-Version': process.env.API_VERSION || '1.0.0'
  }
};

/**
 * 静的ファイル用セキュリティヘッダー
 */
export const staticFileHeaders: SecurityHeaderOptions = {
  enableCSP: true,
  cspDirectives: {
    'default-src': ["'none'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'frame-ancestors': ["'none'"]
  },
  enableXContentTypeOptions: true,
  customHeaders: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff'
  }
};