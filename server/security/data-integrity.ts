/**
 * データ整合性検証とハッシュ署名
 */

import crypto from 'crypto';
import { createHash, createHmac } from 'crypto';

/**
 * データ整合性検証クラス
 */
export class DataIntegrityVerifier {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.INTEGRITY_SECRET || crypto.randomBytes(32).toString('hex');
  }

  /**
   * データのハッシュ署名を生成
   */
  generateSignature(data: any, algorithm: string = 'sha256'): string {
    const serialized = this.serializeData(data);
    const hmac = createHmac(algorithm, this.secret);
    hmac.update(serialized);
    return hmac.digest('hex');
  }

  /**
   * データの整合性を検証
   */
  verifyIntegrity(data: any, signature: string, algorithm: string = 'sha256'): boolean {
    const expectedSignature = this.generateSignature(data, algorithm);
    
    // タイミング攻撃対策のため定時間比較を使用
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * タイムスタンプ付き署名の生成
   */
  generateTimestampedSignature(data: any, ttl: number = 3600000): {
    signature: string;
    timestamp: number;
    expires: number;
  } {
    const timestamp = Date.now();
    const expires = timestamp + ttl;
    
    const dataWithTimestamp = {
      ...data,
      _timestamp: timestamp,
      _expires: expires
    };

    const signature = this.generateSignature(dataWithTimestamp);

    return {
      signature,
      timestamp,
      expires
    };
  }

  /**
   * タイムスタンプ付き署名の検証
   */
  verifyTimestampedSignature(
    data: any,
    signature: string,
    timestamp: number,
    expires: number
  ): { valid: boolean; reason?: string } {
    const now = Date.now();

    // 有効期限チェック
    if (now > expires) {
      return { valid: false, reason: 'Signature expired' };
    }

    // 未来のタイムスタンプチェック
    if (timestamp > now) {
      return { valid: false, reason: 'Invalid timestamp (future date)' };
    }

    const dataWithTimestamp = {
      ...data,
      _timestamp: timestamp,
      _expires: expires
    };

    const isValid = this.verifyIntegrity(dataWithTimestamp, signature);

    return {
      valid: isValid,
      reason: isValid ? undefined : 'Invalid signature'
    };
  }

  /**
   * データの正規化とシリアライズ
   */
  private serializeData(data: any): string {
    // オブジェクトのキーをソートして一貫性を保つ
    return JSON.stringify(this.sortObject(data));
  }

  /**
   * オブジェクトのキーを再帰的にソート
   */
  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObject(obj[key]);
    });

    return sorted;
  }
}

/**
 * ブロックチェーン風のデータチェーン検証
 */
export class DataChainVerifier {
  private blocks: DataBlock[] = [];

  /**
   * 新しいブロックを追加
   */
  addBlock(data: any): DataBlock {
    const previousBlock = this.getLatestBlock();
    const newBlock = new DataBlock(
      this.blocks.length,
      data,
      previousBlock ? previousBlock.hash : '0'
    );

    this.blocks.push(newBlock);
    return newBlock;
  }

  /**
   * チェーンの整合性を検証
   */
  verifyChain(): { valid: boolean; invalidBlocks: number[] } {
    const invalidBlocks: number[] = [];

    for (let i = 1; i < this.blocks.length; i++) {
      const currentBlock = this.blocks[i];
      const previousBlock = this.blocks[i - 1];

      // 現在のブロックのハッシュを検証
      if (!currentBlock.isValid()) {
        invalidBlocks.push(i);
      }

      // 前のブロックとのリンクを検証
      if (currentBlock.previousHash !== previousBlock.hash) {
        invalidBlocks.push(i);
      }
    }

    return {
      valid: invalidBlocks.length === 0,
      invalidBlocks
    };
  }

  /**
   * 最新のブロックを取得
   */
  private getLatestBlock(): DataBlock | null {
    return this.blocks.length > 0 ? this.blocks[this.blocks.length - 1] : null;
  }

  /**
   * チェーンをエクスポート
   */
  exportChain(): any[] {
    return this.blocks.map(block => block.toJSON());
  }
}

/**
 * データブロッククラス
 */
class DataBlock {
  public index: number;
  public timestamp: number;
  public data: any;
  public previousHash: string;
  public hash: string;
  public nonce: number;

