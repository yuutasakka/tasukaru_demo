import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  status?: number;
  details?: any;
}

/**
 * グローバルエラーハンドラー
 * 本番環境では機密情報を隠蔽し、開発環境でのみ詳細を表示
 */
export function errorHandler(
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // エラーログを記録（サーバーサイドのみ）
  console.error('Error occurred:', {
    message: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // 開発環境でのみスタックトレースをログに記録
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', err.stack);
  }

  // ステータスコードの設定
  const statusCode = err.status || 500;

  // レスポンスの作成
  const response: any = {
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  // 開発環境でのみ詳細情報を含める
  if (process.env.NODE_ENV === 'development') {
    response.details = err.details || err.message;
    response.stack = err.stack;
    response.url = req.url;
    response.method = req.method;
  } else {
    // 本番環境では一般的なメッセージのみ
    if (statusCode === 500) {
      response.error = 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。';
    }
  }

  // レスポンスを送信
  res.status(statusCode).json(response);
}

/**
 * 非同期エラーをキャッチするラッパー
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404エラーハンドラー
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: 'リクエストされたリソースが見つかりません。',
    statusCode: 404,
    timestamp: new Date().toISOString()
  });
}

/**
 * SQL関連のエラーをサニタイズ
 */
export function sanitizeSQLError(error: any): string {
  const message = error.message || error.toString();
  
  // SQL文やテーブル名を隠蔽
  const sanitized = message
    .replace(/SELECT.*FROM.*WHERE/gi, '[SQL QUERY]')
    .replace(/INSERT.*INTO.*VALUES/gi, '[SQL QUERY]')
    .replace(/UPDATE.*SET.*WHERE/gi, '[SQL QUERY]')
    .replace(/DELETE.*FROM.*WHERE/gi, '[SQL QUERY]')
    .replace(/\b\w+\.\w+\b/g, '[TABLE.COLUMN]')
    .replace(/\b(users|admin|credentials|passwords?|tokens?|sessions?)\b/gi, '[SENSITIVE]');

  return sanitized;
}

/**
 * データベースエラーの処理
 */
export function handleDatabaseError(error: any): ErrorWithStatus {
  const sanitizedError = new Error('データベースエラーが発生しました。') as ErrorWithStatus;
  sanitizedError.status = 500;
  
  // 開発環境でのみ詳細を含める
  if (process.env.NODE_ENV === 'development') {
    sanitizedError.details = sanitizeSQLError(error);
  }
  
  return sanitizedError;
}

/**
 * 検証エラーの処理
 */
export function handleValidationError(errors: any[]): ErrorWithStatus {
  const error = new Error('入力データが無効です。') as ErrorWithStatus;
  error.status = 400;
  
  // フィールド名のみを含め、値は除外
  error.details = errors.map(err => ({
    field: err.param || err.field,
    message: err.msg || err.message
  }));
  
  return error;
}