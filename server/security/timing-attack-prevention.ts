import crypto from 'crypto';

/**
 * タイミング攻撃防止ユーティリティ
 */
export class TimingAttackPrevention {
  /**
   * 定時間比較（タイミング攻撃対策）
   */
  static safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // 長さが異なる場合も一定時間かかるようにする
      const dummy = crypto.randomBytes(32).toString('hex');
      crypto.timingSafeEqual(Buffer.from(dummy), Buffer.from(dummy));
      return false;
    }
    
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * 一定時間遅延を追加（レスポンスタイムの均一化）
   */
  static async constantTimeDelay(
    operation: () => Promise<any>,
    minimumTime: number = 100 // ミリ秒
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const elapsedTime = Date.now() - startTime;
      
      // 最小時間に満たない場合は遅延を追加
      if (elapsedTime < minimumTime) {
        await new Promise(resolve => 
          setTimeout(resolve, minimumTime - elapsedTime)
        );
      }
      
      return result;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      
      // エラー時も同じ時間を確保
      if (elapsedTime < minimumTime) {
        await new Promise(resolve => 
          setTimeout(resolve, minimumTime - elapsedTime)
        );
      }
      
      throw error;
    }
  }

  /**
   * ランダム遅延の追加（パターン分析防止）
   */
  static async randomDelay(min: number = 50, max: number = 150): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * ダミー処理の実行（サイドチャネル攻撃対策）
   */
  static executeDummyOperation(): void {
    // CPUを使用するダミー処理
    const iterations = 1000 + Math.floor(Math.random() * 1000);
    let result = 0;
    
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.random();
    }
    
    // メモリアクセスのダミー処理
    const buffer = Buffer.allocUnsafe(1024);
    crypto.randomFillSync(buffer);
  }

  /**
   * レスポンスサイズの均一化
   */
  static padResponse(data: any, targetSize: number = 1024): string {
    const jsonStr = JSON.stringify(data);
    const currentSize = Buffer.byteLength(jsonStr);
    
    if (currentSize >= targetSize) {
      return jsonStr;
    }
    
    // パディングを追加
    const paddingSize = targetSize - currentSize;
    const padding = crypto.randomBytes(Math.floor(paddingSize / 2))
      .toString('hex')
      .substring(0, paddingSize);
    
    return JSON.stringify({
      ...data,
      _padding: padding
    });
  }
}

/**
 * 認証エンドポイント用のミドルウェア
 */
export function timingProtectionMiddleware(minimumResponseTime: number = 100) {
  return async (req: any, res: any, next: any) => {
    const originalJson = res.json;
    const startTime = Date.now();

    // レスポンスをインターセプト
    res.json = async function(data: any) {
      const elapsedTime = Date.now() - startTime;
      
      // 最小レスポンス時間を確保
      if (elapsedTime < minimumResponseTime) {
        await new Promise(resolve => 
          setTimeout(resolve, minimumResponseTime - elapsedTime)
        );
      }
      
      // レスポンスサイズの均一化
      const paddedData = TimingAttackPrevention.padResponse(data);
      
      // オリジナルのjsonメソッドを呼び出し
      return originalJson.call(this, JSON.parse(paddedData));
    };

    next();
  };
}