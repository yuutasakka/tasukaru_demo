/**
 * デモ環境用ユーティリティ関数
 * デモ機能の共通処理とヘルパー関数
 */

import { DEMO_CONFIG, DemoActionType, DEMO_ERROR_MESSAGES } from '../config/demoConfig';

// デモトークンの生成
export function generateDemoToken(): string {
  const array = new Uint8Array(DEMO_CONFIG.security.tokenLength / 2);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// デモセッションデータの型定義
export interface DemoSessionData {
  demoToken: string;
  phoneNumber: string;
  isDemo: true;
  sessionId?: string;
  smsVerified: boolean;
  verifiedAt?: string;
  expiresAt: string;
  clientIP?: string;
}

// デモアクセスログの型定義
export interface DemoAccessLog {
  id?: string;
  demoToken?: string;
  clientIP: string;
  userAgent?: string;
  action: DemoActionType;
  requestData?: any;
  responseStatus?: number;
  createdAt: string;
}

// デモセッションの作成
export function createDemoSessionData(
  demoToken: string,
  phoneNumber: string,
  sessionId?: string
): DemoSessionData {
  const expiresAt = new Date(Date.now() + DEMO_CONFIG.session.timeout);
  
  return {
    demoToken,
    phoneNumber,
    isDemo: true,
    sessionId,
    smsVerified: true,
    verifiedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString()
  };
}

// デモアクセスログの作成
export function createDemoAccessLog(
  action: DemoActionType,
  clientIP: string,
  options: {
    demoToken?: string;
    userAgent?: string;
    requestData?: any;
    responseStatus?: number;
  } = {}
): DemoAccessLog {
  return {
    demoToken: options.demoToken,
    clientIP,
    userAgent: options.userAgent,
    action,
    requestData: options.requestData,
    responseStatus: options.responseStatus,
    createdAt: new Date().toISOString()
  };
}

// デモ電話番号の検証とフォーマット
export class DemoPhoneValidator {
  static validate(phone: string): { isValid: boolean; normalized: string; formatted: string } {
    const normalized = phone.replace(/[^\d]/g, '');
    const isValid = DEMO_CONFIG.phoneNumbers.includes(normalized as any);
    const formatted = this.format(normalized);
    
    return { isValid, normalized, formatted };
  }
  
  static format(phone: string): string {
    const normalized = phone.replace(/[^\d]/g, '');
    if (normalized.length === 11) {
      return normalized.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return phone;
  }
  
  static getRandomDemoPhone(): string {
    const phones = DEMO_CONFIG.phoneNumbers;
    const randomIndex = Math.floor(Math.random() * phones.length);
    return phones[randomIndex];
  }
}

// デモレート制限チェッカー
export class DemoRateLimiter {
  static checkSMSRate(attempts: number, timeWindow: 'minute' | 'hour'): boolean {
    const limit = timeWindow === 'minute' 
      ? DEMO_CONFIG.rateLimit.smsPerMinute 
      : DEMO_CONFIG.rateLimit.smsPerHour;
    return attempts < limit;
  }
  
  static checkVerifyAttempts(attempts: number): boolean {
    return attempts < DEMO_CONFIG.rateLimit.verifyAttempts;
  }
  
  static getRemainingAttempts(attempts: number, type: 'sms' | 'verify'): number {
    const limit = type === 'sms' 
      ? DEMO_CONFIG.rateLimit.smsPerMinute 
      : DEMO_CONFIG.rateLimit.verifyAttempts;
    return Math.max(0, limit - attempts);
  }
}

// デモセッション管理
export class DemoSessionManager {
  private static readonly STORAGE_KEY = 'demoSession';
  
  static save(sessionData: DemoSessionData): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to save demo session:', error);
    }
  }
  
  static load(): DemoSessionData | null {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      
      const session = JSON.parse(data) as DemoSessionData;
      
      // 有効期限チェック
      if (new Date(session.expiresAt) < new Date()) {
        this.clear();
        return null;
      }
      
      return session;
    } catch (error) {
      console.warn('Failed to load demo session:', error);
      return null;
    }
  }
  
  static clear(): void {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear demo session:', error);
    }
  }
  
  static isActive(): boolean {
    const session = this.load();
    return session !== null && session.isDemo;
  }
}

// デモエラーハンドラー
export class DemoErrorHandler {
  static getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      // 既知のエラーメッセージのマッピング
      const message = error.message.toLowerCase();
      
      if (message.includes('phone') || message.includes('電話番号')) {
        return DEMO_ERROR_MESSAGES.INVALID_PHONE;
      }
      
      if (message.includes('token') || message.includes('トークン')) {
        return DEMO_ERROR_MESSAGES.INVALID_TOKEN;
      }
      
      if (message.includes('rate') || message.includes('制限')) {
        return DEMO_ERROR_MESSAGES.RATE_LIMITED;
      }
      
      if (message.includes('expired') || message.includes('期限')) {
        return DEMO_ERROR_MESSAGES.SESSION_EXPIRED;
      }
      
      if (message.includes('otp') || message.includes('認証コード')) {
        return DEMO_ERROR_MESSAGES.INVALID_OTP;
      }
      
      return error.message;
    }
    
    return DEMO_ERROR_MESSAGES.SYSTEM_ERROR;
  }
  
  static logError(error: any, context: string): void {
    console.error(`[Demo Error - ${context}]:`, error);
  }
}

// デモ統計情報の計算
export class DemoStatistics {
  static calculateSessionDuration(createdAt: string, endedAt?: string): number {
    const start = new Date(createdAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    return Math.max(0, end.getTime() - start.getTime());
  }
  
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`;
    }
    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  }
}

// デモ環境の検証
export class DemoEnvironmentValidator {
  static isValidOrigin(origin: string): boolean {
    if (!origin) return false;
    
    return DEMO_CONFIG.allowedOrigins.some(allowed => {
      return origin === allowed || origin.includes('vercel.app');
    });
  }
  
  static isValidUserAgent(userAgent: string): boolean {
    // 基本的なボット検出（必要に応じて拡張）
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ];
    
    return !botPatterns.some(pattern => pattern.test(userAgent));
  }
  
  static validateRequest(req: {
    origin?: string;
    userAgent?: string;
    ip?: string;
  }): { isValid: boolean; reason?: string } {
    if (req.origin && !this.isValidOrigin(req.origin)) {
      return { isValid: false, reason: 'Invalid origin' };
    }
    
    if (req.userAgent && !this.isValidUserAgent(req.userAgent)) {
      return { isValid: false, reason: 'Invalid user agent' };
    }
    
    return { isValid: true };
  }
}

// デモデータのサニタイズ
export class DemoDataSanitizer {
  static sanitizePhoneNumber(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }
  
  static sanitizeOTP(otp: string): string {
    return otp.replace(/[^\d]/g, '').slice(0, 6);
  }
  
  static sanitizeToken(token: string): string {
    return token.replace(/[^a-f0-9]/g, '').slice(0, DEMO_CONFIG.security.tokenLength);
  }
  
  static sanitizeIP(ip: string): string {
    // IPv4とIPv6の基本的な検証
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    
    if (ipv4Pattern.test(ip) || ipv6Pattern.test(ip)) {
      return ip;
    }
    
    return 'unknown';
  }
}