/**
 * データ暗号化ユーティリティ - 休止状態と伝送中の暗号化
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import { Transform } from 'stream';

/**
 * 暗号化設定
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
  iterations: number;
}

/**
 * デフォルトの暗号化設定（AES-256-GCM）
 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  saltLength: 64, // 512 bits
  tagLength: 16,  // 128 bits
  iterations: 100000 // PBKDF2 iterations
};

/**
 * 暗号化されたデータの構造
 */
export interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  authTag: string;
  algorithm: string;
  iterations: number;
}

/**
 * データ暗号化クラス
 */
export class DataEncryption {
  private config: EncryptionConfig;
  private masterKey?: Buffer;

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
  }

  /**
   * マスターキーの設定
   */
  setMasterKey(key: string | Buffer): void {
    if (typeof key === 'string') {
      // 文字列の場合はハッシュ化してキーを生成
      this.masterKey = crypto.createHash('sha256').update(key).digest();
    } else {
      this.masterKey = key;
    }
  }

  /**
   * パスワードベースのキー導出
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.config.iterations,
      this.config.keyLength,
      'sha256'
    );
  }

  /**
   * データの暗号化（休止状態）
   */
  async encryptData(data: string | Buffer, password?: string): Promise<EncryptedData> {
    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(this.config.ivLength);
    
    // キーの導出
    const key = password 
      ? this.deriveKey(password, salt)
      : this.masterKey || this.deriveKey(process.env.ENCRYPTION_KEY || 'default-key', salt);

    // 暗号化
    const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.config.algorithm,
      iterations: this.config.iterations
    };
  }

  /**
   * データの復号化
   */
  async decryptData(encryptedData: EncryptedData, password?: string): Promise<Buffer> {
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

    // キーの導出
    const key = password
      ? this.deriveKey(password, salt)
      : this.masterKey || this.deriveKey(process.env.ENCRYPTION_KEY || 'default-key', salt);

    // 復号化
    const decipher = crypto.createDecipheriv(encryptedData.algorithm || this.config.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted;
  }

  /**
   * ファイルの暗号化
   */
  async encryptFile(inputPath: string, outputPath: string, password?: string): Promise<void> {
    const fileData = await fs.readFile(inputPath);
    const encryptedData = await this.encryptData(fileData, password);
    
    // 暗号化されたデータをJSONとして保存
    await fs.writeFile(outputPath, JSON.stringify(encryptedData, null, 2));
  }

  /**
   * ファイルの復号化
   */
  async decryptFile(inputPath: string, outputPath: string, password?: string): Promise<void> {
    const encryptedJson = await fs.readFile(inputPath, 'utf8');
    const encryptedData: EncryptedData = JSON.parse(encryptedJson);
    
    const decryptedData = await this.decryptData(encryptedData, password);
    await fs.writeFile(outputPath, decryptedData);
  }

  /**
   * ストリーム暗号化（大きなファイル用）
   */
  createEncryptionStream(password?: string): { stream: Transform; metadata: any } {
    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(this.config.ivLength);
    
    const key = password
      ? this.deriveKey(password, salt)
      : this.masterKey || this.deriveKey(process.env.ENCRYPTION_KEY || 'default-key', salt);

    const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);

    const metadata = {
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      algorithm: this.config.algorithm,
      iterations: this.config.iterations
    };

    return { stream: cipher, metadata };
  }

  /**
   * ストリーム復号化
   */
  createDecryptionStream(metadata: any, password?: string): Transform {
    const salt = Buffer.from(metadata.salt, 'base64');
    const iv = Buffer.from(metadata.iv, 'base64');
    
    const key = password
      ? this.deriveKey(password, salt)
      : this.masterKey || this.deriveKey(process.env.ENCRYPTION_KEY || 'default-key', salt);

    return crypto.createDecipheriv(metadata.algorithm || this.config.algorithm, key, iv);
  }
}

/**
 * フィールドレベル暗号化
 */
export class FieldLevelEncryption {
  private encryption: DataEncryption;
  private fieldKeys: Map<string, string> = new Map();

  constructor() {
    this.encryption = new DataEncryption();
  }

  /**
   * フィールド専用キーの設定
   */
  setFieldKey(fieldName: string, key: string): void {
    this.fieldKeys.set(fieldName, key);
  }

