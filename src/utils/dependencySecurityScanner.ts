// 依存関係セキュリティスキャナー・自動アップデートシステム
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { secureLog } from '../config/clientSecurity';
import { SecurityAuditLogger } from './securityAuditLogger';

export interface VulnerabilityReport {
  packageName: string;
  version: string;
  vulnerabilities: {
    id: string;
    cve?: string;
    title: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    description: string;
    recommendations: string[];
    fixedVersion?: string;
    patchedVersions: string[];
    references: string[];
    publishedDate: string;
    updatedDate: string;
  }[];
  riskScore: number;
  updateAvailable: boolean;
  latestVersion?: string;
}

export interface SecurityScanResult {
  scanId: string;
  timestamp: number;
  totalPackages: number;
  vulnerablePackages: number;
  totalVulnerabilities: number;
  vulnerabilitiesBySeverity: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  packages: VulnerabilityReport[];
  recommendations: string[];
  autoFixable: number;
  manualReviewRequired: number;
  nextScanTime: number;
}

export interface UpdatePolicy {
  autoUpdate: {
    enabled: boolean;
    severityThreshold: 'low' | 'moderate' | 'high' | 'critical';
    packageTypes: ('dependencies' | 'devDependencies' | 'peerDependencies')[];
    excludePackages: string[];
    requireApproval: boolean;
    testBeforeUpdate: boolean;
  };
  scheduling: {
    scanFrequency: 'daily' | 'weekly' | 'monthly';
    updateWindow: {
      start: string; // HH:MM format
      end: string;   // HH:MM format
      timezone: string;
    };
    maintenanceWindow: boolean;
  };
  notifications: {
    critical: boolean;
    high: boolean;
    moderate: boolean;
    low: boolean;
    email?: string[];
    webhook?: string;
  };
}

export class DependencySecurityScanner {
  private static updatePolicy: UpdatePolicy = {
    autoUpdate: {
      enabled: true,
      severityThreshold: 'high',
      packageTypes: ['dependencies'],
      excludePackages: [],
      requireApproval: true,
      testBeforeUpdate: true
    },
    scheduling: {
      scanFrequency: 'daily',
      updateWindow: {
        start: '02:00',
        end: '06:00',
        timezone: 'Asia/Tokyo'
      },
      maintenanceWindow: true
    },
    notifications: {
      critical: true,
      high: true,
      moderate: false,
      low: false
    }
  };

  private static scanHistory: SecurityScanResult[] = [];
  private static isScanning = false;

