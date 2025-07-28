// エンタープライズレベルセキュリティ監査ログシステム
import { secureLog } from '../config/clientSecurity';
import CryptoJS from 'crypto-js';

export type SecurityEventType = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'security_violation'
  | 'configuration_change'
  | 'system_access'
  | 'suspicious_activity'
  | 'compliance_event'
  | 'vulnerability_detected';

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  source: string;
  actor: {
    userId?: string;
    sessionId?: string;
    ipAddress: string;
    userAgent?: string;
    deviceId?: string;
  };
  target: {
    resource: string;
    resourceId?: string;
    resourceType?: string;
  };
  action: string;
  outcome: 'success' | 'failure' | 'denied' | 'error';
  details: Record<string, any>;
  riskScore: number; // 0-100
  compliance: {
    gdpr?: boolean;
    hipaa?: boolean;
    pci?: boolean;
    sox?: boolean;
  };
  correlation?: {
    requestId?: string;
    sessionId?: string;
    traceId?: string;
  };
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
  metadata: {
    environment: string;
    version: string;
    checksum: string;
  };
}

export interface AuditQuery {
  startTime?: number;
  endTime?: number;
  type?: SecurityEventType[];
  severity?: SecurityEventSeverity[];
  actor?: string;
  outcome?: string[];
  riskScoreMin?: number;
  riskScoreMax?: number;
  limit?: number;
  offset?: number;
}

export interface ComplianceReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalEvents: number;
    byType: Record<SecurityEventType, number>;
    bySeverity: Record<SecurityEventSeverity, number>;
    byOutcome: Record<string, number>;
    highRiskEvents: number;
    complianceViolations: number;
  };
  trends: {
    dailyEventCounts: Array<{ date: string; count: number }>;
    topUsers: Array<{ userId: string; eventCount: number }>;
    topResources: Array<{ resource: string; accessCount: number }>;
    riskTrend: Array<{ date: string; averageRisk: number }>;
  };
  violations: SecurityEvent[];
  recommendations: string[];
}

export class SecurityAuditLogger {
  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 100000; // メモリ効率のため制限
  private static readonly RETENTION_DAYS = 90;
  
  // 改ざん防止用のチェックサム
  private static checksumHistory: Map<string, string> = new Map();
  
  /**
   * セキュリティイベントの記録
   */
  static async logSecurityEvent(
    type: SecurityEventType,
    action: string,
    outcome: 'success' | 'failure' | 'denied' | 'error',
    details: Record<string, any>,
    actor: SecurityEvent['actor'],
    target: SecurityEvent['target'],
    severity: SecurityEventSeverity = 'medium'
  ): Promise<string> {
    try {
      const eventId = this.generateSecureId();
      const timestamp = Date.now();
      
      const event: SecurityEvent = {
        id: eventId,
        timestamp,
        type,
        severity,
        source: 'application',
        actor: this.sanitizeActor(actor),
        target: this.sanitizeTarget(target),
        action,
        outcome,
        details: this.sanitizeDetails(details),
        riskScore: this.calculateRiskScore(type, severity, outcome, details, actor),
        compliance: this.determineComplianceRequirements(type, details),
        correlation: {
          requestId: details.requestId,
          sessionId: actor.sessionId,
          traceId: details.traceId
        },
        geolocation: await this.resolveGeolocation(actor.ipAddress),
        metadata: {
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          checksum: await this.calculateEventChecksum(eventId, timestamp, type, action)
        }
      };

      // イベントを保存
      this.events.push(event);
      
      // メモリ制限の管理
      if (this.events.length > this.MAX_EVENTS) {
        this.events = this.events.slice(-this.MAX_EVENTS * 0.8); // 20%を削除
      }
      
      // 改ざん防止チェックサムを記録
      this.checksumHistory.set(eventId, event.metadata.checksum);
      
      // 高リスクイベントの即座の通知
      if (event.riskScore >= 80 || severity === 'critical') {
        await this.alertHighRiskEvent(event);
      }
      
      // 外部ログシステムへの送信（本番環境）
      if (process.env.NODE_ENV === 'production') {
        await this.forwardToExternalLogger(event);
      }
      
      // 標準ログにも記録
      secureLog('セキュリティイベント記録', {
        eventId,
        type,
        action,
        outcome,
        severity,
        riskScore: event.riskScore,
        actor: actor.userId || actor.ipAddress,
        resource: target.resource
      });
      
      return eventId;
    } catch (error) {
      secureLog('セキュリティログ記録エラー:', error);
      throw new Error('セキュリティイベントのログ記録に失敗しました');
    }
  }