  /**
   * オブジェクトの特定フィールドを暗号化
   */
  async encryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: string[]
  ): Promise<T> {
    const result = { ...obj };

    for (const field of fieldsToEncrypt) {
      if (result[field] !== undefined && result[field] !== null) {
        const fieldKey = this.fieldKeys.get(field);
        const encrypted = await this.encryption.encryptData(
          JSON.stringify(result[field]),
          fieldKey
        );
        
        result[field] = encrypted;
        result[`${field}_encrypted`] = true;
      }
    }

    return result;
  }

  /**
   * オブジェクトの暗号化されたフィールドを復号化
   */
  async decryptFields<T extends Record<string, any>>(obj: T): Promise<T> {
    const result = { ...obj };

    for (const field of Object.keys(result)) {
      if (result[`${field}_encrypted`] && result[field]) {
        const fieldKey = this.fieldKeys.get(field);
        try {
          const decrypted = await this.encryption.decryptData(
            result[field] as EncryptedData,
            fieldKey
          );
          
          result[field] = JSON.parse(decrypted.toString('utf8'));
          delete result[`${field}_encrypted`];
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    }

    return result;
  }
}

/**
 * 伝送中の暗号化（TLS/SSL補完）
 */
export class TransitEncryption {
  private encryption: DataEncryption;

  constructor() {
    this.encryption = new DataEncryption();
  }

  /**
   * リクエストペイロードの暗号化
   */
  async encryptPayload(payload: any, sessionKey?: string): Promise<{
    encryptedPayload: EncryptedData;
    timestamp: number;
    nonce: string;
  }> {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // タイムスタンプとnonceを含めてペイロードを暗号化
    const dataToEncrypt = JSON.stringify({
      payload,
      timestamp,
      nonce
    });

    const encryptedPayload = await this.encryption.encryptData(dataToEncrypt, sessionKey);

    return {
      encryptedPayload,
      timestamp,
      nonce
    };
  }

  /**
   * レスポンスペイロードの復号化と検証
   */
  async decryptPayload(
    encryptedData: EncryptedData,
    expectedNonce: string,
    maxAge: number = 300000, // 5分
    sessionKey?: string
  ): Promise<any> {
    const decrypted = await this.encryption.decryptData(encryptedData, sessionKey);
    const data = JSON.parse(decrypted.toString('utf8'));

    // タイムスタンプの検証
    const age = Date.now() - data.timestamp;
    if (age > maxAge) {
      throw new Error('Payload expired');
    }

    // Nonceの検証
    if (data.nonce !== expectedNonce) {
      throw new Error('Invalid nonce');
    }

    return data.payload;
  }
}

/**
 * 暗号化ミドルウェア
 */
export function encryptionMiddleware(options: {
  encryptResponse?: boolean;
  decryptRequest?: boolean;
  sessionKeyHeader?: string;
} = {}) {
  const transitEncryption = new TransitEncryption();
  const {
    encryptResponse = true,
    decryptRequest = true,
    sessionKeyHeader = 'X-Session-Key'
  } = options;

  return async (req: any, res: any, next: any) => {
    // リクエストの復号化
    if (decryptRequest && req.body?.encryptedPayload) {
      try {
        const sessionKey = req.headers[sessionKeyHeader.toLowerCase()];
        const payload = await transitEncryption.decryptPayload(
          req.body.encryptedPayload,
          req.body.nonce,
          300000,
          sessionKey
        );
        
        req.body = payload;
        req.decrypted = true;
      } catch (error) {
        return res.status(400).json({
          error: 'Failed to decrypt request payload'
        });
      }
    }

    // レスポンスの暗号化
    if (encryptResponse) {
      const originalJson = res.json;
      res.json = async function(data: any) {
        try {
          const sessionKey = req.headers[sessionKeyHeader.toLowerCase()];
          const encrypted = await transitEncryption.encryptPayload(data, sessionKey);
          
          return originalJson.call(this, encrypted);
        } catch (error) {
          console.error('Failed to encrypt response:', error);
          return originalJson.call(this, data);
        }
      };
    }

    next();
  };
}

/**
 * データベース暗号化ヘルパー
 */
export class DatabaseEncryption {
  private fieldEncryption: FieldLevelEncryption;

  constructor() {
    this.fieldEncryption = new FieldLevelEncryption();
    
    // 機密フィールド用のキーを設定
    this.fieldEncryption.setFieldKey('phoneNumber', process.env.PHONE_ENCRYPTION_KEY || 'phone-key');
    this.fieldEncryption.setFieldKey('email', process.env.EMAIL_ENCRYPTION_KEY || 'email-key');
    this.fieldEncryption.setFieldKey('personalInfo', process.env.PII_ENCRYPTION_KEY || 'pii-key');
  }

  /**
   * データベース保存前の暗号化
   */
  async encryptForStorage(data: any, sensitiveFields: string[]): Promise<any> {
    return this.fieldEncryption.encryptFields(data, sensitiveFields);
  }

  /**
   * データベース取得後の復号化
   */
  async decryptFromStorage(data: any): Promise<any> {
    return this.fieldEncryption.decryptFields(data);
  }
}

/**
 * 暗号化監査ログ
 */
export class EncryptionAuditLogger {
  static log(operation: string, details: any): void {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      algorithm: details.algorithm || 'aes-256-gcm',
      keyId: details.keyId,
      fieldName: details.fieldName,
      success: details.success,
      error: details.error
    };

    // 本番環境では専用の監査ログシステムに送信
    if (process.env.NODE_ENV === 'production') {
      // 監査ログAPIに送信
      console.log('ENCRYPTION_AUDIT:', JSON.stringify(auditEntry));
    } else {
      console.log('Encryption audit:', auditEntry);
    }
  }
}