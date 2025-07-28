/**
 * IAMとサービスアカウント管理
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * 権限レベル定義
 */
export enum PermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  DELETE = 4,
  ADMIN = 8,
  OWNER = 16
}

/**
 * リソースタイプ
 */
export enum ResourceType {
  USER_DATA = 'user_data',
  TRANSACTION = 'transaction',
  AUDIT_LOG = 'audit_log',
  SYSTEM_CONFIG = 'system_config',
  SECURITY_SETTINGS = 'security_settings'
}

/**
 * IAMポリシー
 */
export interface IAMPolicy {
  version: string;
  statement: PolicyStatement[];
}

/**
 * ポリシーステートメント
 */
export interface PolicyStatement {
  effect: 'Allow' | 'Deny';
  principal: string | string[];
  action: string | string[];
  resource: string | string[];
  condition?: PolicyCondition;
}

/**
 * ポリシー条件
 */
export interface PolicyCondition {
  ipAddress?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  mfaRequired?: boolean;
  tags?: Record<string, string>;
}

/**
 * サービスアカウント
 */
export interface ServiceAccount {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  permissions: Permission[];
  apiKeys: APIKey[];
  policies: IAMPolicy[];
  metadata: Record<string, any>;
}

/**
 * 権限
 */
export interface Permission {
  resource: ResourceType;
  level: PermissionLevel;
  constraints?: Record<string, any>;
}

/**
 * APIキー
 */
export interface APIKey {
  id: string;
  key: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  isActive: boolean;
  scopes: string[];
}

/**
 * IAM管理クラス
 */
export class IAMManager {
  private serviceAccounts: Map<string, ServiceAccount> = new Map();
  private policies: Map<string, IAMPolicy> = new Map();
  private rotationSchedule: Map<string, NodeJS.Timeout> = new Map();

  /**
   * サービスアカウントの作成
   */
  async createServiceAccount(
    name: string,
    description: string,
    permissions: Permission[],
    expiresInDays?: number
  ): Promise<ServiceAccount> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const serviceAccount: ServiceAccount = {
      id,
      name,
      description,
      createdAt: now,
      expiresAt: expiresInDays ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
      permissions,
      apiKeys: [],
      policies: [],
      metadata: {}
    };

    this.serviceAccounts.set(id, serviceAccount);
    
    // 自動キーローテーションのスケジュール
    if (expiresInDays) {
      this.scheduleKeyRotation(id, expiresInDays * 0.8); // 80%の期間でローテーション
    }

    await this.auditLog('SERVICE_ACCOUNT_CREATED', { serviceAccountId: id, name });

