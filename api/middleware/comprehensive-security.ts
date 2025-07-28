import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CSRFProtection } from '../../src/utils/csrfProtection';
import { SecureSessionManager } from '../../src/utils/secureSessionManager';
import { FileUploadSecurity } from '../../src/utils/fileUploadSecurity';
import { SecurityAuditLogger } from '../../src/utils/securityAuditLogger';
import crypto from 'crypto';

// セキュリティ設定
const SECURITY_CONFIG = {
  // CSRF設定
  csrfSecret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex'),
  
  // セッション設定
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  
  // 環境判定
  isProduction: process.env.NODE_ENV === 'production',
  
  // 許可されたオリジン
  allowedOrigins: [
    'https://moneyticket.vercel.app',
    'https://moneyticket.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
};

/**
 * 包括的なセキュリティミドルウェア
 */
export async function comprehensiveSecurityMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: () => Promise<void>
) {
  try {
    // 1. セキュリティヘッダーの設定
    setSecurityHeaders(req, res);

    // 2. CORS設定
    if (!handleCORS(req, res)) {
      return;
    }

    // 3. メソッドチェック
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // 4. リクエスト情報の収集
    const requestInfo = collectRequestInfo(req);

    // 5. セッション検証
    const sessionValidation = await validateSession(req, res, requestInfo);
    if (!sessionValidation.valid) {
      await logSecurityEvent('session_invalid', req, 'failure', {
        reason: sessionValidation.reason
      });
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    // 6. CSRF保護（状態変更メソッドのみ）
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || '')) {
      const csrfValid = await validateCSRF(req, sessionValidation.sessionId);
      if (!csrfValid) {
        await logSecurityEvent('csrf_validation_failed', req, 'denied', {
          method: req.method
        });
        res.status(403).json({ error: 'CSRF validation failed' });
        return;
      }
    }

    // 7. ファイルアップロードの検証（multipart/form-dataの場合）
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const fileValidation = await validateFileUpload(req);
      if (!fileValidation.valid) {
        await logSecurityEvent('file_upload_rejected', req, 'denied', {
          reason: fileValidation.error
        });
        res.status(400).json({ error: fileValidation.error });
        return;
      }
    }

    // 8. レート制限チェック（既存のレート制限と統合）
    // ここでは省略（既に実装済み）

    // 9. 入力サニタイゼーション
    sanitizeRequestData(req);

    // 10. セキュリティコンテキストの設定
    (req as any).securityContext = {
      sessionId: sessionValidation.sessionId,
      userId: sessionValidation.userId,
      fingerprint: requestInfo.fingerprint,
      ipAddress: requestInfo.ipAddress,
      timestamp: Date.now()
    };

    // 成功ログ
    await logSecurityEvent('request_allowed', req, 'success', {
      method: req.method,
      path: req.url
    });

    // 次のミドルウェアへ
    await next();

  } catch (error) {
    console.error('Security middleware error:', error);
    await logSecurityEvent('security_middleware_error', req, 'error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Internal security error' });
  }
}

/**
 * セキュリティヘッダーの設定
 */
function setSecurityHeaders(req: VercelRequest, res: VercelResponse): void {
  // バージョン情報の隠蔽
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // 基本的なセキュリティヘッダー
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS（本番環境のみ）
  if (SECURITY_CONFIG.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  // CSP（Content Security Policy）
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.twilio.com",
    "frame-src 'self' https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];
  
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
}

/**
 * CORS処理
 */
function handleCORS(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  
  if (origin) {
    const isAllowed = SECURITY_CONFIG.allowedOrigins.includes(origin) ||
                     (SECURITY_CONFIG.isProduction && origin.includes('vercel.app'));
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 
        'Content-Type, Authorization, X-CSRF-Token, X-Session-ID, X-Device-Fingerprint');
      res.setHeader('Access-Control-Max-Age', '86400');
      return true;
    }
  }
  
  // 許可されていないオリジンの場合
  if (SECURITY_CONFIG.isProduction) {
    return false;
  }
  
  return true;
}

/**
 * リクエスト情報の収集
 */
