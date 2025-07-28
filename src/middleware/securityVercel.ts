// Vercel Functions用セキュリティミドルウェア
export class SecurityMiddleware {
  // レート制限ストレージ（メモリベース）
  private static rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  // レート制限チェック
  static async checkRateLimit(
    identifier: string, 
    maxRequests: number = 10, 
    windowMs: number = 60000
  ): Promise<boolean> {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;
    
    let entry = this.rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      this.rateLimitStore.set(key, entry);
    }
    
    if (entry.count >= maxRequests) {
      return false;
    }
    
    entry.count++;
    this.rateLimitStore.set(key, entry);
    
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

  // 入力サニタイゼーション
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
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

  // SQLインジェクション検出
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|#|\/\*|\*\/)/,
      /(\bxp_|\bsp_)/i,
      /(\b(WAITFOR|DELAY)\b)/i,
      /('|"|;|\|\||&&)/
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // XSS検出
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
}