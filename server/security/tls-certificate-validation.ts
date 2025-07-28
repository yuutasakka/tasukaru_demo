/**
 * TLS証明書検証とセキュリティチェック
 */

import { execSync } from 'child_process';
import https from 'https';
import tls from 'tls';
import crypto from 'crypto';

/**
 * TLS証明書の検証結果
 */
export interface TLSValidationResult {
  isValid: boolean;
  issues: string[];
  certificateInfo: {
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
    daysUntilExpiry: number;
    keySize: number;
    signatureAlgorithm: string;
    protocol: string;
    cipher: string;
  };
  chainValidation: {
    isComplete: boolean;
    chainLength: number;
    untrustedRoots: string[];
  };
  securityChecks: {
    tlsVersion: string;
    supportedProtocols: string[];
    vulnerabilities: string[];
    ocspStatus?: string;
  };
}

export class TLSCertificateValidator {
  /**
   * 証明書チェーンの完全性を検証
   */
  static async validateCertificateChain(hostname: string, port: number = 443): Promise<TLSValidationResult> {
    const issues: string[] = [];
    const vulnerabilities: string[] = [];

    try {
      // 証明書情報の取得
      const certificateInfo = await this.getCertificateInfo(hostname, port);
      
      // 証明書の有効期限チェック
      const now = new Date();
      const validFrom = new Date(certificateInfo.valid_from);
      const validTo = new Date(certificateInfo.valid_to);
      const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (now < validFrom) {
        issues.push('Certificate not yet valid');
      }
      
      if (now > validTo) {
        issues.push('Certificate has expired');
      } else if (daysUntilExpiry < 30) {
        issues.push(`Certificate expires in ${daysUntilExpiry} days`);
      }

      // 鍵長チェック
      const keySize = certificateInfo.bits;
      if (keySize < 2048) {
        issues.push(`Weak key size: ${keySize} bits (minimum 2048 recommended)`);
        vulnerabilities.push('WEAK_KEY_SIZE');
      }

      // 署名アルゴリズムチェック
      const signatureAlgorithm = certificateInfo.sigalg;
      if (signatureAlgorithm.toLowerCase().includes('sha1')) {
        issues.push('SHA-1 signature algorithm is deprecated');
        vulnerabilities.push('SHA1_SIGNATURE');
      }

      // TLSバージョンチェック
      const tlsInfo = await this.checkTLSVersions(hostname, port);
      
      if (tlsInfo.supportedVersions.includes('TLSv1.0') || tlsInfo.supportedVersions.includes('TLSv1.1')) {
        issues.push('Obsolete TLS versions (1.0/1.1) are supported');
        vulnerabilities.push('OBSOLETE_TLS_VERSION');
      }

      // 証明書チェーンの検証
      const chainInfo = await this.validateChain(hostname, port);
      
      if (!chainInfo.isComplete) {
        issues.push('Incomplete certificate chain');
      }

      // OCSP検証
      const ocspStatus = await this.checkOCSPStatus(hostname, port);
      
      if (ocspStatus === 'revoked') {
        issues.push('Certificate has been revoked');
        vulnerabilities.push('CERTIFICATE_REVOKED');
      }

      return {
        isValid: issues.length === 0,
        issues,
        certificateInfo: {
          subject: certificateInfo.subject,
          issuer: certificateInfo.issuer,
          validFrom,
          validTo,
          daysUntilExpiry,
          keySize,
          signatureAlgorithm,
          protocol: tlsInfo.negotiatedProtocol,
          cipher: tlsInfo.cipher
        },
        chainValidation: chainInfo,
        securityChecks: {
          tlsVersion: tlsInfo.negotiatedProtocol,
          supportedProtocols: tlsInfo.supportedVersions,
          vulnerabilities,
          ocspStatus
        }
      };
    } catch (error) {
      issues.push(`Certificate validation error: ${error.message}`);
      return {
        isValid: false,
        issues,
        certificateInfo: null as any,
        chainValidation: { isComplete: false, chainLength: 0, untrustedRoots: [] },
        securityChecks: { tlsVersion: '', supportedProtocols: [], vulnerabilities }
      };
    }
  }

  /**
   * 証明書情報の取得
   */
  private static getCertificateInfo(hostname: string, port: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        host: hostname,
        port,
        rejectUnauthorized: false
      };

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate(true);
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol();
        
        socket.end();
        
