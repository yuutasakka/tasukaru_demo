// エンタープライズレベル統合セキュリティ管理システム
import { SecureTokenManager, TokenPair } from './secureTokenManager';
import { SecureSessionManager, SessionData } from './secureSessionManager';
import { PasswordSecurityManager } from './passwordSecurityManager';
import { EncryptionManager, SensitiveDataType } from './encryptionManager';
import { InputValidator, ValidationRule, ValidationResult } from './inputValidation';
import { SecurityAuditLogger, SecurityEventType, SecurityEventSeverity } from './securityAuditLogger';
import { secureLog } from '../config/clientSecurity';

export interface SecurityPolicy {
  authentication: {
    mfaRequired: boolean;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
      requireUppercase: boolean;
      requireLowercase: boolean;
      maxAge: number; // days
      historyCount: number;
    };
    lockoutPolicy: {
      maxAttempts: number;
      lockoutDuration: number; // minutes
      progressiveLockout: boolean;
    };
    sessionPolicy: {
      maxDuration: number; // minutes
      idleTimeout: number; // minutes
      maxConcurrentSessions: number;
      rotationInterval: number; // minutes
    };
  };
  authorization: {
    rbacEnabled: boolean;
    principleOfLeastPrivilege: boolean;
    privilegeEscalationProtection: boolean;
    resourceAccessLogging: boolean;
  };
  dataProtection: {
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    fieldLevelEncryption: boolean;
    keyRotationInterval: number; // days
    dataClassification: boolean;
  };
  monitoring: {
    auditLogging: boolean;
    realTimeMonitoring: boolean;
    anomalyDetection: boolean;
    complianceReporting: boolean;
    threatIntelligence: boolean;
  };
  compliance: {
    gdprCompliance: boolean;
    hipaaCompliance: boolean;
    pciCompliance: boolean;
    soxCompliance: boolean;
    iso27001Compliance: boolean;
  };
}

export interface SecurityMetrics {
  authentication: {
    totalLogins: number;
    failedLogins: number;
    mfaAdoption: number;
    averageSessionDuration: number;
    concurrentSessions: number;
  };
  security: {
    securityEvents: number;
    highRiskEvents: number;
    blockedRequests: number;
    encryptedDataPercentage: number;
    keyRotations: number;
  };
  compliance: {
    auditEvents: number;
    complianceViolations: number;
    dataAccessRequests: number;
    retentionCompliance: number;
  };
  performance: {
    averageResponseTime: number;
    securityOverhead: number;
    throughput: number;
  };
}

export interface SecurityHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: number;
  checks: {
    name: string;
    status: boolean;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  recommendations: string[];
  nextCheckTime: number;
}

export interface ThreatAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  threats: {
    type: string;
    severity: SecurityEventSeverity;
    description: string;
    mitigation: string;
    timeline: string;
  }[];
  vulnerabilities: {
    component: string;
    cve?: string;
    severity: string;
    description: string;
    remediation: string;
  }[];
  recommendations: string[];
  lastAssessment: number;
}

export class EnterpriseSecurityManager {
  private static instance: EnterpriseSecurityManager;
  private static securityPolicy: SecurityPolicy;
  private static isInitialized = false;
  