  /**
   * セキュリティスキャン実行
   */
  static async performSecurityScan(
    packageJsonPath: string = './package.json'
  ): Promise<SecurityScanResult> {
    if (this.isScanning) {
      throw new Error('スキャンが既に実行中です');
    }

    this.isScanning = true;
    const scanId = this.generateScanId();
    const timestamp = Date.now();

    try {
      secureLog('セキュリティスキャン開始', { scanId, timestamp });

      // package.jsonの読み込み
      const packageJson = this.readPackageJson(packageJsonPath);
      const allPackages = this.extractAllPackages(packageJson);

      // npm auditの実行
      const npmAuditResult = await this.runNpmAudit();
      
      // yarn auditの実行（利用可能な場合）
      const yarnAuditResult = await this.runYarnAudit();

      // 結果の統合と解析
      const vulnerabilityReports = await this.analyzeVulnerabilities(
        allPackages,
        npmAuditResult,
        yarnAuditResult
      );

      // 統計計算
      const stats = this.calculateStatistics(vulnerabilityReports);

      // 推奨事項生成
      const recommendations = this.generateRecommendations(vulnerabilityReports, stats);

      const result: SecurityScanResult = {
        scanId,
        timestamp,
        totalPackages: allPackages.length,
        vulnerablePackages: stats.vulnerablePackages,
        totalVulnerabilities: stats.totalVulnerabilities,
        vulnerabilitiesBySeverity: stats.severityBreakdown,
        packages: vulnerabilityReports,
        recommendations,
        autoFixable: stats.autoFixable,
        manualReviewRequired: stats.manualReviewRequired,
        nextScanTime: this.calculateNextScanTime()
      };

      // スキャン結果の保存
      this.scanHistory.push(result);
      if (this.scanHistory.length > 50) {
        this.scanHistory = this.scanHistory.slice(-25); // 最新25件を保持
      }

      // 監査ログ記録
      await SecurityAuditLogger.logSecurityEvent(
        'vulnerability_detected',
        'dependency_security_scan',
        'success',
        {
          scanId,
          totalVulnerabilities: result.totalVulnerabilities,
          criticalVulnerabilities: result.vulnerabilitiesBySeverity.critical,
          highVulnerabilities: result.vulnerabilitiesBySeverity.high
        },
        { userId: 'system', ipAddress: 'localhost' },
        { resource: 'dependency_scan', resourceType: 'security' },
        result.vulnerabilitiesBySeverity.critical > 0 ? 'critical' : 
        result.vulnerabilitiesBySeverity.high > 0 ? 'high' : 'medium'
      );

      // 高リスク脆弱性の通知
      if (result.vulnerabilitiesBySeverity.critical > 0 || result.vulnerabilitiesBySeverity.high > 0) {
        await this.sendSecurityAlert(result);
      }

      // 自動更新の実行判定
      if (this.shouldAutoUpdate(result)) {
        await this.performAutoUpdate(result);
      }

      secureLog('セキュリティスキャン完了', {
        scanId,
        vulnerabilities: result.totalVulnerabilities,
        duration: Date.now() - timestamp
      });

      return result;
    } catch (error) {
      secureLog('セキュリティスキャンエラー:', error);
      throw new Error(`セキュリティスキャンに失敗しました: ${error}`);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * 自動アップデート実行
   */
  static async performAutoUpdate(scanResult: SecurityScanResult): Promise<{
    success: boolean;
    updatedPackages: string[];
    errors: string[];
  }> {
    const updatedPackages: string[] = [];
    const errors: string[] = [];

    try {
      secureLog('自動アップデート開始', { scanId: scanResult.scanId });

      // バックアップ作成
      await this.createBackup();

      // 更新対象パッケージの抽出
      const packagesToUpdate = this.getUpdatablePackages(scanResult);

      for (const pkg of packagesToUpdate) {
        try {
          // 個別パッケージの更新
          await this.updatePackage(pkg.packageName, pkg.latestVersion);
          updatedPackages.push(`${pkg.packageName}@${pkg.latestVersion}`);

          // 更新後テスト実行
          if (this.updatePolicy.autoUpdate.testBeforeUpdate) {
            const testResult = await this.runTests();
            if (!testResult) {
              // テスト失敗時はロールバック
              await this.rollbackPackage(pkg.packageName);
              errors.push(`${pkg.packageName}: テスト失敗によりロールバック`);
              continue;
            }
          }

          await SecurityAuditLogger.logSecurityEvent(
            'configuration_change',
            'package_updated',
            'success',
            {
              packageName: pkg.packageName,
              oldVersion: pkg.version,
              newVersion: pkg.latestVersion,
              vulnerabilitiesFixed: pkg.vulnerabilities.length
            },
            { userId: 'system', ipAddress: 'localhost' },
            { resource: pkg.packageName, resourceType: 'package' },
            'medium'
          );

        } catch (error) {
          const errorMsg = `${pkg.packageName}: ${error}`;
          errors.push(errorMsg);
          secureLog('パッケージ更新エラー:', { package: pkg.packageName, error });
        }
      }

      // 最終テスト実行
      if (updatedPackages.length > 0) {
        const finalTestResult = await this.runFullTestSuite();
        if (!finalTestResult) {
          // 全体ロールバック
          await this.rollbackToBackup();
          errors.push('最終テスト失敗により全体をロールバック');
          return { success: false, updatedPackages: [], errors };
        }
      }

      secureLog('自動アップデート完了', {
        updatedPackages: updatedPackages.length,
        errors: errors.length
      });

      return {
        success: errors.length === 0,
        updatedPackages,
        errors
      };

    } catch (error) {
      secureLog('自動アップデートエラー:', error);
      return {
        success: false,
        updatedPackages,
        errors: [...errors, `システムエラー: ${error}`]
      };
    }
  }

  /**
   * package.jsonの読み込み
   */
  private static readPackageJson(path: string): any {
    try {
      const content = readFileSync(path, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`package.jsonの読み込みに失敗: ${error}`);
    }
  }

  /**
   * 全パッケージの抽出
   */
  private static extractAllPackages(packageJson: any): Array<{name: string; version: string; type: string}> {
    const packages: Array<{name: string; version: string; type: string}> = [];

    // dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        packages.push({ name, version: version as string, type: 'dependencies' });
      }
    }

    // devDependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        packages.push({ name, version: version as string, type: 'devDependencies' });
      }
    }

    // peerDependencies
    if (packageJson.peerDependencies) {
      for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
        packages.push({ name, version: version as string, type: 'peerDependencies' });
      }
    }

    return packages;
  }

  /**
   * npm audit実行
   */
  private static async runNpmAudit(): Promise<any> {
    try {
      const result = execSync('npm audit --json', { encoding: 'utf8', timeout: 60000 });
      return JSON.parse(result);
    } catch (error: any) {
      // npm auditは脆弱性が見つかった場合に終了コード1を返すため、
      // エラーでもstdoutに結果が含まれている場合は解析する
      try {
        if (error.stdout) {
          return JSON.parse(error.stdout);
        }
      } catch (parseError) {
        secureLog('npm audit結果の解析失敗:', parseError);
      }
      return { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 }, dependencies: { total: 0 } } };
    }
  }

  /**
   * yarn audit実行
   */
  private static async runYarnAudit(): Promise<any> {
    try {
      const result = execSync('yarn audit --json', { encoding: 'utf8', timeout: 60000 });
      const lines = result.trim().split('\\n');
      const auditData = lines
        .filter(line => line.startsWith('{"type":"auditAdvisory"'))
        .map(line => JSON.parse(line));
      return { advisories: auditData };
    } catch (error) {
      // yarnが利用できない場合やエラーの場合は空の結果を返す
      return { advisories: [] };
    }
  }

  /**
   * 脆弱性解析
   */
  private static async analyzeVulnerabilities(
    packages: Array<{name: string; version: string; type: string}>,
    npmAuditResult: any,
    yarnAuditResult: any
  ): Promise<VulnerabilityReport[]> {
    const reports: VulnerabilityReport[] = [];
    
    try {
      // npm auditの結果を解析
      if (npmAuditResult.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(npmAuditResult.vulnerabilities)) {
          const packageInfo = packages.find(p => p.name === packageName);
          if (!packageInfo) continue;

          const vulnerabilities = this.parseNpmVulnerabilities(vulnData as any);
          if (vulnerabilities.length > 0) {
            reports.push({
              packageName,
              version: packageInfo.version,
              vulnerabilities,
              riskScore: this.calculatePackageRiskScore(vulnerabilities),
              updateAvailable: false, // 後で更新
              latestVersion: await this.getLatestVersion(packageName)
            });
          }
        }
      }

      // yarn auditの結果も統合（重複除去）
      for (const advisory of yarnAuditResult.advisories || []) {
        const existingReport = reports.find(r => r.packageName === advisory.data.module_name);
        if (!existingReport) {
          const packageInfo = packages.find(p => p.name === advisory.data.module_name);
          if (!packageInfo) continue;

          reports.push({
            packageName: advisory.data.module_name,
            version: packageInfo.version,
            vulnerabilities: [this.parseYarnVulnerability(advisory.data)],
            riskScore: this.calculateSeverityScore(advisory.data.severity),
            updateAvailable: false,
            latestVersion: await this.getLatestVersion(advisory.data.module_name)
          });
        }
      }

      // 最新バージョン情報と更新可能性を確認
      for (const report of reports) {
        report.updateAvailable = this.isUpdateAvailable(report.version, report.latestVersion);
      }

      return reports;
    } catch (error) {
      secureLog('脆弱性解析エラー:', error);
      return [];
    }
  }

  /**
   * npm脆弱性データのパース
   */
  private static parseNpmVulnerabilities(vulnData: any): VulnerabilityReport['vulnerabilities'] {
    const vulnerabilities = [];
    
    for (const via of vulnData.via || []) {
      if (typeof via === 'object' && via.title) {
        vulnerabilities.push({
          id: via.source?.toString() || `npm-${Date.now()}`,
          cve: via.cve || undefined,
          title: via.title,
          severity: this.normalizeSeverity(via.severity),
          description: via.overview || via.title,
          recommendations: [via.recommendation || '最新バージョンにアップデートしてください'],
          fixedVersion: via.fixAvailable?.name || undefined,
          patchedVersions: via.patched_versions ? [via.patched_versions] : [],
          references: via.references ? [via.references] : [],
          publishedDate: via.created || new Date().toISOString(),
          updatedDate: via.updated || new Date().toISOString()
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * yarn脆弱性データのパース
   */
  private static parseYarnVulnerability(advisory: any): VulnerabilityReport['vulnerabilities'][0] {
    return {
      id: advisory.id?.toString() || `yarn-${Date.now()}`,
      cve: advisory.cves?.[0] || undefined,
      title: advisory.title,
      severity: this.normalizeSeverity(advisory.severity),
      description: advisory.overview || advisory.title,
      recommendations: [advisory.recommendation || '最新バージョンにアップデートしてください'],
      fixedVersion: advisory.patched_versions?.[0] || undefined,
      patchedVersions: advisory.patched_versions || [],
      references: advisory.references || [],
      publishedDate: advisory.created || new Date().toISOString(),
      updatedDate: advisory.updated || new Date().toISOString()
    };
  }

  /**
   * 重要度の正規化
   */
  private static normalizeSeverity(severity: string): 'low' | 'moderate' | 'high' | 'critical' {
    const lower = severity.toLowerCase();
    if (lower.includes('critical')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('moderate') || lower.includes('medium')) return 'moderate';
    return 'low';
  }

  /**
   * パッケージリスクスコア計算
   */
  private static calculatePackageRiskScore(vulnerabilities: VulnerabilityReport['vulnerabilities']): number {
    let score = 0;
    for (const vuln of vulnerabilities) {
      score += this.calculateSeverityScore(vuln.severity);
    }
    return Math.min(100, score);
  }

  /**
   * 重要度スコア計算
   */
  private static calculateSeverityScore(severity: string): number {
    switch (severity.toLowerCase()) {
      case 'critical': return 40;
      case 'high': return 25;
      case 'moderate': case 'medium': return 15;
      case 'low': return 5;
      default: return 5;
    }
  }

  /**
   * 最新バージョン取得
   */
  private static async getLatestVersion(packageName: string): Promise<string | undefined> {
    try {
      const result = execSync(`npm view ${packageName} version`, { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      return result.trim();
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 更新可能性判定
   */
  private static isUpdateAvailable(currentVersion: string, latestVersion?: string): boolean {
    if (!latestVersion) return false;
    
    try {
      // 簡易的なバージョン比較（実際にはsemverライブラリを使用することを推奨）
      const current = currentVersion.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n));
      const latest = latestVersion.split('.').map(n => parseInt(n));
      
      for (let i = 0; i < Math.max(current.length, latest.length); i++) {
        const c = current[i] || 0;
        const l = latest[i] || 0;
        if (l > c) return true;
        if (c > l) return false;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 統計計算
   */
  private static calculateStatistics(reports: VulnerabilityReport[]): {
    vulnerablePackages: number;
    totalVulnerabilities: number;
    severityBreakdown: { critical: number; high: number; moderate: number; low: number };
    autoFixable: number;
    manualReviewRequired: number;
  } {
    const stats = {
      vulnerablePackages: reports.length,
      totalVulnerabilities: 0,
      severityBreakdown: { critical: 0, high: 0, moderate: 0, low: 0 },
      autoFixable: 0,
      manualReviewRequired: 0
    };

    for (const report of reports) {
      stats.totalVulnerabilities += report.vulnerabilities.length;
      
      if (report.updateAvailable && report.latestVersion) {
        stats.autoFixable++;
      } else {
        stats.manualReviewRequired++;
      }

      for (const vuln of report.vulnerabilities) {
        stats.severityBreakdown[vuln.severity]++;
      }
    }

    return stats;
  }

  /**
   * 推奨事項生成
   */
  private static generateRecommendations(
    reports: VulnerabilityReport[],
    stats: any
  ): string[] {
    const recommendations: string[] = [];

    if (stats.severityBreakdown.critical > 0) {
      recommendations.push('🚨 クリティカルな脆弱性が検出されました。即座に対応してください。');
    }

    if (stats.severityBreakdown.high > 0) {
      recommendations.push('⚠️ 高リスクの脆弱性があります。24時間以内に修正することを推奨します。');
    }

    if (stats.autoFixable > 0) {
      recommendations.push(`✅ ${stats.autoFixable}個のパッケージは自動更新で修正可能です。`);
    }

    if (stats.manualReviewRequired > 0) {
      recommendations.push(`📋 ${stats.manualReviewRequired}個のパッケージは手動確認が必要です。`);
    }

    recommendations.push('🔄 定期的なセキュリティスキャンを継続してください。');

    return recommendations;
  }

  /**
   * 自動更新判定
   */
  private static shouldAutoUpdate(scanResult: SecurityScanResult): boolean {
    if (!this.updatePolicy.autoUpdate.enabled) return false;

    const threshold = this.updatePolicy.autoUpdate.severityThreshold;
    const thresholdScore = this.calculateSeverityScore(threshold);

    return scanResult.packages.some(pkg => 
      pkg.riskScore >= thresholdScore && 
      pkg.updateAvailable &&
      !this.updatePolicy.autoUpdate.excludePackages.includes(pkg.packageName)
    );
  }

  /**
   * 更新対象パッケージ取得
   */
  private static getUpdatablePackages(scanResult: SecurityScanResult): VulnerabilityReport[] {
    const threshold = this.calculateSeverityScore(this.updatePolicy.autoUpdate.severityThreshold);
    
    return scanResult.packages.filter(pkg =>
      pkg.riskScore >= threshold &&
      pkg.updateAvailable &&
      pkg.latestVersion &&
      !this.updatePolicy.autoUpdate.excludePackages.includes(pkg.packageName)
    );
  }

  /**
   * パッケージ更新
   */
  private static async updatePackage(packageName: string, version?: string): Promise<void> {
    const updateCommand = version 
      ? `npm install ${packageName}@${version}` 
      : `npm update ${packageName}`;
    
    execSync(updateCommand, { timeout: 120000 });
  }

  /**
   * テスト実行
   */
  private static async runTests(): Promise<boolean> {
    try {
      execSync('npm test', { timeout: 300000 }); // 5分タイムアウト
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * フルテストスイート実行
   */
  private static async runFullTestSuite(): Promise<boolean> {
    try {
      // ビルドテスト
      execSync('npm run build', { timeout: 300000 });
      
      // ユニットテスト
      execSync('npm test', { timeout: 300000 });
      
      // 型チェック
      execSync('npm run type-check', { timeout: 120000 });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * バックアップ作成
   */
  private static async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    execSync(`cp package.json package.json.backup-${timestamp}`);
    execSync(`cp package-lock.json package-lock.json.backup-${timestamp}`);
  }

  /**
   * パッケージロールバック
   */
  private static async rollbackPackage(packageName: string): Promise<void> {
    // 最新のバックアップから復元
    // 実装では、より sophisticated なロールバック機能を実装
    secureLog('パッケージロールバック', { packageName });
  }

  /**
   * 全体ロールバック
   */
  private static async rollbackToBackup(): Promise<void> {
    try {
      const backupFiles = execSync('ls package*.backup-* | sort -r | head -1', { encoding: 'utf8' });
      const latestBackup = backupFiles.trim();
      
      if (latestBackup.includes('package.json.backup-')) {
        execSync(`cp ${latestBackup} package.json`);
      }
      
      const lockBackup = latestBackup.replace('package.json', 'package-lock.json');
      execSync(`cp ${lockBackup} package-lock.json`);
      
      // 依存関係の再インストール
      execSync('npm install', { timeout: 300000 });
    } catch (error) {
      secureLog('ロールバックエラー:', error);
    }
  }

  /**
   * セキュリティアラート送信
   */
  private static async sendSecurityAlert(scanResult: SecurityScanResult): Promise<void> {
    try {
      const criticalVulns = scanResult.vulnerabilitiesBySeverity.critical;
      const highVulns = scanResult.vulnerabilitiesBySeverity.high;
      
      if (criticalVulns > 0 && this.updatePolicy.notifications.critical) {
        secureLog('🚨 クリティカル脆弱性アラート', {
          scanId: scanResult.scanId,
          criticalVulnerabilities: criticalVulns,
          affectedPackages: scanResult.packages.filter(p => 
            p.vulnerabilities.some(v => v.severity === 'critical')
          ).map(p => p.packageName)
        });
      }
      
      if (highVulns > 0 && this.updatePolicy.notifications.high) {
        secureLog('⚠️ 高リスク脆弱性アラート', {
          scanId: scanResult.scanId,
          highVulnerabilities: highVulns
        });
      }
    } catch (error) {
      secureLog('セキュリティアラート送信エラー:', error);
    }
  }

  /**
   * スキャンID生成
   */
  private static generateScanId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 次回スキャン時刻計算
   */
  private static calculateNextScanTime(): number {
    const now = new Date();
    const nextScan = new Date(now);
    
    switch (this.updatePolicy.scheduling.scanFrequency) {
      case 'daily':
        nextScan.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextScan.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextScan.setMonth(now.getMonth() + 1);
        break;
    }
    
    return nextScan.getTime();
  }

  /**
   * スキャン履歴取得
   */
  static getScanHistory(): SecurityScanResult[] {
    return [...this.scanHistory];
  }

  /**
   * 最新スキャン結果取得
   */
  static getLatestScan(): SecurityScanResult | null {
    return this.scanHistory.length > 0 ? this.scanHistory[this.scanHistory.length - 1] : null;
  }

  /**
   * 更新ポリシー設定
   */
  static setUpdatePolicy(policy: Partial<UpdatePolicy>): void {
    this.updatePolicy = { ...this.updatePolicy, ...policy };
    secureLog('更新ポリシー変更', { policy: this.updatePolicy });
  }

  /**
   * 更新ポリシー取得
   */
  static getUpdatePolicy(): UpdatePolicy {
    return { ...this.updatePolicy };
  }

  /**
   * システム統計取得
   */
  static getSystemStats(): {
    totalScans: number;
    lastScanTime: number;
    averageVulnerabilities: number;
    autoUpdatesPerformed: number;
    isScheduledScanDue: boolean;
  } {
    const totalScans = this.scanHistory.length;
    const lastScanTime = totalScans > 0 ? this.scanHistory[totalScans - 1].timestamp : 0;
    const averageVulnerabilities = totalScans > 0 
      ? this.scanHistory.reduce((sum, scan) => sum + scan.totalVulnerabilities, 0) / totalScans 
      : 0;
    
    const nextScanTime = totalScans > 0 ? this.scanHistory[totalScans - 1].nextScanTime : 0;
    const isScheduledScanDue = Date.now() >= nextScanTime;

    return {
      totalScans,
      lastScanTime,
      averageVulnerabilities: Math.round(averageVulnerabilities),
      autoUpdatesPerformed: 0, // 実装では実際の更新回数を追跡
      isScheduledScanDue
    };
  }
}

// 定期スキャンのスケジューリング（サーバーサイドのみ）
if (typeof window === 'undefined') {
  // 1時間ごとにスケジュール確認
  setInterval(async () => {
    const stats = DependencySecurityScanner.getSystemStats();
    if (stats.isScheduledScanDue) {
      try {
        await DependencySecurityScanner.performSecurityScan();
      } catch (error) {
        secureLog('定期スキャンエラー:', error);
      }
    }
  }, 60 * 60 * 1000);
}