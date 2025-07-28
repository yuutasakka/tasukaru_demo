#!/usr/bin/env node

import { program } from 'commander';
import { RateLimitMonitor } from './rate-limit-monitor';
import chalk from 'chalk';
import Table from 'cli-table3';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

const monitor = new RateLimitMonitor(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

program
  .name('monitor')
  .description('Rate limit and security monitoring CLI')
  .version('1.0.0');

// レート制限ステータスチェック
program
  .command('status <type> <identifier>')
  .description('Check rate limit status for phone/ip/fingerprint')
  .action(async (type: string, identifier: string) => {
    if (!['phone', 'ip', 'fingerprint'].includes(type)) {
      console.error(chalk.red('Type must be one of: phone, ip, fingerprint'));
      process.exit(1);
    }

    const status = await monitor.getRateLimitStatus(identifier, type as any);
    
    if (!status) {
      console.log(chalk.yellow('No data found'));
      return;
    }

    const table = new Table({
      head: ['Property', 'Value'],
      colWidths: [30, 50]
    });

    table.push(
      ['Identifier', identifier],
      ['Type', type],
      ['Request Count', status.request_count],
      ['Remaining Quota', status.remaining_quota],
      ['Is Blocked', status.is_blocked ? chalk.red('YES') : chalk.green('NO')],
      ['Risk Score', status.risk_score],
      ['Flags', status.flags.join(', ') || 'None'],
      ['Window Start', status.window_start.toLocaleString()],
      ['Window End', status.window_end.toLocaleString()]
    );

    console.log(table.toString());
  });

// OTP TTLチェック
program
  .command('otp <phoneNumber>')
  .description('Check OTP status and TTL')
  .action(async (phoneNumber: string) => {
    const status = await monitor.getOTPStatus(phoneNumber);
    
    if (!status) {
      console.log(chalk.yellow('No active OTP found'));
      return;
    }

    const table = new Table({
      head: ['Property', 'Value'],
      colWidths: [30, 50]
    });

    const ttlColor = status.ttl_seconds < 60 ? chalk.red : 
                     status.ttl_seconds < 180 ? chalk.yellow : 
                     chalk.green;

    table.push(
      ['Phone Number', status.phone_number],
      ['OTP Code', status.otp_code],
      ['Created At', status.created_at.toLocaleString()],
      ['Expires At', status.expires_at.toLocaleString()],
      ['TTL (seconds)', ttlColor(status.ttl_seconds.toString())],
      ['Is Used', status.is_used ? 'YES' : 'NO'],
      ['Attempts', status.attempts]
    );

    console.log(table.toString());
  });

// 異常検知
program
  .command('anomalies')
  .description('Show anomaly detection results')
  .option('-h, --hours <number>', 'Number of hours to look back', '24')
  .action(async (options) => {
    const hours = parseInt(options.hours);
    const anomalies = await monitor.getAnomalyLogs(hours);

    if (anomalies.length === 0) {
      console.log(chalk.green('✓ No anomalies detected'));
      return;
    }

    const table = new Table({
      head: ['Type', 'Identifier', 'Count', 'Severity'],
      colWidths: [30, 40, 15, 15]
    });

    anomalies.forEach(anomaly => {
      const severityColor = anomaly.severity === 'CRITICAL' ? chalk.red :
                           anomaly.severity === 'HIGH' ? chalk.yellow :
                           chalk.white;

      table.push([
        anomaly.type,
        anomaly.identifier || 'N/A',
        anomaly.count,
        severityColor(anomaly.severity)
      ]);
    });

    console.log(chalk.red.bold(`\n⚠️  ${anomalies.length} anomalies detected in the last ${hours} hours:\n`));
    console.log(table.toString());
  });

// ダッシュボード
program
  .command('dashboard')
  .description('Show real-time monitoring dashboard')
  .action(async () => {
    await monitor.displayDashboard();
  });

// クリーンアップ
program
  .command('cleanup')
  .description('Clean up expired OTPs')
  .action(async () => {
    const deleted = await monitor.cleanupExpiredOTPs();
    console.log(chalk.green(`✓ Cleaned up ${deleted} expired OTPs`));
  });

// ホワイトリスト管理
program
  .command('whitelist <action> [identifier]')
  .description('Manage rate limit whitelist (add/remove/list)')
  .option('-t, --type <type>', 'Identifier type (phone/ip)', 'phone')
  .option('-r, --reason <reason>', 'Reason for whitelisting')
  .option('-e, --expires <hours>', 'Expiration in hours')
  .action(async (action: string, identifier?: string, options?: any) => {
    // ホワイトリスト実装（要Supabase拡張）
    console.log(chalk.yellow('Whitelist management requires database extension'));
  });

// ライブモニタリング
program
  .command('watch')
  .description('Watch rate limits in real-time')
  .option('-i, --interval <seconds>', 'Refresh interval', '5')
  .action(async (options) => {
    const interval = parseInt(options.interval) * 1000;
    
    console.log(chalk.cyan('Starting live monitoring... (Press Ctrl+C to stop)'));
    
    setInterval(async () => {
      console.clear();
      await monitor.displayDashboard();
    }, interval);
  });

// エクスポート
program
  .command('export')
  .description('Export logs and statistics')
  .option('-f, --format <format>', 'Output format (json/csv)', 'json')
  .option('-o, --output <file>', 'Output file')
  .action(async (options) => {
    // 統計データの取得とエクスポート
    console.log(chalk.yellow('Export functionality coming soon'));
  });

program.parse();