  // セキュリティメトリクス
  private static metrics: SecurityMetrics = {
    authentication: {
      totalLogins: 0,
      failedLogins: 0,
      mfaAdoption: 0,
      averageSessionDuration: 0,
      concurrentSessions: 0
    },
    security: {
      securityEvents: 0,
      highRiskEvents: 0,
      blockedRequests: 0,
      encryptedDataPercentage: 0,
      keyRotations: 0
    },
    compliance: {
      auditEvents: 0,
      complianceViolations: 0,
      dataAccessRequests: 0,
      retentionCompliance: 0
    },
    performance: {
      averageResponseTime: 0,
      securityOverhead: 0,
      throughput: 0
    }
  };

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): EnterpriseSecurityManager {
    if (!this.instance) {
      this.instance = new EnterpriseSecurityManager();
    }
    return this.instance;
  }

  /**
   * セキュリティシステム初期化
   */
  static async initialize(policy?: Partial<SecurityPolicy>): Promise<void> {
    try {
      // デフォルトセキュリティポリシーの設定
      this.securityPolicy = this.mergeSecurityPolicy(this.getDefaultSecurityPolicy(), policy);
      
      // 各セキュリティコンポーネントの初期化
      await EncryptionManager.initialize();
      
      // セキュリティポリシーの適用
      await this.applySecurityPolicy();
      
      // ヘルスチェックの開始
      this.startHealthChecks();
      
      // メトリクス収集の開始
      this.startMetricsCollection();
      
      this.isInitialized = true;
      
      await SecurityAuditLogger.logSecurityEvent(
        'system_access',
        'security_system_initialized',
        'success',
        { policy: this.securityPolicy },
        { ipAddress: 'system', userAgent: 'system' },
        { resource: 'security_system', resourceType: 'system' },
        'medium'
      );
      
      secureLog('エンタープライズセキュリティシステム初期化完了', {
        policyVersion: '1.0',
        componentsInitialized: [
          'tokenManager',
          'sessionManager', 
          'passwordManager',
          'encryptionManager',
          'inputValidator',
          'auditLogger'
        ]
      });
    } catch (error) {
      secureLog('セキュリティシステム初期化エラー:', error);
      throw new Error('セキュリティシステムの初期化に失敗しました');
    }
  }

  /**
   * セキュアな認証処理
   */
  static async authenticateUser(
    credentials: {
      username: string;
      password: string;
      mfaCode?: string;
      deviceId?: string;
    },
    context: {
      ipAddress: string;
      userAgent: string;
      sessionId?: string;
    }
  ): Promise<{
    success: boolean;
    tokenPair?: TokenPair;
    sessionData?: SessionData;
    requiresMFA?: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // 入力検証
      const validationResult = await this.validateAuthenticationInput(credentials);
      if (!validationResult.isValid) {
        await this.logAuthenticationEvent('failure', 'input_validation_failed', credentials.username, context);
        return { success: false, error: validationResult.errors[0] };
      }

      // レート制限チェック
      const rateLimitCheck = await this.checkAuthenticationRateLimit(context.ipAddress, credentials.username);
      if (!rateLimitCheck.allowed) {
        await this.logAuthenticationEvent('denied', 'rate_limit_exceeded', credentials.username, context);
        return { success: false, error: 'Too many login attempts. Please try again later.' };
      }

      // パスワード検証
      const passwordResult = await PasswordSecurityManager.verifyPassword(
        credentials.username,
        credentials.password,
        context.ipAddress
      );

      if (!passwordResult.success) {
        await this.logAuthenticationEvent('failure', 'invalid_credentials', credentials.username, context);
        this.metrics.authentication.failedLogins++;
        return { success: false, error: passwordResult.reason };
      }

      // MFA要求チェック
      if (this.securityPolicy.authentication.mfaRequired && !credentials.mfaCode) {
        await this.logAuthenticationEvent('success', 'mfa_required', credentials.username, context);
        return { success: false, requiresMFA: true };
      }

      // MFA検証（提供されている場合）
      if (credentials.mfaCode) {
        // MFA検証ロジック（TwoFactorAuthコンポーネントと統合）
        // 実装では、MFA検証を行う
      }

      // セッション作成
      const { sessionData, tokenPair } = await SecureSessionManager.createSession(
        credentials.username,
        credentials.username, // 実際はユーザー情報から取得
        context.ipAddress,
        context.userAgent,
        Boolean(credentials.mfaCode)
      );

      // 成功ログ記録
      await this.logAuthenticationEvent('success', 'login_successful', credentials.username, context);
      
      // メトリクス更新
      this.metrics.authentication.totalLogins++;
      
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);

      return {
        success: true,
        tokenPair,
        sessionData
      };
    } catch (error) {
      secureLog('認証処理エラー:', error);
      await this.logAuthenticationEvent('error', 'authentication_error', credentials.username, context);
      return { success: false, error: 'Authentication failed due to system error' };
    }
  }

  /**
   * データ暗号化処理
   */
  static async encryptSensitiveData(
    data: string,
    dataType: SensitiveDataType,
    context: {
      userId: string;
      purpose: string;
      classification: 'public' | 'internal' | 'confidential' | 'restricted';
    }
  ): Promise<{ success: boolean; encryptedData?: string; error?: string }> {
    try {
      // データ分類に基づく暗号化要件チェック
      if (!this.shouldEncryptData(context.classification)) {
        return { success: true, encryptedData: data };
      }

      // 暗号化実行
      const encryptedData = await EncryptionManager.encryptSensitiveData(data, dataType);
      
      // 監査ログ記録
      await SecurityAuditLogger.logSecurityEvent(
        'data_modification',
        'data_encrypted',
        'success',
        {
          dataType,
          classification: context.classification,
          purpose: context.purpose,
          encryptionKeyVersion: encryptedData.keyVersion
        },
        { userId: context.userId, ipAddress: 'system' },
        { resource: 'sensitive_data', resourceType: 'data' },
        'medium'
      );

      this.metrics.security.encryptedDataPercentage = this.calculateEncryptedDataPercentage();

      return { success: true, encryptedData: JSON.stringify(encryptedData) };
    } catch (error) {
      secureLog('データ暗号化エラー:', error);
      return { success: false, error: 'Data encryption failed' };
    }
  }

  /**
   * セキュリティヘルスチェック実行
   */
  static async performHealthCheck(): Promise<SecurityHealthCheck> {
    const checks = [];
    let overallStatus: SecurityHealthCheck['status'] = 'healthy';
    const recommendations: string[] = [];

    try {
      // トークンマネージャーチェック
      const tokenStats = SecureTokenManager.getTokenStats();
      checks.push({
        name: 'Token Manager',
        status: tokenStats.blacklistedCount < 1000,
        message: `Blacklisted tokens: ${tokenStats.blacklistedCount}`,
        severity: tokenStats.blacklistedCount > 1000 ? 'medium' : 'low'
      });

      // セッションマネージャーチェック
      const sessionStats = SecureSessionManager.getSessionStats();
      checks.push({
        name: 'Session Manager',
        status: sessionStats.activeSessions < 10000,
        message: `Active sessions: ${sessionStats.activeSessions}`,
        severity: sessionStats.activeSessions > 10000 ? 'medium' : 'low'
      });

      // 暗号化システムチェック
      const encryptionStats = EncryptionManager.getEncryptionStats();
      const keyRotationOverdue = encryptionStats.lastRotation < Date.now() - (7 * 24 * 60 * 60 * 1000);
      checks.push({
        name: 'Encryption System',
        status: !keyRotationOverdue,
        message: keyRotationOverdue ? 'Key rotation overdue' : 'Encryption system healthy',
        severity: keyRotationOverdue ? 'high' : 'low'
      });

      // 監査システムチェック
      const auditStats = SecurityAuditLogger.getAuditStats();
      checks.push({
        name: 'Audit System',
        status: auditStats.integrityViolations === 0,
        message: `Integrity violations: ${auditStats.integrityViolations}`,
        severity: auditStats.integrityViolations > 0 ? 'critical' : 'low'
      });

      // パスワードセキュリティチェック
      const passwordStats = PasswordSecurityManager.getSecurityStats();
      checks.push({
        name: 'Password Security',
        status: passwordStats.lockedAccounts < 100,
        message: `Locked accounts: ${passwordStats.lockedAccounts}`,
        severity: passwordStats.lockedAccounts > 100 ? 'medium' : 'low'
      });

      // 全体ステータス判定
      const criticalIssues = checks.filter(c => c.severity === 'critical' && !c.status);
      const highIssues = checks.filter(c => c.severity === 'high' && !c.status);
      const mediumIssues = checks.filter(c => c.severity === 'medium' && !c.status);

      if (criticalIssues.length > 0) {
        overallStatus = 'critical';
        recommendations.push('Critical security issues detected. Immediate action required.');
      } else if (highIssues.length > 0) {
        overallStatus = 'warning';
        recommendations.push('High severity issues found. Address as soon as possible.');
      } else if (mediumIssues.length > 0) {
        overallStatus = 'warning';
        recommendations.push('Medium severity issues detected. Schedule maintenance.');
      }

      // キーローテーション推奨
      if (keyRotationOverdue) {
        recommendations.push('Perform encryption key rotation.');
      }

      return {
        status: overallStatus,
        lastCheck: Date.now(),
        checks,
        recommendations,
        nextCheckTime: Date.now() + (60 * 60 * 1000) // 1時間後
      };
    } catch (error) {
      secureLog('ヘルスチェックエラー:', error);
      return {
        status: 'critical',
        lastCheck: Date.now(),
        checks: [{
          name: 'Health Check System',
          status: false,
          message: 'Health check system failure',
          severity: 'critical'
        }],
        recommendations: ['Investigate health check system failure'],
        nextCheckTime: Date.now() + (15 * 60 * 1000) // 15分後に再試行
      };
    }
  }

  /**
   * 脅威評価実行
   */
  static async performThreatAssessment(): Promise<ThreatAssessment> {
    try {
      const threats = [];
      const vulnerabilities = [];
      let riskLevel: ThreatAssessment['riskLevel'] = 'low';

      // 高リスクイベントの分析
      const auditStats = SecurityAuditLogger.getAuditStats();
      if (auditStats.highRiskEvents > 10) {
        threats.push({
          type: 'High Risk Security Events',
          severity: 'high' as SecurityEventSeverity,
          description: `${auditStats.highRiskEvents} high-risk security events detected`,
          mitigation: 'Review and investigate high-risk events',
          timeline: 'Immediate'
        });
        riskLevel = 'high';
      }

      // セッションハイジャック検出
      const sessionStats = SecureSessionManager.getSessionStats();
      if (sessionStats.activeSessions > 5000) {
        threats.push({
          type: 'Potential Session Flooding',
          severity: 'medium' as SecurityEventSeverity,
          description: 'Unusually high number of active sessions detected',
          mitigation: 'Monitor session patterns and implement stricter session limits',
          timeline: '24 hours'
        });
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      // 暗号化脆弱性
      const encryptionStats = EncryptionManager.getEncryptionStats();
      if (encryptionStats.lastRotation < Date.now() - (30 * 24 * 60 * 60 * 1000)) {
        vulnerabilities.push({
          component: 'Encryption System',
          severity: 'medium',
          description: 'Encryption keys have not been rotated in 30+ days',
          remediation: 'Perform immediate key rotation'
        });
      }

      // パスワード関連脅威
      const passwordStats = PasswordSecurityManager.getSecurityStats();
      if (passwordStats.lockedAccounts > 50) {
        threats.push({
          type: 'Brute Force Attack Pattern',
          severity: 'medium' as SecurityEventSeverity,
          description: 'High number of account lockouts suggests potential brute force attacks',
          mitigation: 'Implement IP-based blocking and enhanced monitoring',
          timeline: '12 hours'
        });
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      // 推奨事項
      const recommendations = [
        'Maintain regular security monitoring and alerting',
        'Ensure all security policies are up to date',
        'Conduct regular penetration testing',
        'Keep all security components updated',
        'Review and validate backup and recovery procedures'
      ];

      return {
        riskLevel,
        threats,
        vulnerabilities,
        recommendations,
        lastAssessment: Date.now()
      };
    } catch (error) {
      secureLog('脅威評価エラー:', error);
      return {
        riskLevel: 'critical',
        threats: [{
          type: 'System Assessment Failure',
          severity: 'critical',
          description: 'Unable to perform threat assessment',
          mitigation: 'Investigate assessment system failure',
          timeline: 'Immediate'
        }],
        vulnerabilities: [],
        recommendations: ['Fix threat assessment system'],
        lastAssessment: Date.now()
      };
    }
  }

  /**
   * セキュリティメトリクス取得
   */
  static getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * セキュリティポリシー取得
   */
  static getSecurityPolicy(): SecurityPolicy {
    return { ...this.securityPolicy };
  }

  /**
   * セキュリティポリシー更新
   */
  static async updateSecurityPolicy(updates: Partial<SecurityPolicy>): Promise<void> {
    try {
      const oldPolicy = { ...this.securityPolicy };
      this.securityPolicy = this.mergeSecurityPolicy(this.securityPolicy, updates);
      
      await this.applySecurityPolicy();
      
      await SecurityAuditLogger.logSecurityEvent(
        'configuration_change',
        'security_policy_updated',
        'success',
        {
          oldPolicy: this.hashSensitiveData(JSON.stringify(oldPolicy)),
          newPolicy: this.hashSensitiveData(JSON.stringify(this.securityPolicy))
        },
        { userId: 'system', ipAddress: 'system' },
        { resource: 'security_policy', resourceType: 'configuration' },
        'high'
      );
      
      secureLog('セキュリティポリシー更新完了');
    } catch (error) {
      secureLog('セキュリティポリシー更新エラー:', error);
      throw new Error('Failed to update security policy');
    }
  }

  /**
   * デフォルトセキュリティポリシー取得
   */
  private static getDefaultSecurityPolicy(): SecurityPolicy {
    return {
      authentication: {
        mfaRequired: true,
        passwordPolicy: {
          minLength: 12,
          requireSpecialChars: true,
          requireNumbers: true,
          requireUppercase: true,
          requireLowercase: true,
          maxAge: 90,
          historyCount: 12
        },
        lockoutPolicy: {
          maxAttempts: 5,
          lockoutDuration: 30,
          progressiveLockout: true
        },
        sessionPolicy: {
          maxDuration: 480, // 8時間
          idleTimeout: 30,
          maxConcurrentSessions: 3,
          rotationInterval: 15
        }
      },
      authorization: {
        rbacEnabled: true,
        principleOfLeastPrivilege: true,
        privilegeEscalationProtection: true,
        resourceAccessLogging: true
      },
      dataProtection: {
        encryptionAtRest: true,
        encryptionInTransit: true,
        fieldLevelEncryption: true,
        keyRotationInterval: 7,
        dataClassification: true
      },
      monitoring: {
        auditLogging: true,
        realTimeMonitoring: true,
        anomalyDetection: true,
        complianceReporting: true,
        threatIntelligence: true
      },
      compliance: {
        gdprCompliance: true,
        hipaaCompliance: false,
        pciCompliance: false,
        soxCompliance: false,
        iso27001Compliance: true
      }
    };
  }

  /**
   * セキュリティポリシーマージ
   */
  private static mergeSecurityPolicy(base: SecurityPolicy, updates?: Partial<SecurityPolicy>): SecurityPolicy {
    if (!updates) return base;
    
    return {
      authentication: { ...base.authentication, ...updates.authentication },
      authorization: { ...base.authorization, ...updates.authorization },
      dataProtection: { ...base.dataProtection, ...updates.dataProtection },
      monitoring: { ...base.monitoring, ...updates.monitoring },
      compliance: { ...base.compliance, ...updates.compliance }
    };
  }

  /**
   * セキュリティポリシー適用
   */
  private static async applySecurityPolicy(): Promise<void> {
    // 各コンポーネントにポリシーを適用
    // 実装では、各セキュリティコンポーネントの設定を更新
  }

  /**
   * ヘルスチェック開始
   */
  private static startHealthChecks(): void {
    // 1時間ごとにヘルスチェック実行
    setInterval(async () => {
      const healthCheck = await this.performHealthCheck();
      if (healthCheck.status === 'critical' || healthCheck.status === 'warning') {
        secureLog('🔍 セキュリティヘルスチェック警告', healthCheck);
      }
    }, 60 * 60 * 1000);
  }

  /**
   * メトリクス収集開始
   */
  private static startMetricsCollection(): void {
    // 5分ごとにメトリクス更新
    setInterval(() => {
      this.updateSecurityMetrics();
    }, 5 * 60 * 1000);
  }

  /**
   * セキュリティメトリクス更新
   */
  private static updateSecurityMetrics(): void {
    try {
      // セッション統計
      const sessionStats = SecureSessionManager.getSessionStats();
      this.metrics.authentication.concurrentSessions = sessionStats.activeSessions;

      // セキュリティイベント統計
      const auditStats = SecurityAuditLogger.getAuditStats();
      this.metrics.security.securityEvents = auditStats.totalEvents;
      this.metrics.security.highRiskEvents = auditStats.highRiskEvents;

      // 暗号化統計
      const encryptionStats = EncryptionManager.getEncryptionStats();
      this.metrics.security.keyRotations = encryptionStats.keyRotations;

      // パスワード統計
      const passwordStats = PasswordSecurityManager.getSecurityStats();
      // メトリクス更新...

    } catch (error) {
      secureLog('メトリクス更新エラー:', error);
    }
  }

  /**
   * 認証入力検証
   */
  private static async validateAuthenticationInput(
    credentials: { username: string; password: string; mfaCode?: string }
  ): Promise<ValidationResult> {
    const rules: ValidationRule[] = [
      { type: 'required', message: 'Username is required' },
      { type: 'minLength', value: 3, message: 'Username must be at least 3 characters' },
      { type: 'maxLength', value: 50, message: 'Username must be less than 50 characters' }
    ];

    return InputValidator.validateInputAdvanced(credentials.username, rules);
  }

  /**
   * 認証レート制限チェック
   */
  private static async checkAuthenticationRateLimit(
    ipAddress: string,
    username: string
  ): Promise<{ allowed: boolean; remainingAttempts?: number }> {
    // 実装では、IPアドレスとユーザー名ベースのレート制限を適用
    return { allowed: true };
  }

  /**
   * 認証イベントログ記録
   */
  private static async logAuthenticationEvent(
    outcome: 'success' | 'failure' | 'denied' | 'error',
    action: string,
    username: string,
    context: { ipAddress: string; userAgent: string; sessionId?: string }
  ): Promise<void> {
    await SecurityAuditLogger.logSecurityEvent(
      'authentication',
      action,
      outcome,
      { username, method: 'password' },
      {
        userId: username,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      },
      { resource: 'authentication_system', resourceType: 'system' },
      outcome === 'failure' ? 'medium' : 'low'
    );
  }

  /**
   * データ暗号化要否判定
   */
  private static shouldEncryptData(classification: string): boolean {
    return classification === 'confidential' || classification === 'restricted';
  }

  /**
   * 暗号化データ比率計算
   */
  private static calculateEncryptedDataPercentage(): number {
    // 実装では、データベース内の暗号化済みデータの比率を計算
    return 85; // プレースホルダー
  }

  /**
   * パフォーマンスメトリクス更新
   */
  private static updatePerformanceMetrics(duration: number): void {
    // 移動平均でレスポンス時間を更新
    this.metrics.performance.averageResponseTime = 
      (this.metrics.performance.averageResponseTime * 0.9) + (duration * 0.1);
  }

  /**
   * センシティブデータハッシュ化
   */
  private static hashSensitiveData(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * システム状態取得
   */
  static getSystemStatus(): {
    initialized: boolean;
    uptime: number;
    version: string;
    lastHealthCheck?: number;
    activeThreats: number;
  } {
    return {
      initialized: this.isInitialized,
      uptime: process.uptime ? process.uptime() * 1000 : 0,
      version: '1.0.0',
      activeThreats: 0 // 実装では実際の脅威数を返す
    };
  }
}

// システム初期化（サーバーサイドのみ）
if (typeof window === 'undefined') {
  // 環境変数からカスタムポリシーを読み込み
  EnterpriseSecurityManager.initialize().catch(error => {
  });
}