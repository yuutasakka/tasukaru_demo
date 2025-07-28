import crypto from 'crypto';

// セキュアなセッション管理ユーティリティ
export class SecureSessionManager {
  private static readonly SESSION_KEY = 'secure_session';
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30分
  
  // セッショントークンの生成
  static generateSessionToken(): string {
    // ブラウザのCrypto APIを使用してセキュアなトークンを生成
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // セッションの作成
  static createSession(userId: string, role: string): string {
    const token = this.generateSessionToken();
    const session = {
      token,
      userId,
      role,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_TIMEOUT,
      fingerprint: this.generateFingerprint()
    };
    
    // セッションをセキュアに保存（実際の実装ではサーバーサイドに保存）
    const encryptedSession = this.encryptSession(session);
    sessionStorage.setItem(this.SESSION_KEY, encryptedSession);
    
    return token;
  }
  
  // セッションの検証
  static validateSession(token: string): boolean {
    const encryptedSession = sessionStorage.getItem(this.SESSION_KEY);
    if (!encryptedSession) return false;
    
    try {
      const session = this.decryptSession(encryptedSession);
      
      // トークンの一致を確認
      if (session.token !== token) return false;
      
      // 有効期限を確認
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return false;
      }
      
      // フィンガープリントを確認
      if (session.fingerprint !== this.generateFingerprint()) {
        this.clearSession();
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  // セッションのクリア
  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_session');
    sessionStorage.removeItem('force_admin_logged_in');
  }
  
  // ブラウザフィンガープリントの生成
  private static generateFingerprint(): string {
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      colorDepth: screen.colorDepth,
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    return btoa(JSON.stringify(fingerprint));
  }
  
  // セッションの暗号化（簡易版）
  private static encryptSession(session: any): string {
    // 実際の実装では、より強固な暗号化を使用
    return btoa(JSON.stringify(session));
  }
  
  // セッションの復号化（簡易版）
  private static decryptSession(encryptedSession: string): any {
    // 実際の実装では、より強固な復号化を使用
    return JSON.parse(atob(encryptedSession));
  }
  
  // セッションの更新
  static refreshSession(token: string): boolean {
    if (!this.validateSession(token)) return false;
    
    const encryptedSession = sessionStorage.getItem(this.SESSION_KEY);
    if (!encryptedSession) return false;
    
    try {
      const session = this.decryptSession(encryptedSession);
      session.expiresAt = Date.now() + this.SESSION_TIMEOUT;
      
      const newEncryptedSession = this.encryptSession(session);
      sessionStorage.setItem(this.SESSION_KEY, newEncryptedSession);
      
      return true;
    } catch {
      return false;
    }
  }
}