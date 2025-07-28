import { Request } from 'express';
import crypto from 'crypto';

interface IPAnalysis {
  ip: string;
  realIP: string;
  country?: string;
  isProxy: boolean;
  isTor: boolean;
  isVPN: boolean;
  riskScore: number;
  fingerprint: string;
}

export class IPAnalyzer {
  private readonly torExitNodes: Set<string> = new Set();
  private readonly knownProxies: Set<string> = new Set();
  private readonly trustedProxies: string[] = [];
  
  constructor() {
    // 信頼できるプロキシ（Cloudflare、Vercelなど）
    this.trustedProxies = [
      '173.245.48.0/20',
      '103.21.244.0/22',
      '103.22.200.0/22',
      '103.31.4.0/22',
      '141.101.64.0/18',
      '108.162.192.0/18',
      '190.93.240.0/20',
      '188.114.96.0/20',
      '197.234.240.0/22',
      '198.41.128.0/17',
      '162.158.0.0/15',
      '104.16.0.0/13',
      '104.24.0.0/14',
      '172.64.0.0/13',
      '131.0.72.0/22'
    ];
  }
  
  // 実際のIPアドレスを取得
  getRealIP(req: Request): string {
    // 優先順位に従ってIPを取得
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    const trueClientIP = req.headers['true-client-ip'];
    
    if (cfConnectingIP && typeof cfConnectingIP === 'string') {
      return cfConnectingIP;
    }
    
    if (trueClientIP && typeof trueClientIP === 'string') {
      return trueClientIP;
    }
    
    if (forwardedFor && typeof forwardedFor === 'string') {
      // カンマ区切りの最初のIPを取得
      return forwardedFor.split(',')[0].trim();
    }
    
    if (realIP && typeof realIP === 'string') {
      return realIP;
    }
    
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
  
  // IPアドレスの分析
  async analyze(req: Request): Promise<IPAnalysis> {
    const ip = this.getRealIP(req);
    const fingerprint = this.generateFingerprint(req);
    
    const analysis: IPAnalysis = {
      ip: req.ip,
      realIP: ip,
      isProxy: await this.isProxy(ip),
      isTor: await this.isTorExitNode(ip),
      isVPN: await this.isVPN(ip),
      riskScore: 0,
      fingerprint
    };
    
    // リスクスコアの計算
    analysis.riskScore = this.calculateRiskScore(analysis);
    
    return analysis;
  }
  
  // デバイスフィンガープリントの生成
  private generateFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.headers['accept'] || '',
      req.headers['dnt'] || '',
      req.headers['connection'] || '',
      req.headers['sec-ch-ua'] || '',
      req.headers['sec-ch-ua-mobile'] || '',
      req.headers['sec-ch-ua-platform'] || ''
    ];
    
    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 32);
  }
  
  // プロキシ検出
  private async isProxy(ip: string): Promise<boolean> {
    // ヘッダーベースの検出
    const proxyHeaders = [
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'forwarded',
      'via',
      'x-proxy-id',
      'x-real-ip'
    ];
    
    // 既知のプロキシIPチェック
    if (this.knownProxies.has(ip)) {
      return true;
    }
    
    // データセンターIPレンジのチェック（簡易版）
    const datacenterRanges = [
      '192.168.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.'
    ];
    
    return datacenterRanges.some(range => ip.startsWith(range));
  }
  
  // Tor出口ノード検出
  private async isTorExitNode(ip: string): Promise<boolean> {
    // 実際の実装では、Tor出口ノードリストを定期的に更新する必要があります
    // https://check.torproject.org/torbulkexitlist
    return this.torExitNodes.has(ip);
  }
  
  // VPN検出
  private async isVPN(ip: string): Promise<boolean> {
    // 簡易的なVPN検出
    // 実際の実装では、VPN検出APIを使用することを推奨
    const vpnPorts = ['1194', '1723', '500', '4500'];
    
    // ヘッダーベースの検出
    // VPNは特定のヘッダーパターンを持つことがある
    return false; // 簡易実装
  }
  
  // リスクスコアの計算（0-100）
  private calculateRiskScore(analysis: Partial<IPAnalysis>): number {
    let score = 0;
    
    if (analysis.isProxy) score += 30;
    if (analysis.isTor) score += 50;
    if (analysis.isVPN) score += 20;
    
    // 国別リスク（必要に応じて実装）
    // if (analysis.country && HIGH_RISK_COUNTRIES.includes(analysis.country)) {
    //   score += 20;
    // }
    
    return Math.min(score, 100);
  }
  
  // IPアドレスのレピュテーションチェック
  async checkReputation(ip: string): Promise<{
    reputation: 'good' | 'suspicious' | 'bad';
    reason?: string;
  }> {
    // 内部IPは信頼
    if (this.isPrivateIP(ip)) {
      return { reputation: 'good', reason: 'Private IP' };
    }
    
    // Torノード
    if (await this.isTorExitNode(ip)) {
      return { reputation: 'bad', reason: 'Tor exit node' };
    }
    
    // その他のチェック
    const analysis = await this.analyze({ ip } as Request);
    
    if (analysis.riskScore >= 70) {
      return { reputation: 'bad', reason: 'High risk score' };
    } else if (analysis.riskScore >= 30) {
      return { reputation: 'suspicious', reason: 'Medium risk score' };
    }
    
    return { reputation: 'good' };
  }
  
  // プライベートIPかどうか
  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    // 10.0.0.0 - 10.255.255.255
    if (first === 10) return true;
    
    // 172.16.0.0 - 172.31.255.255
    if (first === 172 && second >= 16 && second <= 31) return true;
    
    // 192.168.0.0 - 192.168.255.255
    if (first === 192 && second === 168) return true;
    
    // 127.0.0.0 - 127.255.255.255 (localhost)
    if (first === 127) return true;
    
    return false;
  }
  
  // IP範囲のチェック
  isInRange(ip: string, range: string): boolean {
    const [rangeIP, bits] = range.split('/');
    if (!bits) return ip === rangeIP;
    
    const ipInt = this.ipToInt(ip);
    const rangeInt = this.ipToInt(rangeIP);
    const mask = (-1 << (32 - parseInt(bits))) >>> 0;
    
    return (ipInt & mask) === (rangeInt & mask);
  }
  
  // IPアドレスを整数に変換
  private ipToInt(ip: string): number {
    const parts = ip.split('.');
    return parts.reduce((acc, part, i) => {
      return acc + (parseInt(part) << (8 * (3 - i)));
    }, 0) >>> 0;
  }
}

// シングルトンインスタンス
export const ipAnalyzer = new IPAnalyzer();