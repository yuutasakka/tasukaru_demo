import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { apiLimiters, dynamicRateLimiter, rateLimitMonitor } from './advancedRateLimit';
import { ipAnalyzer } from '../utils/ipAnalyzer';
import { addBreadcrumb } from '../utils/sentry';
import ProductionLogger from '../utils/productionLogger';

// 拡張Requestインターフェース
interface ExtendedRequest extends Request {
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
  ipAnalysis?: any;
  requestId?: string;
  nonce?: string;
}

// エンタープライズレベルセキュリティミドルウェアの設定
export const setupSecurityMiddleware = (app: any) => {
  // Helmetによる包括的なセキュリティヘッダー
  app.use(helmet({
    // Content Security Policy (CSP) - XSS攻撃防止
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // React開発に必要
          // "'unsafe-eval'", // セキュリティ向上のため削除
          "'strict-dynamic'",
          "'nonce-{random}'", // 実装時にランダムnonce生成
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://www.google.com", // reCAPTCHA
          "https://www.gstatic.com", // reCAPTCHA
          "https://js.stripe.com", // 決済処理用
          "https://checkout.stripe.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "'nonce-{random}'",
          "https://cdn.jsdelivr.net",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "data:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "*.supabase.co",
          "https://www.google-analytics.com",
          "https://ssl.gstatic.com"
        ],
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://api.twilio.com",
          "https://www.google-analytics.com",
          "https://api.stripe.com",
          "https://*.stripe.com"
        ],
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        childSrc: ["'self'"],
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://checkout.stripe.com",
          "https://www.google.com" // reCAPTCHA用
        ],
        frameAncestors: ["'none'"], // クリックジャッキング防止
        workerSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        reportUri: "/api/csp-report", // CSP違反レポート収集
        sandbox: [
          "allow-forms",
          "allow-same-origin",
          "allow-scripts",
          "allow-popups",
          "allow-modals"
        ]
      },
      reportOnly: process.env.NODE_ENV !== 'production' // 開発環境ではレポートのみ
    },
    
    // HTTP Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1年
      includeSubDomains: true,
      preload: true
    },
    
    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: "same-origin" },
    
    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    
    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: "same-origin" },
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Referrer Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-Frame-Options
    frameguard: { action: "deny" },
    
    // X-XSS-Protection (非推奨だが一部ブラウザ対応)
    xssFilter: true,
    
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: { allow: false },
    
    // Expect-CT
    expectCt: {
      maxAge: 86400,
      enforce: true,
      reportUri: "/api/expect-ct-report"
    }
  }));
  
  // エンタープライズレベルカスタムセキュリティヘッダー
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Permissions Policy - 機能へのアクセス制御
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=(self)',
        'payment=(self)',
        'usb=()',
        'serial=()',
        'bluetooth=()',
        'magnetometer=()',
        'accelerometer=()',
        'gyroscope=()',
        'ambient-light-sensor=()',
        'autoplay=(self)',
        'encrypted-media=(self)',
        'fullscreen=(self)',
        'picture-in-picture=()',
        'display-capture=()',
        'web-share=(self)',
        'screen-wake-lock=()',
        'nfc=()'
      ].join(', ')
    );
    
    // Serverヘッダー隐蔽
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Clear-Site-Data (ログアウト時のみ)
    if (req.path === '/api/auth/logout') {
      res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
    }
    
    // 追加セキュリティヘッダー
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // NEL (Network Error Logging)
    res.setHeader('NEL', JSON.stringify({
      "report_to": "default",
      "max_age": 31536000,
      "include_subdomains": true
    }));
    
    // Report-To API
    res.setHeader('Report-To', JSON.stringify({
      "group": "default",
      "max_age": 31536000,
      "endpoints": [{
        "url": "/api/reports"
      }],
      "include_subdomains": true
    }));
    
    // Feature Policy (Permissions Policyの旧版)
    res.setHeader(
      'Feature-Policy',
      [
        'camera \'none\'',
        'microphone \'none\'',
        'geolocation \'self\'',
        'payment \'self\'',
        'usb \'none\'',
        'accelerometer \'none\'',
        'autoplay \'self\''
      ].join('; ')
    );
    
    // セキュリティ関連レスポンスヘッダーの整合性チェック
    validateSecurityHeaders(res);
    
    next();
  });
  
  // リクエストID生成
  app.use((req: ExtendedRequest, res: Response, next: NextFunction) => {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });
  
  // CSP nonceミドルウェア
  app.use(cspNonceMiddleware);
  
  // IP分析ミドルウェア
  app.use(async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const analysis = await ipAnalyzer.analyze(req);
      req.ipAnalysis = analysis;
      
      // 高リスクIPの場合はログに記録
      if (analysis.riskScore >= 70) {
        ProductionLogger.warn('High risk IP detected', {
          ip: analysis.realIP,
          riskScore: analysis.riskScore,
          isProxy: analysis.isProxy,
          isTor: analysis.isTor,
          isVPN: analysis.isVPN
        });
        
        addBreadcrumb('High risk IP detected', 'security', 'warning', {
          ip: analysis.realIP,
          riskScore: analysis.riskScore
        });
      }
      
      next();
    } catch (error) {
      ProductionLogger.error('IP analysis failed', error as Error);
      next(); // エラーが発生してもリクエストは続行
    }
  });
  
  // 動的レート制限
  app.use(dynamicRateLimiter.middleware());
  
  // エンドポイント別レート制限の適用
  const applyRateLimit = (limiterName: keyof typeof apiLimiters) => {
    return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
      const limiter = apiLimiters[limiterName];
      
      // レート制限を適用
      limiter(req, res, async (err?: any) => {
        if (err) {
          // レート制限違反をログに記録
          await rateLimitMonitor.logViolation(req, limiterName);
          
          ProductionLogger.warn('Rate limit exceeded', {
            ip: req.ipAnalysis?.realIP || req.ip,
            endpoint: req.originalUrl,
            limiter: limiterName
          });
          
          return next(err);
        }
        next();
      });
    };
  };
  
  // API routes with specific rate limits
  app.use('/api/auth/*', applyRateLimit('auth'));
  app.use('/api/sms/*', applyRateLimit('sms'));
  app.use('/api/diagnosis/*', applyRateLimit('diagnosis'));
  app.use('/api/admin/*', applyRateLimit('admin'));
  
  // Read operations
  app.get('/api/*', applyRateLimit('read'));
  
  // Write operations
  app.post('/api/*', applyRateLimit('write'));
  app.put('/api/*', applyRateLimit('write'));
  app.patch('/api/*', applyRateLimit('write'));
  app.delete('/api/*', applyRateLimit('write'));
  
  // General rate limit for all other requests
  app.use('/api/*', applyRateLimit('general'));
  
  // リクエストロギング
  app.use((req: ExtendedRequest, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // スロークエリの検出
      if (duration > 1000) {
        ProductionLogger.warn('Slow request detected', {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          duration,
          statusCode: res.statusCode,
          ip: req.ipAnalysis?.realIP || req.ip
        });
      }
    });
    
    next();
  });
  
  // セキュリティ関連レポートエンドポイント
  app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req: Request, res: Response) => {
    const report = req.body;
    ProductionLogger.warn('CSP違反レポート', {
      report,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(204).send();
  });
  
  app.post('/api/expect-ct-report', express.json(), (req: Request, res: Response) => {
    const report = req.body;
    ProductionLogger.warn('Expect-CT違反レポート', {
      report,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(204).send();
  });
  
  app.post('/api/reports', express.json(), (req: Request, res: Response) => {
    const reports = req.body;
    ProductionLogger.info('セキュリティレポート', {
      reports,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(204).send();
  });

  // エンタープライズレベルエラーハンドリング
  app.use((err: any, req: ExtendedRequest, res: Response, next: NextFunction) => {
    // エラー情報のサニタイズ
    const sanitizedError = sanitizeErrorForClient(err);
    
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).json({
        error: 'CSRF_TOKEN_INVALID',
        message: 'セキュリティトークンが無効です。ページを更新してください。',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } else if (err.status === 429) {
      // レート制限エラー
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: err.message || 'リクエストが多すぎます。しばらく待ってから再度お試しください。',
        retryAfter: res.getHeader('Retry-After'),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } else if (err.status === 400) {
      // 不正なリクエスト
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'リクエストの形式が正しくありません。',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } else if (err.status === 403) {
      // アクセス拒否
      res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'アクセスが拒否されました。',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } else if (err.status === 404) {
      // リソースが見つからない
      res.status(404).json({
        error: 'RESOURCE_NOT_FOUND',
        message: '要求されたリソースが見つかりません。',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } else {
      // その他のエラー
      ProductionLogger.error('未処理エラー', {
        error: sanitizedError,
        requestId: req.requestId,
        url: req.originalUrl,
        method: req.method,
        ip: req.ipAnalysis?.realIP || req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
  });
};

// セキュリティチェック用ユーティリティ
export const securityChecks = {
  // SQLインジェクション対策
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    // 危険な文字をエスケープ
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '')
      .replace(/script/gi, '');
  },
  
  // XSS対策
  escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },
  
  // パストラバーサル対策
  sanitizePath(path: string): string {
    return path
      .replace(/\.\./g, '')
      .replace(/\/+/g, '/')
      .replace(/\\/g, '/');
  },
  
  // コマンドインジェクション対策
  sanitizeCommand(command: string): string {
    const dangerous = [';', '&&', '||', '|', '>', '<', '`', '$', '(', ')', '{', '}'];
    let safe = command;
    
    dangerous.forEach(char => {
      safe = safe.replace(new RegExp(`\\${char}`, 'g'), '');
    });
    
    return safe;
  }
};

// セキュリティヘッダー検証
const validateSecurityHeaders = (res: Response): void => {
  const headers = res.getHeaders();
  
  // 必須セキュリティヘッダーの存在確認
  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy'
  ];
  
  for (const header of requiredHeaders) {
    if (!headers[header]) {
      ProductionLogger.warn(`必須セキュリティヘッダーが不足: ${header}`);
    }
  }
  
  // CSPヘッダーの構文チェック
  const csp = headers['content-security-policy'] as string;
  if (csp && !isValidCSP(csp)) {
    ProductionLogger.warn('CSPヘッダーの構文が無効', { csp });
  }
};

// CSP構文検証
const isValidCSP = (csp: string): boolean => {
  try {
    // 基本的な構文チェック
    const directives = csp.split(';').map(d => d.trim()).filter(d => d);
    return directives.every(directive => {
      const parts = directive.split(/\s+/);
      return parts.length >= 1 && /^[a-z-]+$/.test(parts[0]);
    });
  } catch {
    return false;
  }
};

// クライアント向けエラー情報のサニタイズ
const sanitizeErrorForClient = (error: any): any => {
  // 本番環境では内部エラー詳細を隠蔽
  if (process.env.NODE_ENV === 'production') {
    return {
      name: error.name || 'Error',
      message: error.status >= 400 && error.status < 500 ? error.message : 'Internal Server Error',
      status: error.status || 500
    };
  }
  
  // 開発環境では詳細情報を提供（機密情報は除く）
  return {
    name: error.name,
    message: error.message,
    status: error.status,
    // スタックトレースは機密情報を含む可能性があるため慎重に
    stack: error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : undefined
  };
};

// セキュリティイベント監視
export const monitorSecurityEvents = (req: ExtendedRequest, res: Response): void => {
  // 疑わしいリクエストパターンの検出
  const suspiciousPatterns = [
    /\.\./,                    // ディレクトリトラバーサル
    /<script/i,               // XSS攻撃
    /union.*select/i,         // SQLインジェクション
    /javascript:/i,           // プロトコルハンドラー悪用
    /%00/,                    // ヌルバイト攻撃
    /\.\.(\/|\\)/            // パストラバーサル
  ];
  
  const url = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // リクエストURL、User-Agent、Refererをチェック
  const targets = [url, userAgent, referer];
  
  for (const target of targets) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(target)) {
        ProductionLogger.warn('疑わしいリクエストパターン検出', {
          pattern: pattern.toString(),
          target: target.substring(0, 200), // 長すぎる場合は切り捨て
          ip: req.ipAnalysis?.realIP || req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
        
        // 疑わしいリクエストにセキュリティヘッダーを追加
        res.setHeader('X-Security-Warning', 'Suspicious pattern detected');
        break;
      }
    }
  }
};

// nonce生成関数
export const generateNonce = (): string => {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  return Buffer.from(randomBytes).toString('base64');
};

// CSPnonceミドルウェア
export const cspNonceMiddleware = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const nonce = generateNonce();
  req.nonce = nonce;
  res.locals.nonce = nonce;
  
  // CSPヘッダーのnonceを更新
  const existingCSP = res.getHeader('Content-Security-Policy') as string;
  if (existingCSP) {
    const updatedCSP = existingCSP.replace(/nonce-{random}/g, `nonce-${nonce}`);
    res.setHeader('Content-Security-Policy', updatedCSP);
  }
  
  next();
};

// レート制限情報をレスポンスヘッダーに追加
export const addRateLimitHeaders = (req: ExtendedRequest, res: Response) => {
  if (req.rateLimitInfo) {
    res.setHeader('X-RateLimit-Limit', req.rateLimitInfo.limit.toString());
    res.setHeader('X-RateLimit-Remaining', req.rateLimitInfo.remaining.toString());
    res.setHeader('X-RateLimit-Reset', req.rateLimitInfo.reset.toISOString());
  }
  
  // セキュリティイベント監視
  monitorSecurityEvents(req, res);
};