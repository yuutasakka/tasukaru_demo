import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { createHash } from 'crypto';

// 機密情報をマスクする関数
function maskSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const masked = { ...obj };
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'cookie', 'session', 'otp', 'code', 'verification',
    'email', 'phoneNumber', 'phone', 'creditCard', 'ssn'
  ];
  
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    
    // 機密フィールドをマスク
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      if (typeof masked[key] === 'string') {
        // メールアドレスの場合
        if (lowerKey.includes('email') && masked[key].includes('@')) {
          const [user, domain] = masked[key].split('@');
          masked[key] = `${user.substring(0, 2)}***@${domain}`;
        }
        // 電話番号の場合
        else if (lowerKey.includes('phone')) {
          masked[key] = `***${masked[key].slice(-4)}`;
        }
        // その他の機密情報
        else {
          masked[key] = '[REDACTED]';
        }
      }
    }
    // ネストされたオブジェクトも再帰的に処理
    else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  
  // req.bodyの内容もマスク
  if (masked.body) {
    masked.body = maskSensitiveData(masked.body);
  }
  
  // headersの機密情報もマスク
  if (masked.headers) {
    const headers = { ...masked.headers };
    if (headers.authorization) {
      headers.authorization = '[REDACTED]';
    }
    if (headers.cookie) {
      headers.cookie = '[REDACTED]';
    }
    masked.headers = headers;
  }
  
  return masked;
}

// カスタムフォーマッター
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  // メタデータをマスク
  const maskedMetadata = maskSensitiveData(metadata);
  
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...maskedMetadata
  });
});

// ログローテーション設定
const rotateTransport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // 14日間保持
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat
  )
});

// エラーログ専用のローテーション
const errorRotateTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // エラーログは30日間保持
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    customFormat
  )
});

// ロガーの作成
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: { service: 'taskal-auth' },
  transports: [
    rotateTransport,
    errorRotateTransport
  ],
  // エラー処理
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  exitOnError: false // エラーでプロセスを終了しない
});

// 開発環境ではコンソール出力も追加
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// グレースフルシャットダウン
export function gracefulShutdown(): Promise<void> {
  return new Promise((resolve) => {
    logger.info('Graceful shutdown initiated');
    logger.end(() => {
      resolve();
    });
  });
}

// ログメソッドのラッパー（機密情報を自動的にマスク）
export function logInfo(message: string, meta?: any): void {
  logger.info(message, maskSensitiveData(meta));
}

export function logError(message: string, error?: any, meta?: any): void {
  const errorInfo = error instanceof Error ? {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    ...maskSensitiveData(meta)
  } : maskSensitiveData(meta);
  
  logger.error(message, errorInfo);
}

export function logWarn(message: string, meta?: any): void {
  logger.warn(message, maskSensitiveData(meta));
}

// 監査ログ（削除しない特別なログ）
export function auditLog(action: string, userId?: string, meta?: any): void {
  const auditInfo = {
    action,
    userId: userId ? createHash('sha256').update(userId).digest('hex').substring(0, 16) : undefined,
    timestamp: new Date().toISOString(),
    ...maskSensitiveData(meta)
  };
  
  logger.info('AUDIT', auditInfo);
}