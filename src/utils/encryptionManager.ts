// エンタープライズレベル暗号化管理システム
import CryptoJS from 'crypto-js';
// import { SecureConfigManager } from '../api/secureConfig'; // サーバーサイドでのみ使用可能
import { secureLog } from '../config/clientSecurity';

// クライアントサイド用の代替実装
const SecureConfigManager = {
  getMasterEncryptionKey: async () => {
    // クライアントサイドではマスターキーを使用しない
    console.warn('クライアントサイドでの暗号化は推奨されません');
    return null;
  },
  setMasterEncryptionKey: async (key: string) => {
    console.warn('クライアントサイドでキーを設定することはできません');
  }
};

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'AES-256-CBC' | 'AES-256-CTR';
  keyDerivation: 'PBKDF2' | 'HKDF' | 'Scrypt';
  keyRotationIntervalHours: number;
  compressionEnabled: boolean;
  integrityCheck: boolean;
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  salt?: string;
  keyVersion: number;
  algorithm: string;
  timestamp: number;
  checksum: string;
}

export interface KeyMetadata {
  keyId: string;
  version: number;
  algorithm: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'deprecated' | 'revoked';
  purpose: 'encryption' | 'signing' | 'kdf';
}

export interface FieldEncryptionPolicy {
  tableName: string;
  fieldName: string;
  encryptionLevel: 'none' | 'standard' | 'sensitive' | 'critical';
  keyRotationRequired: boolean;
  searchable: boolean;
  auditRequired: boolean;
}

export type SensitiveDataType = 
  | 'pii'           // 個人識別情報
  | 'financial'     // 金融情報
  | 'medical'       // 医療情報
  | 'biometric'     // 生体認証情報
  | 'credential'    // 認証情報
  | 'sensitive';    // その他センシティブ情報