    return serviceAccount;
  }

  /**
   * APIキーの生成
   */
  async generateAPIKey(
    serviceAccountId: string,
    scopes: string[],
    expiresInDays: number = 90
  ): Promise<APIKey> {
    const serviceAccount = this.serviceAccounts.get(serviceAccountId);
    if (!serviceAccount) {
      throw new Error('Service account not found');
    }

    const keyId = crypto.randomUUID();
    const keySecret = this.generateSecureKey();
    const now = new Date();

    const apiKey: APIKey = {
      id: keyId,
      key: `${serviceAccountId}.${keyId}.${keySecret}`,
      createdAt: now,
      expiresAt: new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000),
      isActive: true,
      scopes
    };

    serviceAccount.apiKeys.push(apiKey);
    
    await this.auditLog('API_KEY_GENERATED', { 
      serviceAccountId, 
      keyId, 
      scopes,
      expiresAt: apiKey.expiresAt 
    });

    return apiKey;
  }

  /**
   * 権限の検証
   */
  async checkPermission(
    apiKey: string,
    resource: ResourceType,
    requiredLevel: PermissionLevel,
    context?: Record<string, any>
  ): Promise<boolean> {
    const keyParts = apiKey.split('.');
    if (keyParts.length !== 3) {
      return false;
    }

    const [serviceAccountId, keyId] = keyParts;
    const serviceAccount = this.serviceAccounts.get(serviceAccountId);
    
    if (!serviceAccount) {
      return false;
    }

    // APIキーの検証
    const key = serviceAccount.apiKeys.find(k => k.id === keyId && k.key === apiKey);
    if (!key || !key.isActive) {
      return false;
    }

    // 有効期限チェック
    if (key.expiresAt && new Date() > key.expiresAt) {
      key.isActive = false;
      await this.auditLog('API_KEY_EXPIRED', { serviceAccountId, keyId });
      return false;
    }

    // 権限チェック
    const permission = serviceAccount.permissions.find(p => p.resource === resource);
    if (!permission || (permission.level & requiredLevel) === 0) {
      await this.auditLog('PERMISSION_DENIED', { 
        serviceAccountId, 
        resource, 
        requiredLevel,
        actualLevel: permission?.level 
      });
      return false;
    }

    // ポリシーチェック
    for (const policy of serviceAccount.policies) {
      if (!this.evaluatePolicy(policy, serviceAccountId, resource, context)) {
        await this.auditLog('POLICY_DENIED', { serviceAccountId, resource, policy });
        return false;
      }
    }

    // 最終利用時刻の更新
    key.lastUsed = new Date();
    serviceAccount.lastUsed = new Date();

    return true;
  }

  /**
   * ポリシーの評価
   */
  private evaluatePolicy(
    policy: IAMPolicy,
    principal: string,
    resource: string,
    context?: Record<string, any>
  ): boolean {
    for (const statement of policy.statement) {
      // プリンシパルチェック
      const principals = Array.isArray(statement.principal) ? statement.principal : [statement.principal];
      if (!principals.includes(principal) && !principals.includes('*')) {
        continue;
      }

      // リソースチェック
      const resources = Array.isArray(statement.resource) ? statement.resource : [statement.resource];
      if (!resources.includes(resource) && !resources.includes('*')) {
        continue;
      }

      // 条件チェック
      if (statement.condition) {
        if (!this.evaluateCondition(statement.condition, context)) {
          continue;
        }
      }

      return statement.effect === 'Allow';
    }

    return true; // デフォルトは許可
  }

  /**
   * 条件の評価
   */
  private evaluateCondition(condition: PolicyCondition, context?: Record<string, any>): boolean {
    // IPアドレスチェック
    if (condition.ipAddress && context?.ipAddress) {
      if (!condition.ipAddress.includes(context.ipAddress)) {
        return false;
      }
    }

    // 日付範囲チェック
    if (condition.dateRange) {
      const now = new Date();
      if (now < condition.dateRange.start || now > condition.dateRange.end) {
        return false;
      }
    }

    // MFA要求チェック
    if (condition.mfaRequired && !context?.mfaVerified) {
      return false;
    }

    // タグチェック
    if (condition.tags) {
      for (const [key, value] of Object.entries(condition.tags)) {
        if (context?.tags?.[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * キーローテーション
   */
  async rotateAPIKeys(serviceAccountId: string): Promise<void> {
    const serviceAccount = this.serviceAccounts.get(serviceAccountId);
    if (!serviceAccount) {
      throw new Error('Service account not found');
    }

    const now = new Date();
    const newKeys: APIKey[] = [];

    // 既存のアクティブなキーに対して新しいキーを生成
    for (const oldKey of serviceAccount.apiKeys) {
      if (oldKey.isActive) {
        const newKey = await this.generateAPIKey(
          serviceAccountId,
          oldKey.scopes,
          90 // 90日の有効期限
        );
        newKeys.push(newKey);

        // 古いキーを30日後に無効化
        setTimeout(() => {
          oldKey.isActive = false;
        }, 30 * 24 * 60 * 60 * 1000);
      }
    }

    await this.auditLog('API_KEYS_ROTATED', { 
      serviceAccountId, 
      oldKeyCount: serviceAccount.apiKeys.length,
      newKeyCount: newKeys.length 
    });
  }

  /**
   * キーローテーションのスケジュール
   */
  private scheduleKeyRotation(serviceAccountId: string, days: number): void {
    const timer = setTimeout(async () => {
      await this.rotateAPIKeys(serviceAccountId);
      // 次のローテーションをスケジュール
      this.scheduleKeyRotation(serviceAccountId, 90);
    }, days * 24 * 60 * 60 * 1000);

    this.rotationSchedule.set(serviceAccountId, timer);
  }

  /**
   * セキュアなキーの生成
   */
  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * 監査ログ
   */
  private async auditLog(action: string, details: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      source: 'IAMManager'
    };

    console.log('IAM_AUDIT:', JSON.stringify(logEntry));
    // 実際の実装では監査ログストレージに保存
  }

  /**
   * 権限の最小化チェック
   */
  async checkLeastPrivilege(): Promise<{
    serviceAccountId: string;
    unusedPermissions: Permission[];
    recommendation: string;
  }[]> {
    const recommendations: any[] = [];

    for (const [id, account] of this.serviceAccounts) {
      const unusedPermissions: Permission[] = [];
      
      // 90日間使用されていない権限を特定
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      if (!account.lastUsed || account.lastUsed < ninetyDaysAgo) {
        unusedPermissions.push(...account.permissions);
      }

      if (unusedPermissions.length > 0) {
        recommendations.push({
          serviceAccountId: id,
          unusedPermissions,
          recommendation: 'Consider removing unused permissions or deactivating the service account'
        });
      }
    }

    return recommendations;
  }
}

/**
 * JWTベースの短期トークン管理
 */
export class ShortLivedTokenManager {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  }

  /**
   * 短期トークンの生成
   */
  generateToken(
    serviceAccountId: string,
    scopes: string[],
    expiresInMinutes: number = 15
  ): string {
    const payload = {
      sub: serviceAccountId,
      scopes,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.secret, { algorithm: 'HS256' });
  }

  /**
   * トークンの検証
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.secret, { algorithms: ['HS256'] });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

/**
 * アクセス制御マトリックス
 */
export const ACCESS_CONTROL_MATRIX = {
  roles: {
    viewer: {
      permissions: [
        { resource: ResourceType.USER_DATA, level: PermissionLevel.READ },
        { resource: ResourceType.TRANSACTION, level: PermissionLevel.READ }
      ]
    },
    operator: {
      permissions: [
        { resource: ResourceType.USER_DATA, level: PermissionLevel.READ | PermissionLevel.WRITE },
        { resource: ResourceType.TRANSACTION, level: PermissionLevel.READ | PermissionLevel.WRITE },
        { resource: ResourceType.AUDIT_LOG, level: PermissionLevel.READ }
      ]
    },
    admin: {
      permissions: [
        { resource: ResourceType.USER_DATA, level: PermissionLevel.READ | PermissionLevel.WRITE | PermissionLevel.DELETE },
        { resource: ResourceType.TRANSACTION, level: PermissionLevel.READ | PermissionLevel.WRITE | PermissionLevel.DELETE },
        { resource: ResourceType.AUDIT_LOG, level: PermissionLevel.READ },
        { resource: ResourceType.SYSTEM_CONFIG, level: PermissionLevel.READ | PermissionLevel.WRITE }
      ]
    },
    security_admin: {
      permissions: [
        { resource: ResourceType.AUDIT_LOG, level: PermissionLevel.READ | PermissionLevel.WRITE },
        { resource: ResourceType.SECURITY_SETTINGS, level: PermissionLevel.READ | PermissionLevel.WRITE | PermissionLevel.ADMIN },
        { resource: ResourceType.SYSTEM_CONFIG, level: PermissionLevel.READ | PermissionLevel.WRITE }
      ]
    }
  }
};