// セキュリティミドルウェア - Vite対応版
export class SecurityMiddleware {
  // CSRFトークンの検証
  static async verifyCSRFToken(request: Request): Promise<boolean> {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfToken = request.headers.get('x-csrf-token');
      const sessionToken = request.headers.get('x-session-token');
      
      if (!csrfToken || !sessionToken) {
        return false;
      }
      
      // トークンの検証ロジック
      return await this.validateTokenPair(csrfToken, sessionToken);
    }
    
    return true; // GET, HEAD, OPTIONS は通す
  }

  // セキュリティヘッダーの設定
  static setSecurityHeaders(response: Response): Response {
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.twilio.com;"
    );

    // その他のセキュリティヘッダー
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    return response;
  }

  // IPアドレスの取得
  static getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  // レート制限のチェック（メモリベース実装）
  private static rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  static async checkRateLimit(
    identifier: string, 
    maxRequests: number = 10, 
    windowMs: number = 60000
  ): Promise<boolean> {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;
    
    // 既存エントリを取得または新規作成
    let entry = this.rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // 新しいウィンドウまたは期限切れ
      entry = { count: 0, resetTime: now + windowMs };
      this.rateLimitStore.set(key, entry);
    }
    
    // リクエスト数をチェック
    if (entry.count >= maxRequests) {
      return false; // 制限に達している
    }
    
    // カウントを増加
    entry.count++;
    this.rateLimitStore.set(key, entry);
    
    // 期限切れエントリを定期的に削除
    this.cleanupExpiredEntries();
    
    return true;
  }

  // 期限切れエントリのクリーンアップ
  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  // 入力の総合的なサニタイゼーション
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/[<>]/g, '') // HTMLタグの除去
        .replace(/javascript:/gi, '') // JavaScriptプロトコルの除去
        .replace(/on\w+=/gi, '') // イベントハンドラーの除去
        .trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  // SQL インジェクション パターンの検出
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\bxp_|\bsp_)/i,
      /(\b(WAITFOR|DELAY)\b)/i,
      /('|\"|;|\|\||&&)/
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // XSS パターンの検出
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<(img|object|embed|link|style|meta)\b[^>]*>/gi,
      /vbscript:/i,
      /data:text\/html/i
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  private static async validateTokenPair(csrfToken: string, sessionToken: string): Promise<boolean> {
    // CSRF トークンとセッショントークンのペアを検証
    try {
      const expectedCSRF = await this.generateCSRFToken(sessionToken);
      return csrfToken === expectedCSRF;
    } catch {
      return false;
    }
  }

  private static async generateCSRFToken(sessionToken: string): Promise<string> {
    // セッショントークンベースのCSRFトークン生成
    try {
      const crypto = require('crypto');
      const { SecureConfigManager } = await import('../api/secureConfig');
      const secret = await SecureConfigManager.getCSRFSecret();
      
      if (!secret) {
        throw new Error('CSRF secret not found in configuration');
      }
      
      return crypto.createHmac('sha256', secret)
        .update(sessionToken + Date.now().toString())
        .digest('hex');
    } catch (error) {
      throw new Error('Failed to generate CSRF token');
    }
  }

  // CSRFトークンの生成（公開メソッド）
  static async generateCSRFTokenForSession(sessionToken: string): Promise<string> {
    return await this.generateCSRFToken(sessionToken);
  }

  // セッショントークンの生成
  static generateSessionToken(): string {
    try {
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    } catch (error) {
      throw new Error('Failed to generate session token');
    }
  }
}