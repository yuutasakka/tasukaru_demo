// エンタープライズレベルパスワードセキュリティ管理システム
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';
import { secureLog } from '../config/clientSecurity';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfoInPassword: boolean;
  passwordHistoryCount: number;
  maxConsecutiveChars: number;
  preventKeyboardPatterns: boolean;
}

export interface PasswordStrength {
  score: number; // 0-100
  level: 'very_weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
  feedback: string[];
  estimatedCrackTime: string;
  entropy: number;
}

export interface AccountLockoutPolicy {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  progressiveLockout: boolean;
  lockoutResetHours: number;
  suspiciousActivityThreshold: number;
}

export interface UserPasswordData {
  userId: string;
  hashedPassword: string;
  salt: string;
  passwordHistory: string[];
  failedAttempts: number;
  lastFailedAttempt: number;
  lockedUntil: number;
  lockoutCount: number;
  lastPasswordChange: number;
  passwordExpiry: number;
  requiresPasswordChange: boolean;
}

export class PasswordSecurityManager {
  private static readonly SALT_ROUNDS = 14; // 高セキュリティ設定
  private static readonly MAX_PASSWORD_AGE = 90 * 24 * 60 * 60 * 1000; // 90日
  
  // デフォルトパスワードポリシー
  private static readonly DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
    passwordHistoryCount: 12,
    maxConsecutiveChars: 3,
    preventKeyboardPatterns: true
  };
  
  // デフォルトアカウントロックアウトポリシー
  private static readonly DEFAULT_LOCKOUT_POLICY: AccountLockoutPolicy = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    progressiveLockout: true,
    lockoutResetHours: 24,
    suspiciousActivityThreshold: 10
  };
  
  // よく使われる危険なパスワードリスト（簡易版）
  private static readonly COMMON_PASSWORDS = new Set([
    'password', 'password123', '123456', 'qwerty', 'abc123', 'letmein',
    'monkey', '1234567890', 'dragon', 'princess', 'password1', 'welcome',
    'admin', 'administrator', 'root', 'toor', 'guest', 'user', 'test',
    'パスワード', 'password!', 'Password1', 'Password123', '12345678'
  ]);
  
  // キーボードパターン
  private static readonly KEYBOARD_PATTERNS = [
    'qwerty', 'asdf', 'zxcv', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
    '1234567890', '!@#$%^&*()', 'abcdefghij'
  ];
  
  // パスワードデータストレージ（本番環境ではデータベース使用）
  private static passwordData = new Map<string, UserPasswordData>();
  
  /**
   * セキュアなパスワードハッシュ化
   */
  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    try {
      // カスタムソルト生成（追加セキュリティ）
      const customSalt = this.generateSecureSalt();
      
      // パスワードにペッパーを追加
      const peppered = await this.addPepper(password);
      
      // bcryptでハッシュ化
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hash = await bcrypt.hash(peppered + customSalt, salt);
      
      secureLog('パスワードハッシュ化完了', { 
        saltRounds: this.SALT_ROUNDS,
        customSaltLength: customSalt.length 
      });
      
      return { hash, salt: customSalt };
    } catch (error) {
      secureLog('パスワードハッシュ化エラー:', error);
      throw new Error('パスワードのハッシュ化に失敗しました');
    }
  }
  
  /**
   * パスワード検証
   */
  static async verifyPassword(
    userId: string,
    password: string,
    ipAddress: string
  ): Promise<{ success: boolean; reason?: string; lockoutRemaining?: number }> {
    try {
      const userData = this.passwordData.get(userId);
      if (!userData) {
        return { success: false, reason: 'user_not_found' };
      }
      
      // アカウントロックアウトチェック
      const lockoutCheck = this.checkAccountLockout(userData);
      if (!lockoutCheck.allowed) {
        return { 
          success: false, 
          reason: 'account_locked',
          lockoutRemaining: lockoutCheck.remainingTime 
        };
      }
      
      // パスワード検証
      const peppered = await this.addPepper(password);
      const isValid = await bcrypt.compare(peppered + userData.salt, userData.hashedPassword);
      
      if (isValid) {
        // 成功時の処理
        this.resetFailedAttempts(userId);
        this.checkPasswordExpiry(userData);
        
        secureLog('パスワード検証成功', { userId, ipAddress });
        return { success: true };
      } else {
        // 失敗時の処理
        this.recordFailedAttempt(userId, ipAddress);
        
        secureLog('パスワード検証失敗', { userId, ipAddress });
        return { success: false, reason: 'invalid_password' };
      }
    } catch (error) {
      secureLog('パスワード検証エラー:', error);
      return { success: false, reason: 'verification_error' };
    }
  }
  
  /**
   * パスワード強度チェック
   */
  static checkPasswordStrength(
    password: string,
    userInfo?: { email?: string; name?: string; username?: string }
  ): PasswordStrength {
    let score = 0;
    const feedback: string[] = [];
    
    // 長さチェック
    if (password.length >= 12) score += 25;
    else if (password.length >= 8) score += 15;
    else feedback.push('パスワードは12文字以上にしてください');
    
    // 文字種チェック
    if (/[A-Z]/.test(password)) score += 15;
    else feedback.push('大文字を含めてください');
    
    if (/[a-z]/.test(password)) score += 15;
    else feedback.push('小文字を含めてください');
    
    if (/[0-9]/.test(password)) score += 15;
    else feedback.push('数字を含めてください');
    
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) score += 15;
    else feedback.push('特殊文字を含めてください');
    
    // 多様性チェック
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 10;
    else feedback.push('より多様な文字を使用してください');
    
    // 一般的なパスワードチェック
    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      score = Math.max(0, score - 50);
      feedback.push('よく使われるパスワードは避けてください');
    }
    
    // ユーザー情報含有チェック
    if (userInfo && this.containsUserInfo(password, userInfo)) {
      score = Math.max(0, score - 30);
      feedback.push('個人情報を含むパスワードは避けてください');
    }
    
    // キーボードパターンチェック
    if (this.containsKeyboardPattern(password)) {
      score = Math.max(0, score - 20);
      feedback.push('キーボードパターンは避けてください');
    }
    
    // 連続文字チェック
    if (this.hasConsecutiveChars(password, 3)) {
      score = Math.max(0, score - 15);
      feedback.push('連続する同じ文字は避けてください');
    }
    
    // エントロピー計算
    const entropy = this.calculateEntropy(password);
    if (entropy < 60) {
      score = Math.max(0, score - 10);
      feedback.push('より予測困難なパスワードにしてください');
    }
    
    // レベル判定
    let level: PasswordStrength['level'];
    if (score >= 90) level = 'very_strong';
    else if (score >= 80) level = 'strong';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'fair';
    else if (score >= 20) level = 'weak';
    else level = 'very_weak';
    
    // クラック時間推定
    const estimatedCrackTime = this.estimateCrackTime(entropy);
    
    return {
      score: Math.min(100, score),
      level,
      feedback,
      estimatedCrackTime,
      entropy
    };
  }
  
  /**
   * パスワードポリシー検証
   */
  static validatePasswordPolicy(
    password: string,
    policy: PasswordPolicy = this.DEFAULT_PASSWORD_POLICY,
    userInfo?: { email?: string; name?: string; username?: string }
  ): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // 長さチェック
    if (password.length < policy.minLength) {
      violations.push(`パスワードは${policy.minLength}文字以上である必要があります`);
    }
    if (password.length > policy.maxLength) {
      violations.push(`パスワードは${policy.maxLength}文字以下である必要があります`);
    }
    
    // 文字種チェック
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      violations.push('大文字を含める必要があります');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      violations.push('小文字を含める必要があります');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      violations.push('数字を含める必要があります');
    }
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      violations.push('特殊文字を含める必要があります');
    }
    
    // 一般的なパスワードチェック
    if (policy.preventCommonPasswords && this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      violations.push('よく使われるパスワードは使用できません');
    }
    
    // ユーザー情報チェック
    if (policy.preventUserInfoInPassword && userInfo && this.containsUserInfo(password, userInfo)) {
      violations.push('個人情報を含むパスワードは使用できません');
    }
    
    // 連続文字チェック
    if (this.hasConsecutiveChars(password, policy.maxConsecutiveChars)) {
      violations.push(`${policy.maxConsecutiveChars}文字以上連続する同じ文字は使用できません`);
    }
    
    // キーボードパターンチェック
    if (policy.preventKeyboardPatterns && this.containsKeyboardPattern(password)) {
      violations.push('キーボードパターンは使用できません');
    }
    
    return {
      valid: violations.length === 0,
      violations
    };
  }
  
  /**
   * パスワード変更
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    userInfo?: { email?: string; name?: string; username?: string }
  ): Promise<{ success: boolean; reason?: string; violations?: string[] }> {
    try {
      // 現在のパスワード検証
      const currentCheck = await this.verifyPassword(userId, currentPassword, 'localhost');
      if (!currentCheck.success) {
        return { success: false, reason: 'current_password_invalid' };
      }
      
      // 新しいパスワードのポリシー検証
      const policyCheck = this.validatePasswordPolicy(newPassword, this.DEFAULT_PASSWORD_POLICY, userInfo);
      if (!policyCheck.valid) {
        return { success: false, reason: 'policy_violation', violations: policyCheck.violations };
      }
      
      // パスワード履歴チェック
      const userData = this.passwordData.get(userId);
      if (userData && this.isPasswordInHistory(newPassword, userData)) {
        return { success: false, reason: 'password_recently_used' };
      }
      
      // 新しいパスワードをハッシュ化
      const { hash, salt } = await this.hashPassword(newPassword);
      
      // パスワードデータを更新
      this.updatePasswordData(userId, hash, salt);
      
      secureLog('パスワード変更成功', { userId });
      return { success: true };
    } catch (error) {
      secureLog('パスワード変更エラー:', error);
      return { success: false, reason: 'change_error' };
    }
  }
  
  /**
   * アカウントロックアウトチェック
   */
  private static checkAccountLockout(userData: UserPasswordData): { allowed: boolean; remainingTime?: number } {
    const now = Date.now();
    
    // ロックアウト中かチェック
    if (userData.lockedUntil > now) {
      return { 
        allowed: false, 
        remainingTime: Math.ceil((userData.lockedUntil - now) / 60000) 
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 失敗試行記録
   */
  private static recordFailedAttempt(userId: string, ipAddress: string): void {
    const userData = this.passwordData.get(userId);
    if (!userData) return;
    
    userData.failedAttempts++;
    userData.lastFailedAttempt = Date.now();
    
    // ロックアウト判定
    if (userData.failedAttempts >= this.DEFAULT_LOCKOUT_POLICY.maxFailedAttempts) {
      const lockoutDuration = this.calculateLockoutDuration(userData.lockoutCount);
      userData.lockedUntil = Date.now() + lockoutDuration;
      userData.lockoutCount++;
      
      secureLog('アカウントロックアウト', {
        userId,
        ipAddress,
        failedAttempts: userData.failedAttempts,
        lockoutDuration
      });
    }
    
    this.passwordData.set(userId, userData);
  }
  
  /**
   * 失敗試行リセット
   */
  private static resetFailedAttempts(userId: string): void {
    const userData = this.passwordData.get(userId);
    if (!userData) return;
    
    userData.failedAttempts = 0;
    userData.lastFailedAttempt = 0;
    this.passwordData.set(userId, userData);
  }
  
  /**
   * ロックアウト期間計算（プログレッシブ）
   */
  private static calculateLockoutDuration(lockoutCount: number): number {
    const baseDuration = this.DEFAULT_LOCKOUT_POLICY.lockoutDurationMinutes * 60 * 1000;
    
    if (!this.DEFAULT_LOCKOUT_POLICY.progressiveLockout) {
      return baseDuration;
    }
    
    // プログレッシブロックアウト（指数的に増加）
    return baseDuration * Math.pow(2, Math.min(lockoutCount, 5));
  }
  
  /**
   * パスワード履歴チェック
   */
  private static isPasswordInHistory(password: string, userData: UserPasswordData): boolean {
    // 実装では、新しいパスワードを同じ方法でハッシュ化して比較
    // ここでは簡易実装
    return false;
  }
  
  /**
   * ユーザー情報含有チェック
   */
  private static containsUserInfo(password: string, userInfo: { email?: string; name?: string; username?: string }): boolean {
    const lowerPassword = password.toLowerCase();
    
    if (userInfo.email && lowerPassword.includes(userInfo.email.split('@')[0].toLowerCase())) {
      return true;
    }
    if (userInfo.name && lowerPassword.includes(userInfo.name.toLowerCase())) {
      return true;
    }
    if (userInfo.username && lowerPassword.includes(userInfo.username.toLowerCase())) {
      return true;
    }
    
    return false;
  }
  
  /**
   * キーボードパターンチェック
   */
  private static containsKeyboardPattern(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return this.KEYBOARD_PATTERNS.some(pattern => 
      lowerPassword.includes(pattern) || lowerPassword.includes(pattern.split('').reverse().join(''))
    );
  }
  
  /**
   * 連続文字チェック
   */
  private static hasConsecutiveChars(password: string, maxConsecutive: number): boolean {
    let consecutive = 1;
    
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        consecutive++;
        if (consecutive >= maxConsecutive) {
          return true;
        }
      } else {
        consecutive = 1;
      }
    }
    
    return false;
  }
  
  /**
   * エントロピー計算
   */
  private static calculateEntropy(password: string): number {
    const charSets = [
      { regex: /[a-z]/, size: 26 },
      { regex: /[A-Z]/, size: 26 },
      { regex: /[0-9]/, size: 10 },
      { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, size: 32 }
    ];
    
    let alphabetSize = 0;
    charSets.forEach(set => {
      if (set.regex.test(password)) {
        alphabetSize += set.size;
      }
    });
    
    return password.length * Math.log2(alphabetSize);
  }
  
  /**
   * クラック時間推定
   */
  private static estimateCrackTime(entropy: number): string {
    const attemptsPerSecond = 1000000000; // 10億回/秒（GPUクラッキング想定）
    const secondsToCrack = Math.pow(2, entropy - 1) / attemptsPerSecond;
    
    if (secondsToCrack < 60) return '1分未満';
    if (secondsToCrack < 3600) return `${Math.ceil(secondsToCrack / 60)}分`;
    if (secondsToCrack < 86400) return `${Math.ceil(secondsToCrack / 3600)}時間`;
    if (secondsToCrack < 2592000) return `${Math.ceil(secondsToCrack / 86400)}日`;
    if (secondsToCrack < 31536000) return `${Math.ceil(secondsToCrack / 2592000)}ヶ月`;
    return `${Math.ceil(secondsToCrack / 31536000)}年以上`;
  }
  
  /**
   * セキュアソルト生成
   */
  private static generateSecureSalt(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, byte => byte.toString(36)).join('');
  }
  
  /**
   * ペッパー追加
   */
  private static async addPepper(password: string): Promise<string> {
    // クライアントサイドではペッパーを使用しない（サーバーサイドで処理）
    const pepper = 'client-side-pepper';
    return CryptoJS.SHA256(password + pepper).toString();
  }
  
  /**
   * パスワードデータ更新
   */
  private static updatePasswordData(userId: string, hash: string, salt: string): void {
    const now = Date.now();
    const userData = this.passwordData.get(userId) || {
      userId,
      hashedPassword: '',
      salt: '',
      passwordHistory: [],
      failedAttempts: 0,
      lastFailedAttempt: 0,
      lockedUntil: 0,
      lockoutCount: 0,
      lastPasswordChange: 0,
      passwordExpiry: 0,
      requiresPasswordChange: false
    };
    
    // 古いパスワードを履歴に追加
    if (userData.hashedPassword) {
      userData.passwordHistory.unshift(userData.hashedPassword);
      userData.passwordHistory = userData.passwordHistory.slice(0, this.DEFAULT_PASSWORD_POLICY.passwordHistoryCount);
    }
    
    userData.hashedPassword = hash;
    userData.salt = salt;
    userData.lastPasswordChange = now;
    userData.passwordExpiry = now + this.MAX_PASSWORD_AGE;
    userData.requiresPasswordChange = false;
    
    this.passwordData.set(userId, userData);
  }
  
  /**
   * パスワード期限チェック
   */
  private static checkPasswordExpiry(userData: UserPasswordData): void {
    if (Date.now() > userData.passwordExpiry) {
      userData.requiresPasswordChange = true;
      secureLog('パスワード期限切れ検出', { userId: userData.userId });
    }
  }
  
  /**
   * セキュアなパスワード生成
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + specialChars;
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    
    let password = '';
    
    // 各文字種を最低1文字含める
    password += lowercase[randomBytes[0] % lowercase.length];
    password += uppercase[randomBytes[1] % uppercase.length];
    password += numbers[randomBytes[2] % numbers.length];
    password += specialChars[randomBytes[3] % specialChars.length];
    
    // 残りの文字をランダムに生成
    for (let i = 4; i < length; i++) {
      password += allChars[randomBytes[i] % allChars.length];
    }
    
    // パスワードをシャッフル
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
  
  /**
   * 統計情報取得
   */
  static getSecurityStats(): {
    totalUsers: number;
    lockedAccounts: number;
    expiredPasswords: number;
    averagePasswordStrength: number;
  } {
    const now = Date.now();
    let lockedCount = 0;
    let expiredCount = 0;
    
    for (const userData of this.passwordData.values()) {
      if (userData.lockedUntil > now) lockedCount++;
      if (userData.passwordExpiry < now) expiredCount++;
    }
    
    return {
      totalUsers: this.passwordData.size,
      lockedAccounts: lockedCount,
      expiredPasswords: expiredCount,
      averagePasswordStrength: 0 // 実装では計算
    };
  }
}