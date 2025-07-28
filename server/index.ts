import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import winston from 'winston';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { SecureConfigManager, SECURITY_CONFIG } from '../security.config';
import { setupSwagger, setupMockEndpoints, apiVersioning } from './swagger';
import { comprehensiveSecurityHeaders, productionSecurityHeaders, developmentSecurityHeaders } from './security/comprehensive-headers';
import { DataEncryption, DatabaseEncryption, encryptionMiddleware } from './security/data-encryption';

// 環境変数を読み込み (.env.local を優先)
dotenv.config({ path: '.env.local' });
dotenv.config(); // .envもロード

// ロガーの設定
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-conectx-auth' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET環境変数が設定されていません');
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
}

// セキュリティヘッダーの設定（本番環境では厳格化）
const isProduction = NODE_ENV === 'production';

// 包括的なセキュリティヘッダーを適用
app.use(comprehensiveSecurityHeaders(
  isProduction ? productionSecurityHeaders : developmentSecurityHeaders
));

// Helmetの追加設定（互換性のため）
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isProduction 
        ? ["'self'", "https://cdnjs.cloudflare.com"] 
        : ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: isProduction 
        ? ["'self'", "https://cdnjs.cloudflare.com"]
        : ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: isProduction 
        ? ["'self'", "https:"]
        : ["'self'", "http://localhost:*", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      baseSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS設定の厳格化
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:3000',
      'https://your-production-domain.com' // 本番ドメインに変更
    ];
    
    // 開発環境では全てのlocalhostを許可
    if (NODE_ENV === 'development' && origin?.includes('localhost')) {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// レート制限の設定
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 50, // 一般的なAPIリクエストを削減
  message: {
    error: 'リクエストが多すぎます。15分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3, // SMS送信を3回まで
  message: {
    error: 'SMS送信の試行回数が上限に達しました。1時間後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 認証試行を5回まで
  message: {
    error: '認証試行回数が上限に達しました。15分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

// 一般的なレート制限を適用
app.use(generalLimiter);

// IPアドレス制限用のマップ
const ipRateLimits = new Map<string, { attempts: number; lastAttempt: number; blockedUntil?: number }>();

// IPアドレス制限チェック関数
const checkIPRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const limit = ipRateLimits.get(ip);
  
  if (!limit) {
    ipRateLimits.set(ip, { attempts: 1, lastAttempt: now });
    return true;
  }
  
  // ブロック期間中かチェック
  if (limit.blockedUntil && now < limit.blockedUntil) {
    return false;
  }
  
  // 制限時間ウィンドウをリセット
  if (now - limit.lastAttempt > SECURITY_CONFIG.SMS_RATE_LIMIT_WINDOW) {
    limit.attempts = 1;
    limit.lastAttempt = now;
    limit.blockedUntil = undefined;
    return true;
  }
  
  // 制限に達している場合
  if (limit.attempts >= SECURITY_CONFIG.SMS_RATE_LIMIT_PER_IP) {
    limit.blockedUntil = now + SECURITY_CONFIG.SMS_RATE_LIMIT_WINDOW;
    logger.warn('IP rate limit exceeded', { ip, attempts: limit.attempts });
    return false;
  }
  
  limit.attempts++;
  limit.lastAttempt = now;
  return true;
};

// Twilioクライアントの初期化（セキュリティ強化）
let client: any = null;
let twilioPhoneNumber: string = '';

const initializeTwilio = async () => {
  try {
    // Supabaseの環境設定から取得（本番環境用）
    const accountSid = await SecureConfigManager.getSecureConfig('twilio_account_sid') || process.env.TWILIO_ACCOUNT_SID;
    const authToken = await SecureConfigManager.getSecureConfig('twilio_auth_token') || process.env.TWILIO_AUTH_TOKEN;
    twilioPhoneNumber = await SecureConfigManager.getSecureConfig('twilio_phone_number') || process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      logger.error('Twilioの設定が不完全です', {
        accountSid: !!accountSid,
        authToken: !!authToken,
        twilioPhoneNumber: !!twilioPhoneNumber
      });
      throw new Error('Twilio設定が不完全です');
    }

    client = twilio(accountSid, authToken);
    logger.info('Twilio設定確認完了');
  } catch (error) {
    logger.error('Twilio初期化エラー', error);
    
    // 開発環境では警告のみ、本番環境では終了
    if (NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// ミドルウェア
app.use(express.json({ limit: '1mb' })); // リクエストサイズ制限

// セキュリティログ用ミドルウェア
app.use((req, res, next) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100), // User-Agent制限
    timestamp: new Date().toISOString()
  });
  next();
});

// インメモリストレージ（本番環境ではRedisやDBを使用）
const verificationCodes = new Map<string, { code: string; expiry: number; attempts: number; ip: string }>();

// 入力検証ルール（強化）
const phoneValidation = [
  body('phoneNumber')
    .isLength({ min: 10, max: 11 })
    .matches(/^[0-9]+$/)
    .withMessage('電話番号は10桁または11桁の数字で入力してください')
    .customSanitizer(value => value.toString().trim())
];

const verificationValidation = [
  body('phoneNumber')
    .isLength({ min: 10, max: 11 })
    .matches(/^[0-9]+$/)
    .withMessage('電話番号は10桁または11桁の数字で入力してください')
    .customSanitizer(value => value.toString().trim()),
  body('code')
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage('認証コードは4-6桁の数字で入力してください')
    .customSanitizer(value => value.toString().trim())
];

// 日本の電話番号を国際形式に正規化（型安全性強化）
function normalizeJapanesePhoneNumber(phoneNumber: unknown): string {
  // 型検証: 文字列であることを確認
  if (typeof phoneNumber !== 'string') {
    throw new Error('電話番号は文字列である必要があります');
  }
  
  // replaceメソッドが安全に使用できることを確認
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.startsWith('090') || digits.startsWith('080') || digits.startsWith('070')) {
    return '+81' + digits.substring(1);
  }
  
  if (digits.startsWith('0')) {
    return '+81' + digits.substring(1);
  }
  
  if (digits.startsWith('81')) {
    return '+' + digits;
  }
  
  return '+81' + digits;
}

