import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response } from 'express';
import crypto from 'crypto';

// Redis接続の設定（クライアントサイドでは使用しない）
const redisClient = null as any; // クライアントサイドではRedisを使用しない

// IPアドレスとデバイスフィンガープリントを組み合わせたキー生成
const generateKey = (req: Request): string => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  
  // デバイスフィンガープリント
  const fingerprint = crypto
    .createHash('sha256')
    .update(userAgent + acceptLanguage)
    .digest('hex')
    .substring(0, 16);
  
  // 認証済みユーザーの場合はユーザーIDも含める
  const userId = (req as any).user?.id || 'anonymous';
  
  return `${ip}:${fingerprint}:${userId}`;
};

// 基本的なレート制限設定
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    }),
    windowMs: options.windowMs || 15 * 60 * 1000, // 15分
    max: options.max || 100,
    message: options.message || 'リクエストが多すぎます。しばらくしてから再度お試しください。',
    standardHeaders: options.standardHeaders !== false,
    legacyHeaders: options.legacyHeaders !== false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: generateKey,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'リクエストが多すぎます。',
        retryAfter: res.getHeader('Retry-After'),
        limit: res.getHeader('X-RateLimit-Limit'),
        remaining: res.getHeader('X-RateLimit-Remaining'),
        reset: res.getHeader('X-RateLimit-Reset')
      });
    }
  });
};

// API エンドポイント別のレート制限
export const apiLimiters = {
  // 一般的なAPIエンドポイント
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100
  }),
  
  // 認証関連エンドポイント
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分
    max: 5, // より厳しい制限
    message: '認証試行が多すぎます。15分後に再度お試しください。',
    skipSuccessfulRequests: true // 成功したリクエストはカウントしない
  }),
  
  // SMS送信エンドポイント
  sms: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1時間
    max: 3, // 1時間に3回まで
    message: 'SMS送信制限に達しました。1時間後に再度お試しください。'
  }),
  
  // 診断結果生成エンドポイント
  diagnosis: createRateLimiter({
    windowMs: 30 * 60 * 1000, // 30分
    max: 10,
    message: '診断リクエストが多すぎます。30分後に再度お試しください。'
  }),
  
  // 管理者API
  admin: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5分
    max: 50
  }),
  
  // データ取得API
  read: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1分
    max: 60
  }),
  
  // データ更新API
  write: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5分
    max: 20
  })
};

// 動的レート制限（ユーザーの行動に基づく）
export class DynamicRateLimiter {
  private suspiciousIPs: Set<string> = new Set();
  private blacklistedIPs: Set<string> = new Set();
  
  constructor() {
    // 定期的にメモリをクリア
    setInterval(() => {
      this.suspiciousIPs.clear();
    }, 60 * 60 * 1000); // 1時間ごと
  }
  
  // 疑わしい行動を検出
  async detectSuspiciousBehavior(req: Request): Promise<boolean> {
    const key = generateKey(req);
    const recentRequests = await this.getRecentRequests(key);
    
    // 短時間に大量のリクエスト
    if (recentRequests > 50) {
      this.suspiciousIPs.add(req.ip);
      return true;
    }
    
    // 異常なパターンの検出（例：同じエンドポイントへの連続リクエスト）
    const pattern = await this.detectPattern(key);
    if (pattern.isAbnormal) {
      this.suspiciousIPs.add(req.ip);
      return true;
    }
    
    return false;
  }
  
  // 最近のリクエスト数を取得
  private async getRecentRequests(key: string): Promise<number> {
    const count = await redisClient.get(`req_count:${key}`);
    return parseInt(count || '0');
  }
  
  // パターン検出
  private async detectPattern(key: string): Promise<{ isAbnormal: boolean }> {
    const pattern = await redisClient.lrange(`req_pattern:${key}`, 0, -1);
    
    // 同じエンドポイントへの連続アクセスをチェック
    if (pattern.length > 10) {
      const uniqueEndpoints = new Set(pattern);
      if (uniqueEndpoints.size === 1) {
        return { isAbnormal: true };
      }
    }
    
    return { isAbnormal: false };
  }
  
  // IPをブラックリストに追加
  async blacklistIP(ip: string, duration: number = 24 * 60 * 60 * 1000): Promise<void> {
    this.blacklistedIPs.add(ip);
    await redisClient.setex(`blacklist:${ip}`, duration / 1000, '1');
  }
  
  // IPがブラックリストに含まれているかチェック
  async isBlacklisted(ip: string): Promise<boolean> {
    if (this.blacklistedIPs.has(ip)) {
      return true;
    }
    
    const inRedis = await redisClient.get(`blacklist:${ip}`);
    return !!inRedis;
  }
  
  // ミドルウェア
  middleware() {
    return async (req: Request, res: Response, next: Function) => {
      const ip = req.ip;
      
      // ブラックリストチェック
      if (await this.isBlacklisted(ip)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'アクセスが拒否されました。'
        });
      }
      
      // 疑わしい行動の検出
      if (await this.detectSuspiciousBehavior(req)) {
        // より厳しいレート制限を適用
        const strictLimiter = createRateLimiter({
          windowMs: 60 * 60 * 1000, // 1時間
          max: 10 // 10リクエストのみ
        });
        return strictLimiter(req, res, next);
      }
      
      next();
    };
  }
}

// 分散レート制限（複数サーバー間で同期）
export class DistributedRateLimiter {
  private readonly prefix = 'drl:';
  
  async increment(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
    const fullKey = `${this.prefix}${key}`;
    const multi = redisClient.multi();
    
    multi.incr(fullKey);
    multi.ttl(fullKey);
    multi.expire(fullKey, Math.ceil(windowMs / 1000));
    
    const results = await multi.exec();
    if (!results) {
      throw new Error('Redis transaction failed');
    }
    
    const count = results[0][1] as number;
    const ttl = results[1][1] as number;
    
    return { count, ttl };
  }
  
  async reset(key: string): Promise<void> {
    await redisClient.del(`${this.prefix}${key}`);
  }
  
  async getCount(key: string): Promise<number> {
    const count = await redisClient.get(`${this.prefix}${key}`);
    return parseInt(count || '0');
  }
}

// レート制限のモニタリング
export class RateLimitMonitor {
  async logViolation(req: Request, limiterName: string): Promise<void> {
    const violation = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      limiter: limiterName
    };
    
    // Redisに違反を記録
    await redisClient.lpush('rate_limit_violations', JSON.stringify(violation));
    await redisClient.ltrim('rate_limit_violations', 0, 9999); // 最新10000件を保持
    
    // 統計情報を更新
    await redisClient.hincrby('rate_limit_stats', limiterName, 1);
    await redisClient.hincrby('rate_limit_stats', `${limiterName}:${new Date().toISOString().split('T')[0]}`, 1);
  }
  
  async getStats(limiterName?: string): Promise<Record<string, string>> {
    if (limiterName) {
      const stats = await redisClient.hgetall(`rate_limit_stats:${limiterName}`);
      return stats;
    }
    return await redisClient.hgetall('rate_limit_stats');
  }
  
  async getRecentViolations(limit: number = 100): Promise<any[]> {
    const violations = await redisClient.lrange('rate_limit_violations', 0, limit - 1);
    return violations.map(v => JSON.parse(v));
  }
}

// エクスポート
export const dynamicRateLimiter = new DynamicRateLimiter();
export const distributedRateLimiter = new DistributedRateLimiter();
export const rateLimitMonitor = new RateLimitMonitor();