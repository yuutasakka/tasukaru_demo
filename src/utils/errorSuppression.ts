// エラー抑制ユーティリティ
// 開発環境での不要なエラーログを抑制

const SUPPRESSED_ERROR_PATTERNS = [
  // Plasmo HMR関連
  /ws:\/\/localhost:1815/,
  /\[plasmo\/parcel-runtime\]/,
  /Connection to the HMR server is closed/,
  
  // Chrome拡張機能関連
  /chrome-extension:\/\//,
  /Extension context invalidated/,
  
  // 開発サーバー関連
  /Failed to load resource.*localhost/,
  /WebSocket connection.*failed.*localhost/,
  
  // ソースマップ関連
  /DevTools failed to load source map/,
  
  // React開発ビルド警告
  /Download the React DevTools/
];

// コンソールエラーをフィルタリング
export function suppressDevelopmentErrors(): void {
  if (process.env.NODE_ENV === 'production') {
    return; // 本番環境では何もしない
  }

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    const shouldSuppress = SUPPRESSED_ERROR_PATTERNS.some(pattern => 
      pattern.test(message)
    );

    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    const shouldSuppress = SUPPRESSED_ERROR_PATTERNS.some(pattern => 
      pattern.test(message)
    );

    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  // WebSocket エラーの抑制
  window.addEventListener('error', (event) => {
    if (event.message && SUPPRESSED_ERROR_PATTERNS.some(pattern => 
      pattern.test(event.message)
    )) {
      event.preventDefault();
    }
  });

  // Unhandled Promise Rejection の抑制
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && 
        SUPPRESSED_ERROR_PATTERNS.some(pattern => 
          pattern.test(event.reason.message)
        )) {
      event.preventDefault();
    }
  });
}

// WebSocket接続のリトライロジック付きラッパー
export class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('open');
      };

      this.ws.onclose = () => {
        this.emit('close');
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        // WebSocketエラーを静かに処理
        if (this.url.includes('localhost') || this.url.includes('127.0.0.1')) {
          // 開発環境のエラーは無視
          return;
        }
        this.emit('error', error);
      };

      this.ws.onmessage = (event) => {
        this.emit('message', event);
      };

    } catch (error) {
      // 接続エラーを静かに処理
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  public send(data: string | ArrayBuffer | Blob): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }
}