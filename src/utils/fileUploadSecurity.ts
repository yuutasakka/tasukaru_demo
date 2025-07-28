// ファイルアップロードセキュリティ
import crypto from 'crypto';
import { secureLog } from '../config/clientSecurity';

interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName?: string;
  mimeType?: string;
}

interface FileSecurityOptions {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware: boolean;
  sanitizeFileName: boolean;
}

export class FileUploadSecurity {
  // デフォルト設定
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_ALLOWED_IMAGES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  private static readonly DEFAULT_ALLOWED_DOCUMENTS = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  // 危険なファイル拡張子
  private static readonly DANGEROUS_EXTENSIONS = [
    'exe', 'dll', 'scr', 'bat', 'cmd', 'com', 'pif',
    'vbs', 'js', 'jar', 'zip', 'rar', '7z',
    'sh', 'app', 'dmg', 'pkg', 'deb', 'rpm'
  ];

  // マジックナンバー（ファイルシグネチャ）
  private static readonly FILE_SIGNATURES: Map<string, Uint8Array[]> = new Map([
    ['image/jpeg', [
      new Uint8Array([0xFF, 0xD8, 0xFF]),
      new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]),
      new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1])
    ]],
    ['image/png', [
      new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    ]],
    ['image/gif', [
      new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]),
      new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    ]],
    ['application/pdf', [
      new Uint8Array([0x25, 0x50, 0x44, 0x46])
    ]]
  ]);

  /**
   * ファイル検証
   */
  static async validateFile(
    file: File,
    options: Partial<FileSecurityOptions> = {}
  ): Promise<FileValidationResult> {
    const config: FileSecurityOptions = {
      maxFileSize: options.maxFileSize || this.DEFAULT_MAX_SIZE,
      allowedMimeTypes: options.allowedMimeTypes || [...this.DEFAULT_ALLOWED_IMAGES],
      allowedExtensions: options.allowedExtensions || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      scanForMalware: options.scanForMalware ?? true,
      sanitizeFileName: options.sanitizeFileName ?? true
    };

    // ファイルサイズチェック
    if (file.size > config.maxFileSize) {
      return {
        valid: false,
        error: `ファイルサイズが上限（${this.formatFileSize(config.maxFileSize)}）を超えています`
      };
    }

    // ファイル名のサニタイズと検証
    const sanitizedFileName = this.sanitizeFileName(file.name);
    const extension = this.getFileExtension(sanitizedFileName);

    // 拡張子チェック
    if (!extension || !config.allowedExtensions.includes(extension.toLowerCase())) {
      return {
        valid: false,
        error: `許可されていないファイル形式です（許可: ${config.allowedExtensions.join(', ')}）`
      };
    }

    // 危険な拡張子チェック
    if (this.DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
      secureLog('Dangerous file extension detected', { 
        fileName: sanitizedFileName,
        extension 
      });
      return {
        valid: false,
        error: 'セキュリティ上の理由により、このファイル形式はアップロードできません'
      };
    }

    // MIMEタイプチェック
    if (!config.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `許可されていないファイルタイプです（${file.type}）`
      };
    }

    // ファイルシグネチャ検証（マジックナンバー）
    const signatureValid = await this.verifyFileSignature(file);
    if (!signatureValid) {
      secureLog('File signature mismatch', {
        fileName: sanitizedFileName,
        claimedType: file.type
      });
      return {
        valid: false,
        error: 'ファイル形式が正しくありません'
      };
    }

    // コンテンツスキャン（基本的な検証）
    if (config.scanForMalware) {
      const malwareDetected = await this.scanForMaliciousContent(file);
      if (malwareDetected) {
        return {
          valid: false,
          error: '不正なコンテンツが検出されました'
        };
      }
    }

    return {
      valid: true,
      sanitizedFileName: config.sanitizeFileName ? sanitizedFileName : file.name,
      mimeType: file.type
    };
  }

  /**
   * ファイル名のサニタイズ
   */
  static sanitizeFileName(fileName: string): string {
    // 危険な文字を除去
    let sanitized = fileName
      .replace(/[^\w\s.-]/gi, '') // 英数字、スペース、ドット、ハイフン以外を除去
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .replace(/\.+/g, '.') // 連続するドットを単一に
      .replace(/^\.+|\.+$/g, ''); // 先頭と末尾のドットを除去

    // パストラバーサル攻撃対策
    sanitized = sanitized
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '');

    // 長さ制限
    const maxLength = 255;
    if (sanitized.length > maxLength) {
      const extension = this.getFileExtension(sanitized);
      const baseName = sanitized.substring(0, maxLength - extension.length - 1);
      sanitized = `${baseName}.${extension}`;
    }

    // ランダムな接尾辞を追加（ファイル名の衝突回避）
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const extension = this.getFileExtension(sanitized);
    const baseName = sanitized.replace(/\.[^.]+$/, '');
    
    return `${baseName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * ファイル拡張子の取得
   */
  private static getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
  }

  /**
   * ファイルシグネチャの検証
   */
  private static async verifyFileSignature(file: File): Promise<boolean> {
    const signatures = this.FILE_SIGNATURES.get(file.type);
    if (!signatures) {
      // 未知のファイルタイプは一旦許可（設定による）
      return true;
    }

    // ファイルの先頭バイトを読み取る
    const headerBytes = await this.readFileHeader(file, 16);
    
    // シグネチャと照合
    for (const signature of signatures) {
      if (this.compareBytes(headerBytes, signature)) {
        return true;
      }
    }

    return false;
  }

  /**
   * ファイルヘッダーの読み取り
   */
  private static readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const blob = file.slice(0, bytes);
      
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(buffer));
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * バイト配列の比較
   */
  private static compareBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length < b.length) return false;
    
    for (let i = 0; i < b.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    
    return true;
  }

  /**
   * 悪意のあるコンテンツのスキャン（基本版）
   */
  private static async scanForMaliciousContent(file: File): Promise<boolean> {
    // ファイルサイズが異常に小さい実行ファイル
    if (file.size < 100 && this.isExecutableType(file.type)) {
      return true;
    }

    // SVGファイルの場合、スクリプトタグをチェック
    if (file.type === 'image/svg+xml') {
      const content = await this.readFileAsText(file);
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i, // onload, onclick等
        /<iframe/i,
        /<embed/i,
        /<object/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
          secureLog('Malicious pattern detected in SVG', {
            pattern: pattern.source
          });
          return true;
        }
      }
    }

    // HTMLファイルの場合
    if (file.type === 'text/html') {
      const content = await this.readFileAsText(file);
      if (/<script|<iframe|javascript:/i.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * ファイルをテキストとして読み取る
   */
  private static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * 実行可能ファイルタイプかどうか
   */
  private static isExecutableType(mimeType: string): boolean {
    const executableTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program'
    ];
    return executableTypes.includes(mimeType);
  }

  /**
   * ファイルサイズのフォーマット
   */
  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * セキュアなファイルアップロードURL生成
   */
  static generateSecureUploadUrl(
    userId: string,
    fileType: string,
    expiresIn: number = 3600 // 1時間
  ): string {
    const timestamp = Date.now();
    const expiresAt = timestamp + (expiresIn * 1000);
    const token = crypto.randomBytes(32).toString('hex');
    
    // 署名付きURL（実際の実装ではサーバーサイドで生成）
    const data = `${userId}:${fileType}:${expiresAt}:${token}`;
    const signature = crypto
      .createHmac('sha256', 'upload-secret') // 実際の実装では環境変数から
      .update(data)
      .digest('hex');

    return `/api/upload?token=${token}&expires=${expiresAt}&sig=${signature}`;
  }

  /**
   * アップロード進捗の追跡
   */
  static trackUploadProgress(
    file: File,
    onProgress: (percent: number) => void
  ): XMLHttpRequest {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    return xhr;
  }
}