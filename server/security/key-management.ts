/**
 * キー管理とHSM/KMS統合
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * キー管理インターフェース
 */
export interface IKeyManager {
  generateKey(keyId: string, algorithm: string, keySize: number): Promise<void>;
  getKey(keyId: string): Promise<Buffer>;
  rotateKey(keyId: string): Promise<void>;
  deleteKey(keyId: string): Promise<void>;
  encryptData(keyId: string, data: Buffer): Promise<Buffer>;
  decryptData(keyId: string, encryptedData: Buffer): Promise<Buffer>;
}

/**
 * キーメタデータ
 */
interface KeyMetadata {
  keyId: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  rotatedAt?: Date;
  version: number;
  status: 'active' | 'rotating' | 'deprecated' | 'destroyed';
  usage: string[];
  expiresAt?: Date;
}

/**
 * ローカルキー管理実装（開発環境用）
 */
export class LocalKeyManager implements IKeyManager {
  private keyStorePath: string;
  private metadataPath: string;
  private masterKey: Buffer;

  constructor(keyStorePath: string = './keys') {
    this.keyStorePath = keyStorePath;
    this.metadataPath = path.join(keyStorePath, 'metadata.json');
    this.masterKey = this.deriveMasterKey();
  }

  private deriveMasterKey(): Buffer {
    // 本番環境では環境変数やHSMから取得
    const masterSecret = process.env.MASTER_KEY_SECRET || 'development-master-key';
    return crypto.scryptSync(masterSecret, 'moneyticket-salt', 32);
  }

  async generateKey(keyId: string, algorithm: string = 'aes-256-gcm', keySize: number = 32): Promise<void> {
    const key = crypto.randomBytes(keySize);
    const encryptedKey = this.encryptKey(key);
    
    const metadata: KeyMetadata = {
      keyId,
      algorithm,
      keySize,
      createdAt: new Date(),
      version: 1,
      status: 'active',
      usage: []
    };

    await this.saveKey(keyId, encryptedKey, metadata);
  }

  async getKey(keyId: string): Promise<Buffer> {
    const { encryptedKey } = await this.loadKey(keyId);
    return this.decryptKey(encryptedKey);
  }

  async rotateKey(keyId: string): Promise<void> {
    const { metadata } = await this.loadKey(keyId);
    
    // 新しいキーを生成
    const newKey = crypto.randomBytes(metadata.keySize);
    const encryptedKey = this.encryptKey(newKey);
    
    // メタデータを更新
    metadata.rotatedAt = new Date();
    metadata.version += 1;
    metadata.status = 'active';
    
    // 古いキーをバックアップ（暗号化されたまま保存）
    const backupPath = path.join(this.keyStorePath, `${keyId}.v${metadata.version - 1}.backup`);
    const currentPath = path.join(this.keyStorePath, `${keyId}.key`);
    await fs.rename(currentPath, backupPath);
    
    // 新しいキーを保存
    await this.saveKey(keyId, encryptedKey, metadata);
  }

  async deleteKey(keyId: string): Promise<void> {
    const { metadata } = await this.loadKey(keyId);
    
    // セキュアな削除（上書き）
    const keyPath = path.join(this.keyStorePath, `${keyId}.key`);
    const randomData = crypto.randomBytes(1024);
    
    // 3回上書き
    for (let i = 0; i < 3; i++) {
      await fs.writeFile(keyPath, randomData);
    }
    
    await fs.unlink(keyPath);
    
    // メタデータを更新
    metadata.status = 'destroyed';
    await this.updateMetadata(keyId, metadata);
  }

