import { logger } from './logger.config';

// プロセス監視とエラーハンドリング
export function setupProcessMonitoring(): void {
  // 未処理のPromiseリジェクション
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString()
    });
    
    // 本番環境では一定時間後に再起動
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        logger.error('Shutting down due to unhandled rejection');
        process.exit(1);
      }, 5000); // 5秒の猶予
    }
  });

  // 未処理の例外
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
    
    // クリーンアップを試みる
    try {
      // 新規接続の受付を停止
      if (global.server) {
        global.server.close(() => {
          logger.info('Server closed successfully');
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    } catch (err) {
      logger.error('Error during cleanup', err);
      process.exit(1);
    }
  });

  // メモリ使用量の監視
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    
    // メモリ使用量が高い場合に警告
    if (heapUsedMB > 500) {
      logger.warn('High memory usage detected', {
        heapUsed: `${heapUsedMB} MB`,
        heapTotal: `${heapTotalMB} MB`,
        rss: `${rssMB} MB`,
        heapUsagePercent: Math.round((usage.heapUsed / usage.heapTotal) * 100)
      });
    }
  }, 60000); // 1分ごと

  // プロセスシグナルのハンドリング
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    try {
      // サーバーの停止
      if (global.server) {
        await new Promise<void>((resolve) => {
          global.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }
      
      // データベース接続のクローズ
      // TODO: Supabaseクライアントのクリーンアップ
      
      // ログのフラッシュ
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  };

  // シグナルハンドラー
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

  // プロセス情報のログ
  logger.info('Process monitoring initialized', {
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  });
}

// グローバル変数の型定義
declare global {
  var server: any;
}