// 認証コード生成（暗号学的に安全）
function generateSecureCode(): string {
  const randomBytesBuffer = randomBytes(2);
  const code = (randomBytesBuffer.readUInt16BE(0) % 9000 + 1000).toString();
  return code;
}

// SMS送信エンドポイント（セキュリティ強化版）
app.post('/api/sms/send', smsLimiter, phoneValidation, async (req: Request, res: Response) => {
  try {
    // IPアドレス制限チェック
    const clientIP = req.ip || 'unknown';
    if (!checkIPRateLimit(clientIP)) {
      logger.warn('IP rate limit exceeded for SMS send', { ip: clientIP });
      return res.status(429).json({
        error: 'IP アドレスからの送信回数が上限に達しました。しばらく待ってから再試行してください。'
      });
    }

    // 入力検証
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('SMS送信: 入力検証エラー', {
        errors: errors.array(),
        ip: clientIP
      });
      return res.status(400).json({
        error: '入力データが無効です',
        details: errors.array()
      });
    }

    const { phoneNumber } = req.body;
    const normalizedPhoneNumber = normalizeJapanesePhoneNumber(phoneNumber);
    
    // 既存のコードがある場合の制限チェック
    const existing = verificationCodes.get(normalizedPhoneNumber);
    if (existing && existing.attempts >= 3) {
      logger.warn('SMS送信: 試行回数上限', {
        // 電話番号は最後の4桁のみ記録
        phoneNumberLast4: normalizedPhoneNumber.slice(-4),
        attempts: existing.attempts,
        ip: clientIP
      });
      return res.status(429).json({
        error: '認証コードの送信回数が上限に達しました。しばらく待ってから再試行してください。'
      });
    }

    const verificationCode = generateSecureCode();
    const expiry = Date.now() + 5 * 60 * 1000; // 5分後に期限切れ

    // 認証コードを一時保存（IPアドレス付き）
    verificationCodes.set(normalizedPhoneNumber, {
      code: verificationCode,
      expiry: expiry,
      attempts: existing ? existing.attempts + 1 : 1,
      ip: clientIP
    });

    // SMSメッセージの内容
    const message = `タスカル認証コード: ${verificationCode}\n5分以内にご入力ください。このコードを他人に教えないでください。`;

    // Twilioが初期化されていない場合は初期化
    if (!client) {
      await initializeTwilio();
    }

    if (!client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      // TwilioでSMS送信
      const smsResult = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: normalizedPhoneNumber,
      });

      logger.info('SMS送信成功', {
        // 電話番号は最後の4桁のみ記録（プライバシー保護）
        phoneNumberLast4: normalizedPhoneNumber.slice(-4),
        messageSid: smsResult.sid,
        ip: clientIP
      });

      return res.json({
        success: true,
        message: 'SMS認証コードを送信しました',
        phoneNumber: normalizedPhoneNumber
      });

    } catch (twilioError) {
      const isDevelopment = NODE_ENV === 'development';
      const errorMessage = twilioError instanceof Error ? twilioError.message : 'Unknown error';
      
      // 開発環境でもTwilioエラーは上位にスロー
      throw twilioError;

      // その他のTwilioエラーは上位にスロー
      throw twilioError;
    }

  } catch (error) {
    const isDevelopment = NODE_ENV === 'development';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('SMS送信エラー', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip
    });

    
    res.status(500).json({
      error: 'SMS送信に失敗しました',
      details: isDevelopment ? errorMessage : 'Internal server error'
    });
  }
});

