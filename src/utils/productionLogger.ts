// プロダクション環境用ロガー
// デバッグコードを本番環境でも安全に使用

interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info', 
  WARN: 'warn',
  ERROR: 'error'
};

interface LogContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  action?: string;
  timestamp?: string;
  [key: string]: any;
}

class ProductionLogger {
  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production' ||
           (typeof window !== 'undefined' && 
            window.location.hostname !== 'localhost' &&
            !window.location.hostname.includes('127.0.0.1') &&
            !window.location.hostname.includes('dev'));
  }

  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  // セキュリティ情報のマスキング
  private static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const masked = { ...data };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'otp', 'phone'];
    
    Object.keys(masked).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        if (typeof masked[key] === 'string') {
          masked[key] = masked[key].length > 4 ? 
            masked[key].substring(0, 2) + '***' + masked[key].substring(masked[key].length - 2) :
            '***';
        } else {
          masked[key] = '***';
        }
      }
    });
    
    return masked;
  }

  public static debug(message: string, context?: LogContext): void {
  }

  public static info(message: string, context?: LogContext): void {
  }

  public static warn(message: string, context?: LogContext): void {
  }

  public static error(message: string, error?: Error, context?: LogContext): void {
  }

  // セキュリティイベント専用ロガー
  public static security(event: string, details?: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
  }

  // パフォーマンス監視
  public static performance(metric: string, value: number, unit: string = 'ms', context?: LogContext): void {
  }
}

export default ProductionLogger;