  constructor(index: number, data: any, previousHash: string = '') {
    this.index = index;
    this.timestamp = Date.now();
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  /**
   * ブロックのハッシュを計算
   */
  calculateHash(): string {
    const data = {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      nonce: this.nonce
    };

    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * ブロックの有効性を検証
   */
  isValid(): boolean {
    return this.hash === this.calculateHash();
  }

  /**
   * JSON形式に変換
   */
  toJSON(): any {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce
    };
  }
}

/**
 * セキュアなチェックサム生成
 */
export class ChecksumGenerator {
  /**
   * ファイルのチェックサムを生成
   */
  static async generateFileChecksum(
    filePath: string,
    algorithm: string = 'sha256'
  ): Promise<string> {
    const fs = await import('fs');
    const stream = fs.createReadStream(filePath);
    const hash = createHash(algorithm);

    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * データのチェックサムを生成
   */
  static generateDataChecksum(
    data: Buffer | string,
    algorithm: string = 'sha256'
  ): string {
    const hash = createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * 複数アルゴリズムでのチェックサム生成
   */
  static generateMultiChecksum(
    data: Buffer | string,
    algorithms: string[] = ['sha256', 'sha512']
  ): Record<string, string> {
    const checksums: Record<string, string> = {};

    algorithms.forEach(algorithm => {
      checksums[algorithm] = this.generateDataChecksum(data, algorithm);
    });

    return checksums;
  }
}

/**
 * 改ざん検出ミドルウェア
 */
export function tamperDetectionMiddleware(
  verifier: DataIntegrityVerifier,
  options: {
    headerName?: string;
    cookieName?: string;
    ttl?: number;
  } = {}
) {
  const {
    headerName = 'X-Data-Signature',
    cookieName = 'data-signature',
    ttl = 3600000 // 1時間
  } = options;

  return (req: any, res: any, next: any) => {
    // レスポンスの改ざん防止
    const originalJson = res.json;
    res.json = function(data: any) {
      // 署名の生成
      const { signature, timestamp, expires } = verifier.generateTimestampedSignature(data, ttl);

      // ヘッダーとクッキーに署名を設定
      res.setHeader(headerName, signature);
      res.setHeader('X-Signature-Timestamp', timestamp.toString());
      res.setHeader('X-Signature-Expires', expires.toString());

      res.cookie(cookieName, signature, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: ttl
      });

      // データと署名を含めてレスポンス
      const responseWithSignature = {
        data,
        _integrity: {
          signature,
          timestamp,
          expires,
          algorithm: 'sha256'
        }
      };

      return originalJson.call(this, responseWithSignature);
    };

    // リクエストの改ざん検証
    if (req.body && req.body._integrity) {
      const { signature, timestamp, expires } = req.body._integrity;
      const data = { ...req.body };
      delete data._integrity;

      const result = verifier.verifyTimestampedSignature(
        data,
        signature,
        timestamp,
        expires
      );

      if (!result.valid) {
        return res.status(400).json({
          error: 'Data integrity verification failed',
          reason: result.reason
        });
      }

      // 検証済みデータをリクエストに設定
      req.verifiedData = data;
    }

    next();
  };
}

/**
 * 監査証跡生成
 */
export class AuditTrailGenerator {
  private verifier: DataIntegrityVerifier;
  private chain: DataChainVerifier;

  constructor(secret?: string) {
    this.verifier = new DataIntegrityVerifier(secret);
    this.chain = new DataChainVerifier();
  }

  /**
   * 監査エントリの追加
   */
  addAuditEntry(entry: {
    action: string;
    userId?: string;
    resource: string;
    details: any;
    ip?: string;
    userAgent?: string;
  }): {
    entryId: string;
    signature: string;
    block: any;
  } {
    const auditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      entryId: crypto.randomUUID()
    };

    // 署名の生成
    const signature = this.verifier.generateSignature(auditEntry);

    // ブロックチェーンに追加
    const block = this.chain.addBlock({
      entry: auditEntry,
      signature
    });

    return {
      entryId: auditEntry.entryId,
      signature,
      block: block.toJSON()
    };
  }

  /**
   * 監査証跡の検証
   */
  verifyAuditTrail(): {
    chainValid: boolean;
    invalidBlocks: number[];
    totalBlocks: number;
  } {
    const chainValidation = this.chain.verifyChain();

    return {
      chainValid: chainValidation.valid,
      invalidBlocks: chainValidation.invalidBlocks,
      totalBlocks: this.chain.exportChain().length
    };
  }

  /**
   * 監査証跡のエクスポート
   */
  exportAuditTrail(): any[] {
    return this.chain.exportChain();
  }
}