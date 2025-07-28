import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger.config';
import chalk from 'chalk';

interface RateLimitStatus {
  phone_number?: string;
  ip_address?: string;
  fingerprint?: string;
  request_count: number;
  window_start: Date;
  window_end: Date;
  remaining_quota: number;
  is_blocked: boolean;
  risk_score: number;
  flags: string[];
}

interface OTPStatus {
  phone_number: string;
  otp_code: string;
  created_at: Date;
  expires_at: Date;
  ttl_seconds: number;
  is_used: boolean;
  attempts: number;
}

export class RateLimitMonitor {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 現在のレート制限状況を取得
   */
  async getRateLimitStatus(identifier: string, type: 'phone' | 'ip' | 'fingerprint'): Promise<RateLimitStatus | null> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1時間前

      let query = this.supabase
        .from('sms_verifications')
        .select('*')
        .gte('created_at', windowStart.toISOString());

      switch (type) {
        case 'phone':
          query = query.eq('phone_number', identifier);
          break;
        case 'ip':
          query = query.eq('request_ip', identifier);
          break;
        case 'fingerprint':
          query = query.eq('device_fingerprint', identifier);
          break;
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch rate limit status', { error, identifier, type });
        return null;
      }

      const requestCount = data?.length || 0;
      const limit = type === 'phone' ? 3 : type === 'ip' ? 10 : 5;
      const remainingQuota = Math.max(0, limit - requestCount);
      const isBlocked = remainingQuota === 0;

      // リスクスコア計算
      let riskScore = 0;
      const flags: string[] = [];

      if (requestCount >= limit) {
        riskScore += 50;
        flags.push(`${type.toUpperCase()}_RATE_LIMIT`);
      }

