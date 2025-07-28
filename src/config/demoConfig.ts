/**
 * デモ環境設定ファイル
 * セキュリティを保ったデモ環境のパラメータ管理
 */

export const DEMO_CONFIG = {
  // デモ用電話番号リスト
  phoneNumbers: [
    '09000000001', '09000000002', '09000000003', '09000000004', '09000000005',
    '09000000006', '09000000007', '09000000008', '09000000009', '09000000010'
  ] as const,

  // デモ用固定OTPコード
  otpCode: '123456',

  // セッション設定
  session: {
    timeout: 30 * 60 * 1000, // 30分
    maxConcurrentSessions: 50,
    maxSessionsPerIP: 3,
    cleanupInterval: 60 * 60 * 1000, // 1時間ごとにクリーンアップ
  },

  // レート制限設定
  rateLimit: {
    smsPerMinute: 3, // 1分間に3回まで
    smsPerHour: 10,  // 1時間に10回まで
    verifyAttempts: 5, // OTP入力試行回数
  },

  // 許可されたオリジン
  allowedOrigins: [
    'https://moneyticket.vercel.app',
    'https://moneyticket-git-main-sakkayuta.vercel.app',
    'https://moneyticket-git-main-seai0520s-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],

  // UI設定
  ui: {
    showDemoWarning: true,
    showInstructions: true,
    autoHideOtpCode: false, // デモでは常に表示
    highlightDemoFeatures: true,
  },

  // ログ設定
  logging: {
    enabled: true,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    retentionDays: 30,
    includeClientInfo: true,
  },

  // セキュリティ設定
  security: {
    tokenLength: 64,
    encryptData: true,
    auditTrail: true,
    ipWhitelist: [], // 空の場合は全IP許可
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15分
  }
} as const;

// デモ用電話番号の検証
export function isDemoPhoneNumber(phone: string): boolean {
  const normalized = phone.replace(/[^\d]/g, '');
  return DEMO_CONFIG.phoneNumbers.includes(normalized as any);
}

// デモ用電話番号のフォーマット
export function formatDemoPhoneNumber(phone: string): string {
  const normalized = phone.replace(/[^\d]/g, '');
  if (normalized.length === 11) {
    return normalized.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  return phone;
}

// デモセッションの有効性チェック
export function isValidDemoSession(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}

// デモ環境かどうかの判定（環境変数ベース）
export function isDemoEnvironment(): boolean {
  // 開発環境では常にデモ機能を有効化
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname.includes('vercel.app');
  }
  return false;
}

// デモ統計情報の取得用インターフェース
export interface DemoStatistics {
  totalSessions: number;
  activeSessions: number;
  completedVerifications: number;
  avgActivityPerSession: number;
  lastSessionCreated: string | null;
  uniqueIPs: number;
}

// デモアクセスログの種別
export enum DemoActionType {
  SESSION_CREATED = 'session_created',
  SMS_SENT = 'sms_sent',
  OTP_VERIFIED = 'otp_verified',
  SESSION_EXPIRED = 'session_expired',
  ACCESS_DENIED = 'access_denied',
  RATE_LIMITED = 'rate_limited',
}

// デモエラーメッセージ
export const DEMO_ERROR_MESSAGES = {
  INVALID_PHONE: 'デモ用電話番号を使用してください（例: 090-0000-0001）',
  INVALID_TOKEN: 'デモアクセストークンが無効または期限切れです',
  RATE_LIMITED: 'デモ用SMS送信回数の上限に達しました',
  SESSION_EXPIRED: 'デモセッションが期限切れです。新しいアクセスを要求してください',
  MAX_SESSIONS: 'デモセッション数の上限に達しました。しばらく待ってからお試しください',
  INVALID_OTP: '認証コードが正しくありません。デモ用コード: 123456',
  SYSTEM_ERROR: 'デモシステムエラーが発生しました',
} as const;

// デモ成功メッセージ
export const DEMO_SUCCESS_MESSAGES = {
  ACCESS_GRANTED: 'デモアクセスが承認されました',
  SMS_SENT: 'デモ用認証コードを準備しました',
  OTP_VERIFIED: 'デモ用認証が完了しました',
  SESSION_CREATED: 'デモセッションが作成されました',
} as const;

// デモ環境の制限事項
export const DEMO_LIMITATIONS = [
  '実際のSMS送信は行われません',
  'デモ用電話番号のみ使用可能',
  'セッション時間は30分間に制限',
  'データは本番環境と分離されています',
  '同時接続数に制限があります'
] as const;

// デモ環境の利点
export const DEMO_BENEFITS = [
  'SMS料金が発生しません',
  '即座に認証コードが確認できます',
  'セキュリティ機能は本番環境と同等',
  '安全にシステムを体験できます',
  '開発者向けの詳細な動作確認が可能'
] as const;