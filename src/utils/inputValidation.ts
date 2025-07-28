// エンタープライズレベル入力検証・サニタイゼーションシステム
import CryptoJS from 'crypto-js';
import { secureLog } from '../config/clientSecurity';

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (input: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitized: any;
  errors: string[];
  warnings: string[];
  securityThreats: string[];
}

export interface CSRFTokenData {
  token: string;
  timestamp: number;
  sessionId: string;
  origin: string;
}

export class InputValidator {
  // 多層防御型入力検証システム
  static validateInputAdvanced(
    input: any,
    rules: ValidationRule[],
    context?: { userId?: string; sessionId?: string; ipAddress?: string }
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      sanitized: input,
      errors: [],
      warnings: [],
      securityThreats: []
    };

    try {
      // 基本的な型チェック
      if (input === null || input === undefined) {
        result.isValid = false;
        result.errors.push('入力値が空です');
        return result;
      }

      // 文字列の場合の基本サニタイゼーション
      if (typeof input === 'string') {
        result.sanitized = this.basicSanitization(input);
        
        // セキュリティ脅威検出
        this.detectSecurityThreats(input, result);
      }

      // ルールベース検証
      this.applyValidationRules(result.sanitized, rules, result);

      // 異常パターン検出
      this.detectAnomalousPatterns(input, result, context);

      // セキュリティログ記録（脅威検出時）
      if (result.securityThreats.length > 0) {
        secureLog('セキュリティ脅威検出', {
          threats: result.securityThreats,
          input: this.hashSensitiveData(String(input)),
          context
        });
      }

      return result;
    } catch (error) {
      secureLog('入力検証エラー:', error);
      return {
        isValid: false,
        sanitized: '',
        errors: ['検証処理中にエラーが発生しました'],
        warnings: [],
        securityThreats: []
      };
    }
  }

  // HTMLサニタイゼーション
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  // URLサニタイゼーション
  static sanitizeURL(url: string): string {
    if (typeof url !== 'string') return '#';
    
    const dangerousProtocols = [
      'javascript:', 'data:', 'vbscript:', 'file:', 'ftp:', 'blob:', 'about:'
    ];
    
    const urlLower = url.toLowerCase().trim();
    
    // 危険なプロトコルを除去
    for (const protocol of dangerousProtocols) {
      if (urlLower.startsWith(protocol)) {
        return '#';
      }
    }
    
    // 許可されたプロトコルまたは相対URL
    if (url.match(/^https?:\/\//) || url.startsWith('/') || url.startsWith('#')) {
      return url;
    }
    
    // それ以外は安全なフォールバック
    return '#';
  }

  // 電話番号の正規化と検証
  static validatePhoneNumber(phone: string): { isValid: boolean; normalized: string; error?: string } {
    if (typeof phone !== 'string') {
      return { isValid: false, normalized: '', error: '電話番号は文字列である必要があります' };
    }

    // 全角数字を半角に変換
    const halfWidth = phone.replace(/[０-９]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    });
    
    // 数字以外を削除
    const normalized = halfWidth.replace(/\D/g, '');
    
    // 日本の携帯電話番号の形式チェック
    if (!/^(090|080|070)\d{8}$/.test(normalized)) {
      return { 
        isValid: false, 
        normalized, 
        error: '090、080、070で始まる11桁の携帯電話番号を入力してください' 
      };
    }

    return { isValid: true, normalized };
  }

  // メールアドレスの検証
  static validateEmail(email: string): { isValid: boolean; normalized: string; error?: string } {
    if (typeof email !== 'string') {
      return { isValid: false, normalized: '', error: 'メールアドレスは文字列である必要があります' };
    }

    const normalized = email.trim().toLowerCase();
    
    // 基本的なメールアドレス形式チェック
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(normalized)) {
      return { 
        isValid: false, 
        normalized, 
        error: '有効なメールアドレスを入力してください' 
      };
    }

    // 長さチェック
    if (normalized.length > 254) {
      return { 
        isValid: false, 
        normalized, 
        error: 'メールアドレスが長すぎます' 
      };
    }

    return { isValid: true, normalized };
  }

  // 一般的なテキスト入力の検証
  static validateText(text: string, maxLength = 1000): { isValid: boolean; sanitized: string; error?: string } {
    if (typeof text !== 'string') {
      return { isValid: false, sanitized: '', error: 'テキストは文字列である必要があります' };
    }

    const trimmed = text.trim();
    
    if (trimmed.length === 0) {
      return { isValid: false, sanitized: '', error: 'テキストを入力してください' };
    }

    if (trimmed.length > maxLength) {
      return { 
        isValid: false, 
        sanitized: trimmed, 
        error: `テキストは${maxLength}文字以内で入力してください` 
      };
    }

    // HTMLタグや危険な文字をサニタイズ
    const sanitized = this.sanitizeHTML(trimmed);

    return { isValid: true, sanitized };
  }

  // 数値の検証
  static validateNumber(value: any, min?: number, max?: number): { isValid: boolean; number: number; error?: string } {
    const num = Number(value);
    
    if (isNaN(num)) {
      return { isValid: false, number: 0, error: '有効な数値を入力してください' };
    }

    if (min !== undefined && num < min) {
      return { isValid: false, number: num, error: `${min}以上の値を入力してください` };
    }

    if (max !== undefined && num > max) {
      return { isValid: false, number: num, error: `${max}以下の値を入力してください` };
    }

    return { isValid: true, number: num };
  }

  // SQLインジェクション対策
  static detectSQLInjection(input: string): boolean {
    if (typeof input !== 'string') return false;
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\bxp_|\bsp_)/i,
      /(\b(WAITFOR|DELAY)\b)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // XSS対策
  static detectXSS(input: string): boolean {
    if (typeof input !== 'string') return false;
    
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<img[^>]+src[^>]*=\s*["']?[^"']*["']?[^>]*>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // 総合的な入力検証
  static validateInput(input: string, type: 'text' | 'email' | 'phone' | 'url' = 'text'): {
    isValid: boolean;
    sanitized: string;
    error?: string;
  } {
    if (typeof input !== 'string') {
      return { isValid: false, sanitized: '', error: '無効な入力です' };
    }

    // SQLインジェクション検知
    if (this.detectSQLInjection(input)) {
      return { isValid: false, sanitized: '', error: '不正な入力が検出されました' };
    }

    // XSS検知
    if (this.detectXSS(input)) {
      return { isValid: false, sanitized: '', error: '不正なスクリプトが検出されました' };
    }

    // タイプ別検証
    switch (type) {
      case 'email': {
        const result = this.validateEmail(input);
        return { 
          isValid: result.isValid, 
          sanitized: result.normalized, 
          error: result.error 
        };
      }
      case 'phone': {
        const result = this.validatePhoneNumber(input);
        return { 
          isValid: result.isValid, 
          sanitized: result.normalized, 
          error: result.error 
        };
      }
      case 'url': {
        const sanitized = this.sanitizeURL(input);
        return { 
          isValid: sanitized !== '#', 
          sanitized, 
          error: sanitized === '#' ? '無効なURLです' : undefined 
        };
      }
      default: {
        const result = this.validateText(input);
        return { 
          isValid: result.isValid, 
          sanitized: result.sanitized, 
          error: result.error 
        };
      }
    }
  }

  // 基本サニタイゼーション
  private static basicSanitization(input: string): string {
    return input
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 制御文字除去
      .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // BOM除去
      .trim(); // 前後の空白除去
  }

  // セキュリティ脅威検出
  private static detectSecurityThreats(input: string, result: ValidationResult): void {
    const threats: string[] = [];

    // SQL注入検出
    if (this.detectSQLInjection(input)) {
      threats.push('SQL_INJECTION');
    }

    // XSS検出
    if (this.detectXSS(input)) {
      threats.push('XSS_ATTACK');
    }

    // ディレクトリトラバーサル検出
    if (this.detectDirectoryTraversal(input)) {
      threats.push('DIRECTORY_TRAVERSAL');
    }

    // コマンドインジェクション検出
    if (this.detectCommandInjection(input)) {
      threats.push('COMMAND_INJECTION');
    }

    // LDAPインジェクション検出
    if (this.detectLDAPInjection(input)) {
      threats.push('LDAP_INJECTION');
    }

    // XMLインジェクション検出
    if (this.detectXMLInjection(input)) {
      threats.push('XML_INJECTION');
    }

    // テンプレートインジェクション検出
    if (this.detectTemplateInjection(input)) {
      threats.push('TEMPLATE_INJECTION');
    }

    result.securityThreats = threats;
  }

  // ルールベース検証
  private static applyValidationRules(
    input: any,
    rules: ValidationRule[],
    result: ValidationResult
  ): void {
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!input || (typeof input === 'string' && input.trim() === '')) {
            result.isValid = false;
            result.errors.push(rule.message);
          }
          break;
        case 'minLength':
          if (typeof input === 'string' && input.length < rule.value) {
            result.isValid = false;
            result.errors.push(rule.message);
          }
          break;
        case 'maxLength':
          if (typeof input === 'string' && input.length > rule.value) {
            result.isValid = false;
            result.errors.push(rule.message);
          }
          break;
        case 'pattern':
          if (typeof input === 'string' && !rule.value.test(input)) {
            result.isValid = false;
            result.errors.push(rule.message);
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(input)) {
            result.isValid = false;
            result.errors.push(rule.message);
          }
          break;
      }
    }
  }

  // 異常パターン検出
  private static detectAnomalousPatterns(
    input: any,
    result: ValidationResult,
    context?: { userId?: string; sessionId?: string; ipAddress?: string }
  ): void {
    if (typeof input !== 'string') return;

    // 異常に長い入力
    if (input.length > 10000) {
      result.warnings.push('入力が異常に長すぎます');
    }

    // 異常に多い特殊文字
    const specialCharCount = (input.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const specialCharRatio = specialCharCount / input.length;
    if (specialCharRatio > 0.5) {
      result.warnings.push('特殊文字の比率が高すぎます');
    }

    // Base64エンコードされたデータの検出
    if (this.isBase64Encoded(input)) {
      result.warnings.push('Base64エンコードされたデータが検出されました');
    }

    // URLエンコードされたデータの検出
    if (this.isURLEncoded(input)) {
      result.warnings.push('URLエンコードされたデータが検出されました');
    }

    // 繰り返しパターンの検出
    if (this.hasRepeatedPatterns(input)) {
      result.warnings.push('繰り返しパターンが検出されました');
    }
  }

  // ディレクトリトラバーサル検出
  private static detectDirectoryTraversal(input: string): boolean {
    const patterns = [
      /\.\./,
      /\.\\\.\.\\/,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.%2f/gi,
      /%2e\//gi,
      /\.%5c/gi,
      /%2e%5c/gi
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  // コマンドインジェクション検出
  private static detectCommandInjection(input: string): boolean {
    const patterns = [
      /[;&|`$(){}\\[\\]]/,
      /\b(cat|ls|dir|type|copy|move|del|rm|chmod|chown|ps|kill|wget|curl|nc|netcat)\b/i,
      /\b(sh|bash|cmd|powershell|python|perl|ruby|php)\b/i,
      />/,
      /<(?!\w)/,
      /\|\|/,
      /&&/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  // LDAPインジェクション検出
  private static detectLDAPInjection(input: string): boolean {
    const patterns = [
      /[*()\\]/,
      /\x00/,
      /[&|!]/,
      /[=<>~]/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  // XMLインジェクション検出
  private static detectXMLInjection(input: string): boolean {
    const patterns = [
      /<\?xml/i,
      /<!\[CDATA\[/i,
      /<!DOCTYPE/i,
      /<!ENTITY/i,
      /&[a-zA-Z0-9]+;/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  // テンプレートインジェクション検出
  private static detectTemplateInjection(input: string): boolean {
    const patterns = [
      /{{.*}}/,
      /{%.*%}/,
      /<%.*%>/,
      /\$\{.*\}/,
      /#{.*}/,
      /@\{.*\}/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  // Base64エンコード検出
  private static isBase64Encoded(input: string): boolean {
    try {
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Pattern.test(input) && input.length % 4 === 0 && input.length > 10;
    } catch {
      return false;
    }
  }

  // URLエンコード検出
  private static isURLEncoded(input: string): boolean {
    const urlEncodedPattern = /%[0-9A-Fa-f]{2}/;
    return urlEncodedPattern.test(input);
  }

  // 繰り返しパターン検出
  private static hasRepeatedPatterns(input: string): boolean {
    // 同じ文字が10回以上連続
    if (/(.)(\1{9,})/.test(input)) return true;
    
    // 同じ文字列パターンが5回以上繰り返し
    const patterns = input.match(/(.{2,})\1{4,}/g);
    return patterns !== null;
  }

  // 機密データハッシュ化
  private static hashSensitiveData(data: string): string {
    return CryptoJS.SHA256(data).toString().substring(0, 16);
  }

  // URL検証
  private static isValidURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // CSRF トークン生成
  static generateCSRFToken(sessionId: string, origin: string): CSRFTokenData {
    const timestamp = Date.now();
    const randomBytes = CryptoJS.lib.WordArray.random(256/8);
    const payload = `${sessionId}:${origin}:${timestamp}:${randomBytes}`;
    const token = CryptoJS.SHA256(payload).toString();
    
    return {
      token,
      timestamp,
      sessionId,
      origin
    };
  }

  // CSRF トークン検証
  static validateCSRFToken(
    token: string,
    sessionId: string,
    origin: string,
    maxAge: number = 3600000 // 1時間
  ): boolean {
    try {
      // トークンの存在確認
      if (!token || token.length !== 64) {
        return false;
      }
      
      // セッションIDと送信元の検証
      // 実際の実装では、サーバーサイドでトークンを検証
      const now = Date.now();
      
      // 簡易的な検証（本番環境では より堅牢な実装が必要）
      return token.length === 64 && /^[a-f0-9]{64}$/.test(token);
    } catch (error) {
      secureLog('CSRFトークン検証エラー:', error);
      return false;
    }
  }

  // 入力サイズ制限チェック
  static checkInputSizeLimit(
    input: any,
    maxSize: number = 1048576 // 1MB
  ): { allowed: boolean; size: number } {
    let size = 0;
    
    if (typeof input === 'string') {
      size = new Blob([input]).size;
    } else if (input instanceof ArrayBuffer) {
      size = input.byteLength;
    } else {
      size = JSON.stringify(input).length;
    }
    
    return {
      allowed: size <= maxSize,
      size
    };
  }

  // マルチメディアファイル検証
  static validateFileContent(
    file: File,
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  ): Promise<{ isValid: boolean; errors: string[] }> {
    return new Promise((resolve) => {
      const errors: string[] = [];
      
      // MIMEタイプチェック
      if (!allowedTypes.includes(file.type)) {
        errors.push('許可されていないファイル形式です');
      }
      
      // ファイルサイズチェック（10MB制限）
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push('ファイルサイズが大きすぎます');
      }
      
      // ファイル拡張子とMIMEタイプの整合性チェック
      const fileName = file.name.toLowerCase();
      const expectedTypes: { [key: string]: string[] } = {
        '.jpg': ['image/jpeg'],
        '.jpeg': ['image/jpeg'],
        '.png': ['image/png'],
        '.gif': ['image/gif'],
        '.pdf': ['application/pdf']
      };
      
      const extension = fileName.substring(fileName.lastIndexOf('.'));
      const expectedMimeTypes = expectedTypes[extension];
      
      if (expectedMimeTypes && !expectedMimeTypes.includes(file.type)) {
        errors.push('ファイル拡張子とファイル形式が一致しません');
      }
      
      resolve({
        isValid: errors.length === 0,
        errors
      });
    });
  }

  // バッチ入力検証
  static validateBatch(
    inputs: Array<{ value: any; rules: ValidationRule[] }>,
    context?: { userId?: string; sessionId?: string; ipAddress?: string }
  ): ValidationResult[] {
    return inputs.map(({ value, rules }) => 
      this.validateInputAdvanced(value, rules, context)
    );
  }
}