  /**
   * セキュリティイベントの検索
   */
  static querySecurityEvents(query: AuditQuery): SecurityEvent[] {
    try {
      let filteredEvents = [...this.events];
      
      // 時間範囲フィルター
      if (query.startTime) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= query.startTime!);
      }
      if (query.endTime) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= query.endTime!);
      }
      
      // タイプフィルター
      if (query.type && query.type.length > 0) {
        filteredEvents = filteredEvents.filter(e => query.type!.includes(e.type));
      }
      
      // 重要度フィルター
      if (query.severity && query.severity.length > 0) {
        filteredEvents = filteredEvents.filter(e => query.severity!.includes(e.severity));
      }
      
      // アクターフィルター
      if (query.actor) {
        filteredEvents = filteredEvents.filter(e => 
          e.actor.userId === query.actor || 
          e.actor.ipAddress === query.actor ||
          e.actor.sessionId === query.actor
        );
      }
      
      // 結果フィルター
      if (query.outcome && query.outcome.length > 0) {
        filteredEvents = filteredEvents.filter(e => query.outcome!.includes(e.outcome));
      }
      
      // リスクスコアフィルター
      if (query.riskScoreMin !== undefined) {
        filteredEvents = filteredEvents.filter(e => e.riskScore >= query.riskScoreMin!);
      }
      if (query.riskScoreMax !== undefined) {
        filteredEvents = filteredEvents.filter(e => e.riskScore <= query.riskScoreMax!);
      }
      
      // ソート（新しい順）
      filteredEvents.sort((a, b) => b.timestamp - a.timestamp);
      
      // ページネーション
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      
      return filteredEvents.slice(offset, offset + limit);
    } catch (error) {
      secureLog('セキュリティイベント検索エラー:', error);
      return [];
    }
  }

  /**
   * コンプライアンスレポート生成
   */
  static generateComplianceReport(
    startTime: number,
    endTime: number
  ): ComplianceReport {
    try {
      const events = this.querySecurityEvents({ startTime, endTime, limit: 10000 });
      
      // サマリー計算
      const summary = {
        totalEvents: events.length,
        byType: this.groupBy(events, 'type') as Record<SecurityEventType, number>,
        bySeverity: this.groupBy(events, 'severity') as Record<SecurityEventSeverity, number>,
        byOutcome: this.groupBy(events, 'outcome'),
        highRiskEvents: events.filter(e => e.riskScore >= 80).length,
        complianceViolations: events.filter(e => this.isComplianceViolation(e)).length
      };
      
      // トレンド分析
      const trends = {
        dailyEventCounts: this.calculateDailyCounts(events, startTime, endTime),
        topUsers: this.getTopActors(events),
        topResources: this.getTopResources(events),
        riskTrend: this.calculateRiskTrend(events, startTime, endTime)
      };
      
      // 違反イベント
      const violations = events.filter(e => 
        e.severity === 'critical' || 
        e.riskScore >= 90 || 
        this.isComplianceViolation(e)
      );
      
      // 推奨事項
      const recommendations = this.generateRecommendations(events, summary);
      
      return {
        period: { start: startTime, end: endTime },
        summary,
        trends,
        violations,
        recommendations
      };
    } catch (error) {
      secureLog('コンプライアンスレポート生成エラー:', error);
      throw new Error('コンプライアンスレポートの生成に失敗しました');
    }
  }

  /**
   * イベント整合性検証
   */
  static async verifyEventIntegrity(eventId: string): Promise<boolean> {
    try {
      const event = this.events.find(e => e.id === eventId);
      if (!event) {
        return false;
      }
      
      const storedChecksum = this.checksumHistory.get(eventId);
      if (!storedChecksum) {
        return false;
      }
      
      const calculatedChecksum = await this.calculateEventChecksum(
        event.id,
        event.timestamp,
        event.type,
        event.action
      );
      
      return storedChecksum === calculatedChecksum;
    } catch (error) {
      secureLog('イベント整合性検証エラー:', error);
      return false;
    }
  }

  /**
   * リスクスコア計算
   */
  private static calculateRiskScore(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    outcome: string,
    details: Record<string, any>,
    actor: SecurityEvent['actor']
  ): number {
    let score = 0;
    
    // ベーススコア（イベントタイプ）
    const typeScores: Record<SecurityEventType, number> = {
      'authentication': 20,
      'authorization': 30,
      'data_access': 25,
      'data_modification': 40,
      'security_violation': 80,
      'configuration_change': 60,
      'system_access': 35,
      'suspicious_activity': 70,
      'compliance_event': 50,
      'vulnerability_detected': 90
    };
    
    score += typeScores[type] || 20;
    
    // 重要度による調整
    const severityMultipliers: Record<SecurityEventSeverity, number> = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'critical': 2.0
    };
    
    score *= severityMultipliers[severity];
    
    // 結果による調整
    if (outcome === 'failure' || outcome === 'denied') {
      score *= 1.2;
    } else if (outcome === 'error') {
      score *= 1.1;
    }
    
    // 詳細情報による追加リスク
    if (details.multipleAttempts) {
      score += 15;
    }
    if (details.fromUnknownDevice) {
      score += 10;
    }
    if (details.outsideBusinessHours) {
      score += 5;
    }
    if (details.unusualGeolocation) {
      score += 10;
    }
    
    // 最大100に制限
    return Math.min(100, Math.round(score));
  }

  /**
   * コンプライアンス要件判定
   */
  private static determineComplianceRequirements(
    type: SecurityEventType,
    details: Record<string, any>
  ): SecurityEvent['compliance'] {
    const compliance: SecurityEvent['compliance'] = {};
    
    // GDPR関連
    if (type === 'data_access' || type === 'data_modification' || details.personalData) {
      compliance.gdpr = true;
    }
    
    // PCI DSS関連
    if (details.paymentData || details.cardData) {
      compliance.pci = true;
    }
    
    // SOX関連
    if (type === 'configuration_change' || details.financialData) {
      compliance.sox = true;
    }
    
    // HIPAA関連
    if (details.medicalData || details.healthData) {
      compliance.hipaa = true;
    }
    
    return compliance;
  }

  /**
   * セキュアID生成
   */
  private static generateSecureId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const random = Array.from(randomBytes, byte => byte.toString(36)).join('');
    return `sec_${timestamp}_${random}`;
  }

  /**
   * イベントチェックサム計算
   */
  private static async calculateEventChecksum(
    id: string,
    timestamp: number,
    type: SecurityEventType,
    action: string
  ): Promise<string> {
    const data = `${id}:${timestamp}:${type}:${action}`;
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * アクター情報のサニタイズ
   */
  private static sanitizeActor(actor: SecurityEvent['actor']): SecurityEvent['actor'] {
    return {
      userId: actor.userId ? this.hashPII(actor.userId) : undefined,
      sessionId: actor.sessionId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent ? actor.userAgent.substring(0, 200) : undefined,
      deviceId: actor.deviceId
    };
  }

  /**
   * ターゲット情報のサニタイズ
   */
  private static sanitizeTarget(target: SecurityEvent['target']): SecurityEvent['target'] {
    return {
      resource: target.resource,
      resourceId: target.resourceId ? this.hashPII(target.resourceId) : undefined,
      resourceType: target.resourceType
    };
  }

  /**
   * 詳細情報のサニタイズ
   */
  private static sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(details)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.hashPII(value);
      } else if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * 個人情報のハッシュ化
   */
  private static hashPII(data: any): string {
    if (!data) return '';
    return CryptoJS.SHA256(String(data)).toString().substring(0, 16);
  }

  /**
   * センシティブフィールド判定
   */
  private static isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'email', 'phone', 'ssn', 'creditCard', 'password', 'token',
      'personalId', 'address', 'name', 'birthday'
    ];
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * 地理的位置解決
   */
  private static async resolveGeolocation(ipAddress: string): Promise<SecurityEvent['geolocation']> {
    try {
      // 実際の実装では外部GeoIPサービスを使用
      if (this.isPrivateIP(ipAddress)) {
        return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
      }
      
      // プレースホルダー実装
      return { country: 'JP', region: 'Tokyo', city: 'Tokyo' };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * プライベートIP判定
   */
  private static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./
    ];
    return privateRanges.some(range => range.test(ip));
  }

  /**
   * 高リスクイベント通知
   */
  private static async alertHighRiskEvent(event: SecurityEvent): Promise<void> {
    try {
      secureLog('🚨 高リスクセキュリティイベント検出', {
        eventId: event.id,
        type: event.type,
        severity: event.severity,
        riskScore: event.riskScore,
        action: event.action,
        outcome: event.outcome,
        actor: event.actor.userId || event.actor.ipAddress,
        timestamp: new Date(event.timestamp).toISOString()
      });
      
      // 実際の実装では、Slack/Teams/メール通知等を送信
    } catch (error) {
      secureLog('高リスクイベント通知エラー:', error);
    }
  }

  /**
   * 外部ログシステムへの転送
   */
  private static async forwardToExternalLogger(event: SecurityEvent): Promise<void> {
    try {
      // 実際の実装では、Elasticsearch、Splunk、AWS CloudWatch等に送信
      // ここではプレースホルダー実装
      secureLog('外部ログシステム転送', {
        eventId: event.id,
        timestamp: event.timestamp
      });
    } catch (error) {
      secureLog('外部ログ転送エラー:', error);
    }
  }

  /**
   * イベントのグループ化
   */
  private static groupBy<T extends Record<string, any>>(
    items: T[],
    key: keyof T
  ): Record<string, number> {
    return items.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  /**
   * 日次カウント計算
   */
  private static calculateDailyCounts(
    events: SecurityEvent[],
    startTime: number,
    endTime: number
  ): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};
    
    for (const event of events) {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    }
    
    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * トップアクター取得
   */
  private static getTopActors(events: SecurityEvent[]): Array<{ userId: string; eventCount: number }> {
    const actorCounts = this.groupBy(events, 'actor');
    return Object.entries(actorCounts)
      .map(([userId, eventCount]) => ({ userId: userId || 'anonymous', eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
  }

  /**
   * トップリソース取得
   */
  private static getTopResources(events: SecurityEvent[]): Array<{ resource: string; accessCount: number }> {
    const resourceCounts: Record<string, number> = {};
    
    for (const event of events) {
      const resource = event.target.resource;
      resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
    }
    
    return Object.entries(resourceCounts)
      .map(([resource, accessCount]) => ({ resource, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
  }

  /**
   * リスクトレンド計算
   */
  private static calculateRiskTrend(
    events: SecurityEvent[],
    startTime: number,
    endTime: number
  ): Array<{ date: string; averageRisk: number }> {
    const dailyRisks: Record<string, number[]> = {};
    
    for (const event of events) {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!dailyRisks[date]) {
        dailyRisks[date] = [];
      }
      dailyRisks[date].push(event.riskScore);
    }
    
    return Object.entries(dailyRisks)
      .map(([date, risks]) => ({
        date,
        averageRisk: Math.round(risks.reduce((sum, risk) => sum + risk, 0) / risks.length)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * コンプライアンス違反判定
   */
  private static isComplianceViolation(event: SecurityEvent): boolean {
    return (
      event.type === 'security_violation' ||
      event.severity === 'critical' ||
      event.riskScore >= 90 ||
      (event.outcome === 'failure' && event.type === 'authentication') ||
      Boolean(event.compliance.gdpr || event.compliance.hipaa || event.compliance.pci)
    );
  }

  /**
   * 推奨事項生成
   */
  private static generateRecommendations(
    events: SecurityEvent[],
    summary: ComplianceReport['summary']
  ): string[] {
    const recommendations: string[] = [];
    
    if (summary.highRiskEvents > events.length * 0.1) {
      recommendations.push('高リスクイベントの発生率が高いため、セキュリティ対策の見直しを推奨します。');
    }
    
    if (summary.byOutcome.failure > events.length * 0.2) {
      recommendations.push('認証失敗率が高いため、アカウントロックアウト機能の強化を検討してください。');
    }
    
    if (summary.complianceViolations > 0) {
      recommendations.push('コンプライアンス違反が検出されています。該当する規制要件の確認と対策を実施してください。');
    }
    
    if (summary.bySeverity.critical > 0) {
      recommendations.push('クリティカルなセキュリティイベントが発生しています。即座に調査と対応を実施してください。');
    }
    
    return recommendations;
  }

  /**
   * システム統計取得
   */
  static getAuditStats(): {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    highRiskEvents: number;
    lastEventTime: number;
    integrityViolations: number;
  } {
    const eventsByType = this.groupBy(this.events, 'type') as Record<SecurityEventType, number>;
    const highRiskEvents = this.events.filter(e => e.riskScore >= 80).length;
    const lastEventTime = this.events.length > 0 
      ? Math.max(...this.events.map(e => e.timestamp))
      : 0;
    
    return {
      totalEvents: this.events.length,
      eventsByType,
      highRiskEvents,
      lastEventTime,
      integrityViolations: 0 // 実装では整合性チェック結果を返す
    };
  }

  /**
   * 定期クリーンアップ
   */
  static cleanup(): void {
    const cutoffTime = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const originalLength = this.events.length;
    
    // 古いイベントを削除
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
    
    // 対応するチェックサム履歴も削除
    for (const [eventId, checksum] of this.checksumHistory.entries()) {
      const event = this.events.find(e => e.id === eventId);
      if (!event) {
        this.checksumHistory.delete(eventId);
      }
    }
    
    const cleanedCount = originalLength - this.events.length;
    if (cleanedCount > 0) {
      secureLog('セキュリティ監査ログクリーンアップ完了', {
        cleanedEvents: cleanedCount,
        remainingEvents: this.events.length
      });
    }
  }
}

// 定期クリーンアップの設定（24時間ごと）
if (typeof window === 'undefined') {
  setInterval(() => {
    SecurityAuditLogger.cleanup();
  }, 24 * 60 * 60 * 1000);
}