/**
 * キャッシュセキュリティ設定
 */

// キャッシュ防止ヘッダー
export const CACHE_PREVENTION_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
  'X-Cache-Bypass': '1'
};

// 認証エンドポイント用のキャッシュ設定
export const AUTH_CACHE_HEADERS = {
  ...CACHE_PREVENTION_HEADERS,
  'Vary': 'Authorization, Cookie',
  'X-Accel-Expires': '0', // Nginx
  'X-Cache-Control': 'no-cache' // Fastly
};

// 静的アセット用のキャッシュ設定
export const STATIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff'
};

/**
 * CDNセキュリティミドルウェア
 */
export function cdnSecurityMiddleware(req: any, res: any, next: any) {
  // 認証が必要なエンドポイント
  const authRequiredPaths = [
    '/api/auth',
    '/api/admin',
    '/api/user',
    '/api/sms/verify',
    '/api/session'
  ];

  const isAuthRequired = authRequiredPaths.some(path => 
    req.path.startsWith(path)
  );

  if (isAuthRequired) {
    // 認証エンドポイントはキャッシュ禁止
    Object.entries(AUTH_CACHE_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // CDNバイパスヘッダー
    res.setHeader('CDN-Cache-Control', 'no-cache');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
    res.setHeader('Fastly-No-Cache', '1');
  }

  // セッション情報を含むレスポンスの検出
  const originalJson = res.json;
  res.json = function(data: any) {
    // センシティブなデータを含む場合
    if (containsSensitiveData(data)) {
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    
    return originalJson.call(this, data);
  };

  next();
}

/**
 * センシティブデータの検出
 */
function containsSensitiveData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const sensitiveKeys = [
    'token', 'session', 'auth', 'password', 'secret',
    'key', 'otp', 'verification', 'cookie', 'jwt'
  ];
  
  const dataStr = JSON.stringify(data).toLowerCase();
  return sensitiveKeys.some(key => dataStr.includes(key));
}

/**
 * キャッシュクリア機能
 */
export class CacheManager {
  private static cacheKeys = new Map<string, Set<string>>();

  /**
   * ユーザー関連のキャッシュを記録
   */
  static trackUserCache(userId: string, cacheKey: string): void {
    if (!this.cacheKeys.has(userId)) {
      this.cacheKeys.set(userId, new Set());
    }
    this.cacheKeys.get(userId)!.add(cacheKey);
  }

  /**
   * ユーザーのキャッシュをクリア
   */
  static async clearUserCache(userId: string): Promise<void> {
    const keys = this.cacheKeys.get(userId);
    if (!keys) return;

    // CDN APIを使用してキャッシュをパージ
    const purgePromises = Array.from(keys).map(key => 
      this.purgeCDNCache(key)
    );

    await Promise.all(purgePromises);
    this.cacheKeys.delete(userId);
  }

  /**
   * CDNキャッシュのパージ（実装例）
   */
  private static async purgeCDNCache(cacheKey: string): Promise<void> {
    // Cloudflare APIの例
    if (process.env.CLOUDFLARE_API_TOKEN) {
      try {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: [cacheKey]
          })
        });
      } catch (error) {
        console.error('CDN cache purge failed:', error);
      }
    }
  }

  /**
   * セッション無効化時のキャッシュクリア
   */
  static async invalidateSession(sessionId: string, userId: string): Promise<void> {
    // ユーザーキャッシュのクリア
    await this.clearUserCache(userId);
    
    // セッション関連のキャッシュをクリア
    await this.purgeCDNCache(`/api/session/${sessionId}`);
    
    // ブラウザキャッシュの無効化指示
    // (実際のレスポンスで Clear-Site-Data ヘッダーを送信)
  }
}