// SMS認証コード検証エンドポイント（セキュリティ強化版）
app.post('/api/sms/verify', authLimiter, verificationValidation, async (req: Request, res: Response) => {
  try {
    // 入力検証
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('SMS認証: 入力検証エラー', {
        errors: errors.array(),
        ip: req.ip
      });
      return res.status(400).json({
        error: '入力データが無効です',
        details: errors.array()
      });
    }

    const { phoneNumber, code } = req.body;
    const normalizedPhoneNumber = normalizeJapanesePhoneNumber(phoneNumber);
    const stored = verificationCodes.get(normalizedPhoneNumber);
    const clientIP = req.ip || 'unknown';
    
    if (!stored) {
      logger.warn('SMS認証: コードが見つからない', {
        phoneNumber: normalizedPhoneNumber,
        ip: clientIP
      });
      return res.status(400).json({
        error: '認証コードが見つかりません',
        verified: false
      });
    }

    // IPアドレスチェック（セキュリティ強化）
    if (stored.ip !== clientIP) {
      logger.warn('SMS認証: IPアドレス不一致', {
        phoneNumber: normalizedPhoneNumber,
        storedIP: stored.ip,
        currentIP: clientIP
      });
      return res.status(400).json({
        error: 'セキュリティエラー: 認証コードの送信元と異なるIPアドレスです',
        verified: false
      });
    }
    
    // 有効期限をチェック
    if (Date.now() > stored.expiry) {
      verificationCodes.delete(normalizedPhoneNumber);
      logger.warn('SMS認証: コード期限切れ', {
        phoneNumber: normalizedPhoneNumber,
        ip: clientIP
      });
      return res.status(400).json({
        error: '認証コードの有効期限が切れています',
        verified: false
      });
    }
    
    // コードが一致するかチェック
    if (stored.code === code) {
      verificationCodes.delete(normalizedPhoneNumber);
      
      // JWTトークンを生成（動的シークレット使用）
      const jwtSecret = await SecureConfigManager.getJWTSecret();
      // JWTトークンの生成（有効期限を短縮）
      const token = jwt.sign(
        { 
          phoneNumber: normalizedPhoneNumber, 
          verified: true, 
          ip: clientIP,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15分
        },
        jwtSecret,
        { 
          algorithm: 'HS256',
          audience: 'moneyticket-app',
          issuer: 'moneyticket-auth'
        }
      );

      logger.info('SMS認証成功', {
        phoneNumber: normalizedPhoneNumber,
        ip: clientIP
      });
      
      return res.json({
        success: true,
        message: '認証が完了しました',
        verified: true,
        token: token
      });
    } else {
      logger.warn('SMS認証: コード不一致', {
        phoneNumber: normalizedPhoneNumber,
        providedCode: code,
        ip: clientIP
      });
      return res.status(400).json({
        error: '認証コードが正しくありません',
        verified: false
      });
    }

  } catch (error) {
    logger.error('SMS認証エラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip
    });

    res.status(500).json({
      error: '認証処理に失敗しました'
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV 
  });
});

// 404ハンドラー
app.use('*', (req: Request, res: Response) => {
  logger.warn('404 Not Found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドリングミドルウェア
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // スタックトレースはログにのみ記録（レスポンスには含めない）
  logger.error('Unhandled error', {
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    error: 'Internal server error',
    message: 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。',
    // 開発環境でもスタックトレースは含めない（セキュリティ強化）
    details: NODE_ENV === 'development' ? err.message : undefined
  });
});

// 終了時のクリーンアップ
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

// サーバー起動
const startServer = async () => {
  try {
    // Twilio初期化（エラーが発生しても継続）
    try {
      await initializeTwilio();
    } catch (twilioError) {
    }
    
    // APIバージョニングミドルウェア
    app.use(apiVersioning());
    
    // Swagger UIとAPIドキュメントの設定
    setupSwagger(app);
    
    // 開発環境でのモックエンドポイント
    if (NODE_ENV === 'development') {
      setupMockEndpoints(app);
    }
    
    app.listen(PORT, () => {
      logger.info('サーバー起動', {
        environment: NODE_ENV,
        port: PORT
      });
    });
  } catch (error) {
    logger.error('サーバー起動エラー', error);
    process.exit(1);
  }
};

startServer();

export default app; 