      return {
        [`${type}_${type === 'ip' ? 'address' : 'number'}`]: identifier,
        request_count: requestCount,
        window_start: windowStart,
        window_end: now,
        remaining_quota: remainingQuota,
        is_blocked: isBlocked,
        risk_score: riskScore,
        flags
      } as RateLimitStatus;
    } catch (error) {
      logger.error('Rate limit status check failed', { error, identifier, type });
      return null;
    }
  }

  /**
   * OTPのTTL状況を確認
   */
  async getOTPStatus(phoneNumber: string): Promise<OTPStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('sms_verifications')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      const createdAt = new Date(data.created_at);
      const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5分後
      const now = new Date();
      const ttlSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

      return {
        phone_number: data.phone_number,
        otp_code: data.verification_code,
        created_at: createdAt,
        expires_at: expiresAt,
        ttl_seconds: ttlSeconds,
        is_used: data.is_verified,
        attempts: data.attempts || 0
      };
    } catch (error) {
      logger.error('OTP status check failed', { error, phoneNumber });
      return null;
    }
  }

  /**
   * 異常検知ログを取得
   */
  async getAnomalyLogs(hours: number = 24): Promise<any[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // 複数の異常パターンを検出
      const queries = [
        // 同一IPから多数の送信
        this.supabase
          .from('sms_verifications')
          .select('request_ip, count')
          .gte('created_at', since.toISOString())
          .group('request_ip')
          .having('count', 'gte', 20),

        // 同一電話番号への頻繁なリクエスト
        this.supabase
          .from('sms_verifications')
          .select('phone_number, count')
          .gte('created_at', since.toISOString())
          .group('phone_number')
          .having('count', 'gte', 10),

        // 短時間での大量リクエスト（5分で50件以上）
        this.supabase
          .from('sms_verifications')
          .select('*')
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      ];

      const results = await Promise.all(queries.map(q => q.then(r => r.data).catch(() => [])));
      
      const anomalies = [];
      
      // IP異常
      if (results[0]?.length) {
        anomalies.push(...results[0].map(item => ({
          type: 'HIGH_VOLUME_IP',
          identifier: item.request_ip,
          count: item.count,
          severity: item.count > 50 ? 'CRITICAL' : 'HIGH'
        })));
      }

      // 電話番号異常
      if (results[1]?.length) {
        anomalies.push(...results[1].map(item => ({
          type: 'FREQUENT_PHONE_REQUESTS',
          identifier: item.phone_number,
          count: item.count,
          severity: item.count > 20 ? 'CRITICAL' : 'HIGH'
        })));
      }

      // バーストトラフィック
      if (results[2]?.length > 50) {
        anomalies.push({
          type: 'BURST_TRAFFIC',
          count: results[2].length,
          severity: 'CRITICAL',
          timeframe: '5_minutes'
        });
      }

      return anomalies;
    } catch (error) {
      logger.error('Anomaly detection failed', { error });
      return [];
    }
  }

  /**
   * コンソール表示用のサマリー
   */
  async displayDashboard(): Promise<void> {
    console.clear();
    console.log(chalk.cyan.bold('\n=== Rate Limit Monitor Dashboard ===\n'));

    // 現在のレート制限状況
    const { data: recentRequests } = await this.supabase
      .from('sms_verifications')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentRequests?.length) {
      console.log(chalk.yellow('Recent Requests:'));
      recentRequests.forEach((req: any) => {
        const status = req.is_verified ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${status} ${req.phone_number} | ${req.request_ip} | ${new Date(req.created_at).toLocaleString()}`);
      });
    }

    // 異常検知
    const anomalies = await this.getAnomalyLogs(1);
    if (anomalies.length > 0) {
      console.log(chalk.red.bold('\n⚠️  Anomalies Detected:'));
      anomalies.forEach(anomaly => {
        const severityColor = anomaly.severity === 'CRITICAL' ? chalk.red : chalk.yellow;
        console.log(`  ${severityColor(`[${anomaly.severity}]`)} ${anomaly.type}: ${anomaly.identifier || ''} (${anomaly.count} occurrences)`);
      });
    } else {
      console.log(chalk.green('\n✓ No anomalies detected'));
    }

    // 統計情報
    const stats = await this.getStatistics();
    console.log(chalk.cyan('\nStatistics (Last 24h):'));
    console.log(`  Total Requests: ${stats.totalRequests}`);
    console.log(`  Success Rate: ${stats.successRate}%`);
    console.log(`  Unique IPs: ${stats.uniqueIPs}`);
    console.log(`  Unique Phones: ${stats.uniquePhones}`);
  }

  /**
   * 統計情報の取得
   */
  private async getStatistics(): Promise<any> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data } = await this.supabase
      .from('sms_verifications')
      .select('*')
      .gte('created_at', since.toISOString());

    if (!data) return { totalRequests: 0, successRate: 0, uniqueIPs: 0, uniquePhones: 0 };

    const verified = data.filter((d: any) => d.is_verified).length;
    const uniqueIPs = new Set(data.map((d: any) => d.request_ip)).size;
    const uniquePhones = new Set(data.map((d: any) => d.phone_number)).size;

    return {
      totalRequests: data.length,
      successRate: data.length ? Math.round((verified / data.length) * 100) : 0,
      uniqueIPs,
      uniquePhones
    };
  }

  /**
   * クリーンアップ（期限切れOTPの削除）
   */
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('sms_verifications')
        .delete()
        .lt('created_at', fiveMinutesAgo.toISOString())
        .eq('is_verified', false)
        .select();

      if (error) {
        logger.error('OTP cleanup failed', { error });
        return 0;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        logger.info('Expired OTPs cleaned up', { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('OTP cleanup error', { error });
      return 0;
    }
  }
}

// CLI コマンド用のエクスポート
export async function runMonitorCLI(command: string, args: string[]): Promise<void> {
  const monitor = new RateLimitMonitor(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (command) {
    case 'status':
      const [type, identifier] = args;
      if (type && identifier) {
        const status = await monitor.getRateLimitStatus(identifier, type as any);
        console.log(JSON.stringify(status, null, 2));
      }
      break;

    case 'otp':
      const [phoneNumber] = args;
      if (phoneNumber) {
        const otpStatus = await monitor.getOTPStatus(phoneNumber);
        console.log(JSON.stringify(otpStatus, null, 2));
      }
      break;

    case 'anomalies':
      const hours = parseInt(args[0]) || 24;
      const anomalies = await monitor.getAnomalyLogs(hours);
      console.log(JSON.stringify(anomalies, null, 2));
      break;

    case 'dashboard':
      await monitor.displayDashboard();
      break;

    case 'cleanup':
      const deleted = await monitor.cleanupExpiredOTPs();
      console.log(`Cleaned up ${deleted} expired OTPs`);
      break;

    default:
      console.log('Usage: monitor <command> [args]');
      console.log('Commands:');
      console.log('  status <phone|ip|fingerprint> <identifier>');
      console.log('  otp <phone_number>');
      console.log('  anomalies [hours]');
      console.log('  dashboard');
      console.log('  cleanup');
  }
}