  async encryptData(keyId: string, data: Buffer): Promise<Buffer> {
    const key = await this.getKey(keyId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // IV + AuthTag + 暗号化データ
    return Buffer.concat([iv, authTag, encrypted]);
  }

  async decryptData(keyId: string, encryptedData: Buffer): Promise<Buffer> {
    const key = await this.getKey(keyId);
    
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  private encryptKey(key: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(key),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decryptKey(encryptedKey: Buffer): Buffer {
    const iv = encryptedKey.slice(0, 16);
    const authTag = encryptedKey.slice(16, 32);
    const encrypted = encryptedKey.slice(32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  private async saveKey(keyId: string, encryptedKey: Buffer, metadata: KeyMetadata): Promise<void> {
    await fs.mkdir(this.keyStorePath, { recursive: true });
    
    const keyPath = path.join(this.keyStorePath, `${keyId}.key`);
    await fs.writeFile(keyPath, encryptedKey);
    
    await this.updateMetadata(keyId, metadata);
  }

  private async loadKey(keyId: string): Promise<{ encryptedKey: Buffer; metadata: KeyMetadata }> {
    const keyPath = path.join(this.keyStorePath, `${keyId}.key`);
    const encryptedKey = await fs.readFile(keyPath);
    
    const metadata = await this.getMetadata(keyId);
    
    return { encryptedKey, metadata };
  }

  private async updateMetadata(keyId: string, metadata: KeyMetadata): Promise<void> {
    let allMetadata: Record<string, KeyMetadata> = {};
    
    try {
      const data = await fs.readFile(this.metadataPath, 'utf-8');
      allMetadata = JSON.parse(data);
    } catch (error) {
      // ファイルが存在しない場合は新規作成
    }
    
    allMetadata[keyId] = metadata;
    await fs.writeFile(this.metadataPath, JSON.stringify(allMetadata, null, 2));
  }

  private async getMetadata(keyId: string): Promise<KeyMetadata> {
    const data = await fs.readFile(this.metadataPath, 'utf-8');
    const allMetadata = JSON.parse(data);
    
    if (!allMetadata[keyId]) {
      throw new Error(`Key metadata not found: ${keyId}`);
    }
    
    return allMetadata[keyId];
  }
}

/**
 * AWS KMS統合（本番環境用）
 */
export class AWSKMSKeyManager implements IKeyManager {
  // AWS KMS実装の例
  async generateKey(keyId: string, algorithm: string, keySize: number): Promise<void> {
    // AWS KMS APIを使用してキーを生成
    throw new Error('AWS KMS integration not implemented');
  }

  async getKey(keyId: string): Promise<Buffer> {
    // AWS KMS APIを使用してキーを取得
    throw new Error('AWS KMS integration not implemented');
  }

  async rotateKey(keyId: string): Promise<void> {
    // AWS KMS APIを使用してキーをローテーション
    throw new Error('AWS KMS integration not implemented');
  }

  async deleteKey(keyId: string): Promise<void> {
    // AWS KMS APIを使用してキーを削除
    throw new Error('AWS KMS integration not implemented');
  }

  async encryptData(keyId: string, data: Buffer): Promise<Buffer> {
    // AWS KMS APIを使用してデータを暗号化
    throw new Error('AWS KMS integration not implemented');
  }

  async decryptData(keyId: string, encryptedData: Buffer): Promise<Buffer> {
    // AWS KMS APIを使用してデータを復号化
    throw new Error('AWS KMS integration not implemented');
  }
}

/**
 * キー管理ファクトリー
 */
export class KeyManagerFactory {
  static create(type: 'local' | 'aws-kms' | 'azure-keyvault' | 'hsm'): IKeyManager {
    switch (type) {
      case 'local':
        return new LocalKeyManager();
      case 'aws-kms':
        return new AWSKMSKeyManager();
      // 他のプロバイダーも同様に実装
      default:
        throw new Error(`Unsupported key manager type: ${type}`);
    }
  }
}

/**
 * キーローテーションスケジューラー
 */
export class KeyRotationScheduler {
  private keyManager: IKeyManager;
  private rotationInterval: number;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(keyManager: IKeyManager, rotationIntervalDays: number = 90) {
    this.keyManager = keyManager;
    this.rotationInterval = rotationIntervalDays * 24 * 60 * 60 * 1000;
  }

  scheduleRotation(keyId: string, metadata: KeyMetadata): void {
    const nextRotation = metadata.rotatedAt || metadata.createdAt;
    const rotationTime = new Date(nextRotation.getTime() + this.rotationInterval);
    const timeUntilRotation = rotationTime.getTime() - Date.now();

    if (timeUntilRotation > 0) {
      const timer = setTimeout(async () => {
        try {
          await this.keyManager.rotateKey(keyId);
          console.log(`Key rotated successfully: ${keyId}`);
          
          // 次のローテーションをスケジュール
          this.scheduleRotation(keyId, {
            ...metadata,
            rotatedAt: new Date()
          });
        } catch (error) {
          console.error(`Key rotation failed for ${keyId}:`, error);
        }
      }, timeUntilRotation);

      this.timers.set(keyId, timer);
    }
  }

  cancelRotation(keyId: string): void {
    const timer = this.timers.get(keyId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(keyId);
    }
  }
}

/**
 * データ暗号化ヘルパー
 */
export class SecureDataEncryption {
  private keyManager: IKeyManager;

  constructor(keyManager: IKeyManager) {
    this.keyManager = keyManager;
  }

  /**
   * 機密データの暗号化
   */
  async encryptSensitiveData(data: any, keyId: string): Promise<string> {
    const jsonData = JSON.stringify(data);
    const buffer = Buffer.from(jsonData, 'utf-8');
    
    const encrypted = await this.keyManager.encryptData(keyId, buffer);
    
    // Base64エンコードして返す
    return encrypted.toString('base64');
  }

  /**
   * 機密データの復号化
   */
  async decryptSensitiveData(encryptedData: string, keyId: string): Promise<any> {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const decrypted = await this.keyManager.decryptData(keyId, buffer);
    const jsonData = decrypted.toString('utf-8');
    
    return JSON.parse(jsonData);
  }

  /**
   * フィールドレベル暗号化
   */
  async encryptFields(obj: any, fieldsToEncrypt: string[], keyId: string): Promise<any> {
    const result = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (result[field] !== undefined) {
        result[field] = await this.encryptSensitiveData(result[field], keyId);
        result[`${field}_encrypted`] = true;
      }
    }
    
    return result;
  }

  /**
   * フィールドレベル復号化
   */
  async decryptFields(obj: any, keyId: string): Promise<any> {
    const result = { ...obj };
    
    for (const field of Object.keys(result)) {
      if (result[`${field}_encrypted`]) {
        result[field] = await this.decryptSensitiveData(result[field], keyId);
        delete result[`${field}_encrypted`];
      }
    }
    
    return result;
  }
}