function collectRequestInfo(req: VercelRequest): {
  ipAddress: string;
  userAgent: string;
  fingerprint: string;
  origin: string | null;
} {
  return {
    ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
               req.headers['x-real-ip']?.toString() || 
               'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    fingerprint: req.headers['x-device-fingerprint']?.toString() || '',
    origin: req.headers.origin || null
  };
}

/**
 * セッション検証
 */
async function validateSession(
  req: VercelRequest,
  res: VercelResponse,
  requestInfo: ReturnType<typeof collectRequestInfo>
): Promise<{ valid: boolean; reason?: string; sessionId?: string; userId?: string }> {
  // セッションIDの取得（Cookie または Header）
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id']?.toString();
  
  if (!sessionId) {
    // 新規セッションの作成
    const newSession = SecureSessionManager.createSession(
      requestInfo.ipAddress,
      requestInfo.userAgent,
      requestInfo.fingerprint
    );
    
    // セッションクッキーの設定
    const cookieOptions = SecureSessionManager.getCookieOptions(SECURITY_CONFIG.isProduction);
    res.setHeader('Set-Cookie', 
      `sessionId=${newSession.id}; ${Object.entries(cookieOptions)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`
    );
    
    return { valid: true, sessionId: newSession.id };
  }
  
  // 既存セッションの検証
  const validation = SecureSessionManager.validateSession(
    sessionId,
    requestInfo.ipAddress,
    requestInfo.userAgent,
    requestInfo.fingerprint
  );
  
  if (!validation.valid) {
    return { valid: false, reason: validation.reason };
  }
  
  // セッションローテーションが必要な場合
  if (validation.requireRotation) {
    const newSession = SecureSessionManager.rotateSession(sessionId);
    if (newSession) {
      const cookieOptions = SecureSessionManager.getCookieOptions(SECURITY_CONFIG.isProduction);
      res.setHeader('Set-Cookie', 
        `sessionId=${newSession.id}; ${Object.entries(cookieOptions)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ')}`
      );
      return { valid: true, sessionId: newSession.id, userId: newSession.userId };
    }
  }
  
  return { valid: true, sessionId };
}

/**
 * CSRF検証
 */
async function validateCSRF(req: VercelRequest, sessionId: string): Promise<boolean> {
  const csrfToken = req.headers['x-csrf-token']?.toString();
  const csrfCookie = req.cookies?.csrfToken;
  
  if (!csrfToken || !csrfCookie) {
    return false;
  }
  
  // Double Submit Cookie パターンの検証
  return CSRFProtection.verifyDoubleSubmitToken(
    csrfCookie,
    csrfToken,
    SECURITY_CONFIG.csrfSecret
  );
}

/**
 * ファイルアップロード検証
 */
async function validateFileUpload(req: VercelRequest): Promise<{ valid: boolean; error?: string }> {
  // ここでは簡易的な実装
  // 実際にはmulterやformidableと統合
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return { valid: false, error: 'File size exceeds limit' };
  }
  
  return { valid: true };
}

/**
 * リクエストデータのサニタイゼーション
 */
function sanitizeRequestData(req: VercelRequest): void {
  // XSS対策のための基本的なサニタイゼーション
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // HTMLタグの除去
        .replace(/javascript:/gi, '') // JavaScriptプロトコルの除去
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // キーもサニタイズ
        const sanitizedKey = key.replace(/[^\w.-]/g, '');
        sanitized[sanitizedKey] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
}

/**
 * セキュリティイベントのログ記録
 */
async function logSecurityEvent(
  eventType: string,
  req: VercelRequest,
  outcome: 'success' | 'failure' | 'denied' | 'error',
  details: Record<string, any> = {}
): Promise<void> {
  const requestInfo = collectRequestInfo(req);
  
  await SecurityAuditLogger.logEvent({
    type: 'system_access',
    severity: outcome === 'error' ? 'high' : 'low',
    source: 'security_middleware',
    actor: {
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      sessionId: req.headers['x-session-id']?.toString()
    },
    target: {
      resource: req.url || 'unknown',
      resourceType: 'api_endpoint'
    },
    action: eventType,
    outcome,
    details: {
      ...details,
      method: req.method,
      path: req.url,
      origin: requestInfo.origin
    }
  });
}

// エクスポート用のラッパー関数
export function withComprehensiveSecurity(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    await comprehensiveSecurityMiddleware(req, res, async () => {
      await handler(req, res);
    });
  };
}