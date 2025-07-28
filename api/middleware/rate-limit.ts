import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface RateLimitOptions {
  window: number; // ミリ秒
  maxRequests: number;
  identifier?: 'ip' | 'phone';
}

export async function checkRateLimit(
  req: VercelRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const { window, maxRequests, identifier = 'ip' } = options;
  
  // Supabase設定
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    // Supabaseが設定されていない場合は制限なし
    return { allowed: true, remaining: maxRequests, resetAt: new Date() };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 識別子を取得
  let id: string;
  if (identifier === 'phone') {
    id = req.body?.phoneNumber || 'unknown';
  } else {
    id = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
         req.headers['x-real-ip']?.toString() || 
         'unknown';
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - window);

  try {
    // rate_limitsテーブルが存在しない場合は作成
    // 実際の運用では、マイグレーションファイルで作成することを推奨
    const tableName = 'rate_limits';
    
    // 現在のウィンドウ内のリクエスト数を取得
    const { data: requests, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('identifier', id)
      .gte('created_at', windowStart.toISOString());

    if (error && error.code === '42P01') {
      // テーブルが存在しない場合
      return { allowed: true, remaining: maxRequests, resetAt: new Date() };
    }

    const requestCount = requests?.length || 0;
    const remaining = Math.max(0, maxRequests - requestCount);
    const resetAt = new Date(windowStart.getTime() + window);

    if (requestCount >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    // 新しいリクエストを記録
    await supabase
      .from(tableName)
      .insert({
        identifier: id,
        endpoint: req.url || 'unknown',
        created_at: now.toISOString()
      });

    // 古いレコードを削除（1日以上前）
    const cleanupDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await supabase
      .from(tableName)
      .delete()
      .lt('created_at', cleanupDate.toISOString());

    return { allowed: true, remaining: remaining - 1, resetAt };

  } catch (error) {
    // エラーの場合は制限なし（フェイルオープン）
    return { allowed: true, remaining: maxRequests, resetAt: new Date() };
  }
}

// IPブロッキングチェック
export async function checkIPBlocking(req: VercelRequest): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return true; // Supabaseが設定されていない場合は許可
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
             req.headers['x-real-ip']?.toString() || 
             'unknown';

  try {
    const { data: blockedIP } = await supabase
      .from('blocked_ips')
      .select('id')
      .eq('ip_address', ip)
      .eq('is_active', true)
      .single();

    return !blockedIP; // ブロックされていなければtrue

  } catch (error) {
    // エラーまたはレコードが見つからない場合は許可
    return true;
  }
}

// レート制限ミドルウェア
export function rateLimitMiddleware(options: RateLimitOptions) {
  return async (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    const { allowed, remaining, resetAt } = await checkRateLimit(req, options);

    // レート制限ヘッダーを設定
    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetAt.toISOString());

    if (!allowed) {
      res.status(429).json({
        error: 'リクエストが多すぎます。しばらく待ってからお試しください。',
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000)
      });
      return;
    }

    if (next) {
      next();
    }
  };
}