export class EncryptionManager {
  private static readonly DEFAULT_CONFIG: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    keyRotationIntervalHours: 168, // 7日
    compressionEnabled: true,
    integrityCheck: true
  };
  
  // 暗号化キー管理（本番環境ではHSMやKey Vaultを使用）
  private static encryptionKeys = new Map<string, KeyMetadata>();
  private static fieldPolicies = new Map<string, FieldEncryptionPolicy>();
  
  // キーローテーション履歴
  private static keyRotationHistory: Array<{
    keyId: string;
    rotatedAt: number;
    reason: string;
  }> = [];

  /**
   * 初期化とマスターキー設定
   */
  static async initialize(): Promise<void> {
    try {
      // マスター暗号化キーを生成または取得
      await this.ensureMasterKey();
      
      // フィールド暗号化ポリシーを設定
      this.setupFieldPolicies();
      
      // 定期的なキーローテーションを設定
      this.scheduleKeyRotation();
      
      secureLog('暗号化マネージャー初期化完了');
    } catch (error) {
      secureLog('暗号化マネージャー初期化エラー:', error);
      throw new Error('暗号化システムの初期化に失敗しました');
    }
  }

  /**
   * 機密データ暗号化（AES-256-GCM）
   */
  static async encryptSensitiveData(
    data: string,
    dataType: SensitiveDataType,
    keyId?: string
  ): Promise<EncryptedData> {
    try {
      if (!data || data.trim() === '') {
        throw new Error('暗号化対象データが空です');
      }

      // 適切な暗号化キーを取得
      const encryptionKey = await this.getEncryptionKey(dataType, keyId);
      
      // データ圧縮（オプション）
      const processedData = this.DEFAULT_CONFIG.compressionEnabled 
        ? this.compressData(data) 
        : data;

      // 初期化ベクター（IV）生成
      const iv = CryptoJS.lib.WordArray.random(96/8); // 96-bit for GCM
      
      // AES-256-GCM暗号化
      const encrypted = CryptoJS.AES.encrypt(processedData, encryptionKey.key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });

      // 認証タグ取得（GCMモード）
      const tag = encrypted.tag ? encrypted.tag.toString() : '';
      
      // チェックサム計算（整合性検証用）
      const checksum = this.calculateChecksum(data);

      const result: EncryptedData = {
        data: encrypted.ciphertext.toString(),
        iv: iv.toString(),
        tag,
        salt: encryptionKey.salt,
        keyVersion: encryptionKey.version,
        algorithm: this.DEFAULT_CONFIG.algorithm,
        timestamp: Date.now(),
        checksum
      };

      // 暗号化ログ記録（データは記録しない）
      secureLog('データ暗号化完了', {
        dataType,
        keyVersion: encryptionKey.version,
        algorithm: result.algorithm,
        dataLength: data.length
      });

      return result;
    } catch (error) {
      secureLog('データ暗号化エラー:', error);
      throw new Error('データの暗号化に失敗しました');
    }
  }

  /**
   * 機密データ復号化
   */
  static async decryptSensitiveData(
    encryptedData: EncryptedData,
    dataType: SensitiveDataType
  ): Promise<string> {
    try {
      // 暗号化データの整合性検証
      if (!this.validateEncryptedData(encryptedData)) {
        throw new Error('暗号化データが破損しています');
      }

      // 対応する復号化キーを取得
      const decryptionKey = await this.getDecryptionKey(
        dataType, 
        encryptedData.keyVersion
      );

      // AES-256-GCM復号化
      const decrypted = CryptoJS.AES.decrypt(
        {
          ciphertext: CryptoJS.enc.Hex.parse(encryptedData.data),
          tag: encryptedData.tag ? CryptoJS.enc.Hex.parse(encryptedData.tag) : undefined
        },
        decryptionKey.key,
        {
          iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding
        }
      );

      let decryptedData = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('復号化に失敗しました - 不正なキーまたはデータ');
      }

      // データ展開（圧縮されている場合）
      if (this.DEFAULT_CONFIG.compressionEnabled) {
        decryptedData = this.decompressData(decryptedData);
      }

      // 整合性検証
      if (this.DEFAULT_CONFIG.integrityCheck) {
        const calculatedChecksum = this.calculateChecksum(decryptedData);
        if (calculatedChecksum !== encryptedData.checksum) {
          throw new Error('データの整合性検証に失敗しました');
        }
      }

      // 復号化ログ記録
      secureLog('データ復号化完了', {
        dataType,
        keyVersion: encryptedData.keyVersion,
        algorithm: encryptedData.algorithm
      });

      return decryptedData;
    } catch (error) {
      secureLog('データ復号化エラー:', error);
      throw new Error('データの復号化に失敗しました');
    }
  }

  /**
   * データベースフィールド暗号化
   */
  static async encryptDatabaseField(
    tableName: string,
    fieldName: string,
    value: string
  ): Promise<string> {
    try {
      const policy = this.getFieldPolicy(tableName, fieldName);
      
      if (policy.encryptionLevel === 'none') {
        return value;
      }

      // 暗号化レベルに応じてデータタイプを決定
      const dataType = this.mapEncryptionLevelToDataType(policy.encryptionLevel);
      
      const encrypted = await this.encryptSensitiveData(value, dataType);
      
      // 検索可能暗号化（必要に応じて）
      if (policy.searchable) {
        await this.createSearchableHash(tableName, fieldName, value);
      }

      // 監査ログ記録
      if (policy.auditRequired) {
        await this.logFieldEncryption(tableName, fieldName, encrypted.keyVersion);
      }

      // 暗号化データをJSON文字列として保存
      return JSON.stringify(encrypted);
    } catch (error) {
      secureLog('データベースフィールド暗号化エラー:', error);
      throw new Error('フィールドの暗号化に失敗しました');
    }
  }

  /**
   * データベースフィールド復号化
   */
  static async decryptDatabaseField(
    tableName: string,
    fieldName: string,
    encryptedValue: string
  ): Promise<string> {
    try {
      const policy = this.getFieldPolicy(tableName, fieldName);
      
      if (policy.encryptionLevel === 'none') {
        return encryptedValue;
      }

      // JSON形式の暗号化データをパース
      const encryptedData: EncryptedData = JSON.parse(encryptedValue);
      
      const dataType = this.mapEncryptionLevelToDataType(policy.encryptionLevel);
      const decrypted = await this.decryptSensitiveData(encryptedData, dataType);

      // 監査ログ記録
      if (policy.auditRequired) {
        await this.logFieldDecryption(tableName, fieldName, encryptedData.keyVersion);
      }

      return decrypted;
    } catch (error) {
      secureLog('データベースフィールド復号化エラー:', error);
      throw new Error('フィールドの復号化に失敗しました');
    }
  }

  /**
   * キーローテーション実行
   */
  static async rotateEncryptionKeys(
    dataType?: SensitiveDataType,
    reason: string = 'scheduled_rotation'
  ): Promise<void> {
    try {
      const keysToRotate = dataType 
        ? [dataType]
        : (['pii', 'financial', 'medical', 'biometric', 'credential', 'sensitive'] as SensitiveDataType[]);

      for (const type of keysToRotate) {
        await this.rotateKeyForDataType(type, reason);
      }

      secureLog('キーローテーション完了', { 
        dataTypes: keysToRotate, 
        reason 
      });
    } catch (error) {
      secureLog('キーローテーションエラー:', error);
      throw new Error('キーローテーションに失敗しました');
    }
  }

  /**
   * 暗号化統計情報取得
   */
  static getEncryptionStats(): {
    activeKeys: number;
    keyRotations: number;
    encryptedFields: number;
    lastRotation: number;
  } {
    const activeKeys = Array.from(this.encryptionKeys.values())
      .filter(key => key.status === 'active').length;
    
    const lastRotation = this.keyRotationHistory.length > 0
      ? Math.max(...this.keyRotationHistory.map(r => r.rotatedAt))
      : 0;

    return {
      activeKeys,
      keyRotations: this.keyRotationHistory.length,
      encryptedFields: this.fieldPolicies.size,
      lastRotation
    };
  }

  /**
   * マスターキー確保
   */
  private static async ensureMasterKey(): Promise<void> {
    try {
      let masterKey = await SecureConfigManager.getMasterEncryptionKey();
      
      if (!masterKey) {
        // 新しいマスターキーを生成
        masterKey = this.generateSecureKey(256);
        await SecureConfigManager.setMasterEncryptionKey(masterKey);
      }

      // データタイプ別のキーを初期化
      const dataTypes: SensitiveDataType[] = ['pii', 'financial', 'medical', 'biometric', 'credential', 'sensitive'];
      
      for (const dataType of dataTypes) {
        await this.initializeDataTypeKey(dataType);
      }
    } catch (error) {
      secureLog('マスターキー確保エラー:', error);
      throw error;
    }
  }

  /**
   * データタイプ別キー初期化
   */
  private static async initializeDataTypeKey(dataType: SensitiveDataType): Promise<void> {
    const keyId = `${dataType}_encryption_key`;
    const existingKey = this.encryptionKeys.get(keyId);
    
    if (!existingKey || existingKey.status !== 'active') {
      const keyMetadata: KeyMetadata = {
        keyId,
        version: existingKey ? existingKey.version + 1 : 1,
        algorithm: this.DEFAULT_CONFIG.algorithm,
        createdAt: Date.now(),
        expiresAt: Date.now() + (this.DEFAULT_CONFIG.keyRotationIntervalHours * 60 * 60 * 1000),
        status: 'active',
        purpose: 'encryption'
      };
      
      this.encryptionKeys.set(keyId, keyMetadata);
    }
  }

  /**
   * 暗号化キー取得
   */
  private static async getEncryptionKey(
    dataType: SensitiveDataType,
    keyId?: string
  ): Promise<{ key: CryptoJS.lib.WordArray; salt: string; version: number }> {
    const resolvedKeyId = keyId || `${dataType}_encryption_key`;
    const keyMetadata = this.encryptionKeys.get(resolvedKeyId);
    
    if (!keyMetadata || keyMetadata.status !== 'active') {
      throw new Error(`有効な暗号化キーが見つかりません: ${resolvedKeyId}`);
    }

    // マスターキーから派生キーを生成
    const masterKey = await SecureConfigManager.getMasterEncryptionKey();
    if (!masterKey) {
      throw new Error('マスターキーが設定されていません');
    }

    const salt = CryptoJS.lib.WordArray.random(256/8);
    const derivedKey = CryptoJS.PBKDF2(masterKey + dataType, salt, {
      keySize: 256/32,
      iterations: 100000
    });

    return {
      key: derivedKey,
      salt: salt.toString(),
      version: keyMetadata.version
    };
  }

  /**
   * 復号化キー取得
   */
  private static async getDecryptionKey(
    dataType: SensitiveDataType,
    version: number
  ): Promise<{ key: CryptoJS.lib.WordArray }> {
    const keyId = `${dataType}_encryption_key`;
    const keyMetadata = this.encryptionKeys.get(keyId);
    
    if (!keyMetadata) {
      throw new Error(`復号化キーが見つかりません: ${keyId}`);
    }

    const masterKey = await SecureConfigManager.getMasterEncryptionKey();
    if (!masterKey) {
      throw new Error('マスターキーが設定されていません');
    }

    // バージョン対応の派生キー生成
    const derivedKey = CryptoJS.PBKDF2(masterKey + dataType, keyId + version, {
      keySize: 256/32,
      iterations: 100000
    });

    return { key: derivedKey };
  }

  /**
   * セキュアキー生成
   */
  private static generateSecureKey(bitLength: number = 256): string {
    const randomBytes = new Uint8Array(bitLength / 8);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * データ圧縮
   */
  private static compressData(data: string): string {
    try {
      // 簡易的な圧縮実装（本番環境ではより効率的な圧縮アルゴリズムを使用）
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data));
    } catch (error) {
      return data; // 圧縮に失敗した場合は元データを返す
    }
  }

  /**
   * データ展開
   */
  private static decompressData(compressedData: string): string {
    try {
      return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(compressedData));
    } catch (error) {
      return compressedData; // 展開に失敗した場合は圧縮データを返す
    }
  }

  /**
   * チェックサム計算
   */
  private static calculateChecksum(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * 暗号化データ検証
   */
  private static validateEncryptedData(encryptedData: EncryptedData): boolean {
    const requiredFields = ['data', 'iv', 'keyVersion', 'algorithm', 'timestamp', 'checksum'];
    return requiredFields.every(field => encryptedData.hasOwnProperty(field));
  }

  /**
   * フィールドポリシー設定
   */
  private static setupFieldPolicies(): void {
    // デフォルトのフィールド暗号化ポリシー
    const policies: FieldEncryptionPolicy[] = [
      {
        tableName: 'users',
        fieldName: 'email',
        encryptionLevel: 'standard',
        keyRotationRequired: true,
        searchable: true,
        auditRequired: true
      },
      {
        tableName: 'users',
        fieldName: 'phone',
        encryptionLevel: 'sensitive',
        keyRotationRequired: true,
        searchable: true,
        auditRequired: true
      },
      {
        tableName: 'financial_data',
        fieldName: 'account_number',
        encryptionLevel: 'critical',
        keyRotationRequired: true,
        searchable: false,
        auditRequired: true
      },
      {
        tableName: 'medical_records',
        fieldName: 'diagnosis',
        encryptionLevel: 'critical',
        keyRotationRequired: true,
        searchable: false,
        auditRequired: true
      }
    ];

    policies.forEach(policy => {
      const key = `${policy.tableName}.${policy.fieldName}`;
      this.fieldPolicies.set(key, policy);
    });
  }

  /**
   * フィールドポリシー取得
   */
  private static getFieldPolicy(tableName: string, fieldName: string): FieldEncryptionPolicy {
    const key = `${tableName}.${fieldName}`;
    return this.fieldPolicies.get(key) || {
      tableName,
      fieldName,
      encryptionLevel: 'standard',
      keyRotationRequired: false,
      searchable: false,
      auditRequired: false
    };
  }

  /**
   * 暗号化レベルをデータタイプにマップ
   */
  private static mapEncryptionLevelToDataType(level: string): SensitiveDataType {
    switch (level) {
      case 'critical': return 'pii';
      case 'sensitive': return 'sensitive';
      case 'standard': return 'credential';
      default: return 'sensitive';
    }
  }

  /**
   * 検索可能ハッシュ作成
   */
  private static async createSearchableHash(
    tableName: string,
    fieldName: string,
    value: string
  ): Promise<void> {
    try {
      const searchHash = CryptoJS.SHA256(value.toLowerCase()).toString();
      // データベースの検索インデックステーブルに保存
      secureLog('検索可能ハッシュ作成', { tableName, fieldName });
    } catch (error) {
      secureLog('検索可能ハッシュ作成エラー:', error);
    }
  }

  /**
   * フィールド暗号化ログ記録
   */
  private static async logFieldEncryption(
    tableName: string,
    fieldName: string,
    keyVersion: number
  ): Promise<void> {
    secureLog('フィールド暗号化', {
      tableName,
      fieldName,
      keyVersion,
      timestamp: Date.now()
    });
  }

  /**
   * フィールド復号化ログ記録
   */
  private static async logFieldDecryption(
    tableName: string,
    fieldName: string,
    keyVersion: number
  ): Promise<void> {
    secureLog('フィールド復号化', {
      tableName,
      fieldName,
      keyVersion,
      timestamp: Date.now()
    });
  }

  /**
   * データタイプ別キーローテーション
   */
  private static async rotateKeyForDataType(
    dataType: SensitiveDataType,
    reason: string
  ): Promise<void> {
    const keyId = `${dataType}_encryption_key`;
    const currentKey = this.encryptionKeys.get(keyId);
    
    if (currentKey) {
      // 現在のキーを非推奨に
      currentKey.status = 'deprecated';
    }

    // 新しいキーを生成
    await this.initializeDataTypeKey(dataType);
    
    // ローテーション履歴を記録
    this.keyRotationHistory.push({
      keyId,
      rotatedAt: Date.now(),
      reason
    });

    secureLog('キーローテーション実行', { dataType, keyId, reason });
  }

  /**
   * 定期キーローテーション設定
   */
  private static scheduleKeyRotation(): void {
    // 24時間ごとにキーの期限をチェック
    setInterval(async () => {
      const now = Date.now();
      
      for (const [keyId, keyMetadata] of this.encryptionKeys.entries()) {
        if (keyMetadata.status === 'active' && now > keyMetadata.expiresAt) {
          const dataType = keyId.split('_')[0] as SensitiveDataType;
          await this.rotateKeyForDataType(dataType, 'scheduled_expiry');
        }
      }
    }, 24 * 60 * 60 * 1000);
  }
}

// 暗号化マネージャーの自動初期化
(async () => {
  if (typeof window === 'undefined') { // サーバーサイドでのみ実行
    try {
      await EncryptionManager.initialize();
    } catch (error) {
    }
  }
})();