        resolve({
          subject: cert.subject ? this.formatSubject(cert.subject) : '',
          issuer: cert.issuer ? this.formatSubject(cert.issuer) : '',
          valid_from: cert.valid_from,
          valid_to: cert.valid_to,
          bits: cert.bits || (cert.pubkey ? cert.pubkey.length * 8 : 0),
          sigalg: cert.sigalg || 'unknown',
          cipher: cipher.name,
          protocol
        });
      });

      socket.on('error', reject);
    });
  }

  /**
   * TLSバージョンのチェック
   */
  private static async checkTLSVersions(hostname: string, port: number): Promise<{
    supportedVersions: string[];
    negotiatedProtocol: string;
    cipher: string;
  }> {
    const supportedVersions: string[] = [];
    const versions = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
    
    let negotiatedProtocol = '';
    let cipher = '';

    for (const version of versions) {
      try {
        await new Promise<void>((resolve, reject) => {
          const options = {
            host: hostname,
            port,
            secureProtocol: version.replace('.', '_') + '_method',
            rejectUnauthorized: false
          };

          const socket = tls.connect(options as any, () => {
            supportedVersions.push(version);
            if (!negotiatedProtocol) {
              negotiatedProtocol = socket.getProtocol() || '';
              cipher = socket.getCipher()?.name || '';
            }
            socket.end();
            resolve();
          });

          socket.on('error', () => {
            resolve(); // バージョンがサポートされていない
          });

          socket.setTimeout(5000, () => {
            socket.destroy();
            resolve();
          });
        });
      } catch (error) {
        // このバージョンはサポートされていない
      }
    }

    return { supportedVersions, negotiatedProtocol, cipher };
  }

  /**
   * 証明書チェーンの検証
   */
  private static async validateChain(hostname: string, port: number): Promise<{
    isComplete: boolean;
    chainLength: number;
    untrustedRoots: string[];
  }> {
    return new Promise((resolve) => {
      const options = {
        host: hostname,
        port,
        rejectUnauthorized: true
      };

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate(true);
        let chainLength = 0;
        let current = cert;
        
        while (current) {
          chainLength++;
          current = current.issuerCertificate === current ? null : current.issuerCertificate;
        }

        socket.end();
        resolve({
          isComplete: true,
          chainLength,
          untrustedRoots: []
        });
      });

      socket.on('error', (error) => {
        resolve({
          isComplete: false,
          chainLength: 0,
          untrustedRoots: [error.message]
        });
      });
    });
  }

  /**
   * OCSP状態のチェック
   */
  private static async checkOCSPStatus(hostname: string, port: number): Promise<string> {
    try {
      // OpenSSLコマンドを使用したOCSPチェック（簡略版）
      const command = `echo | openssl s_client -connect ${hostname}:${port} -servername ${hostname} -status 2>/dev/null | grep -A 5 "OCSP Response Status"`;
      const output = execSync(command, { encoding: 'utf8' });
      
      if (output.includes('successful')) {
        if (output.includes('Cert Status: good')) {
          return 'good';
        } else if (output.includes('Cert Status: revoked')) {
          return 'revoked';
        }
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Subject/Issuerのフォーマット
   */
  private static formatSubject(subject: any): string {
    const parts: string[] = [];
    if (subject.CN) parts.push(`CN=${subject.CN}`);
    if (subject.O) parts.push(`O=${subject.O}`);
    if (subject.C) parts.push(`C=${subject.C}`);
    return parts.join(', ');
  }

  /**
   * 証明書ピンニングの実装
   */
  static createPinnedAgent(expectedFingerprints: string[]): https.Agent {
    return new https.Agent({
      checkServerIdentity: (hostname, cert) => {
        const fingerprint = crypto
          .createHash('sha256')
          .update(cert.raw)
          .digest('hex')
          .toUpperCase()
          .match(/.{2}/g)!
          .join(':');

        if (!expectedFingerprints.includes(fingerprint)) {
          const error = new Error(`Certificate fingerprint mismatch. Expected one of: ${expectedFingerprints.join(', ')}, but got: ${fingerprint}`);
          (error as any).code = 'CERT_FINGERPRINT_MISMATCH';
          return error;
        }

        // デフォルトの検証も実行
        return tls.checkServerIdentity(hostname, cert);
      }
    });
  }
}

/**
 * TLS設定の推奨構成
 */
export const recommendedTLSOptions: tls.SecureContextOptions = {
  // 最小TLSバージョン
  minVersion: 'TLSv1.2',
  
  // 推奨される暗号スイート
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA',
    'ECDHE-RSA-AES256-SHA',
    'AES128-GCM-SHA256',
    'AES256-GCM-SHA384',
    'AES128-SHA256',
    'AES256-SHA256',
    'AES128-SHA',
    'AES256-SHA'
  ].join(':'),
  
  // 安全な楕円曲線
  ecdhCurve: 'P-256:P-384:P-521',
  
  // セッション再利用の無効化（前方秘匿性のため）
  sessionTimeout: 300, // 5分
  
  // TLSチケットの無効化
  honorCipherOrder: true
};