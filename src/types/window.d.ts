// グローバル拡張型定義
// window, navigator等のブラウザAPIの型拡張

declare global {
  interface Window {
    // CryptoJS関連
    CryptoJS?: {
      AES: {
        encrypt(text: string, key: string): { toString(): string };
        decrypt(encryptedText: string, key: string): { 
          toString(encoding: { Utf8: string }): string 
        };
      };
      enc: {
        Utf8: string;
      };
    };
    
    // PWA関連
    workbox?: {
      register(): Promise<void>;
      unregister(): Promise<boolean>;
    };
    
    // デバッグ用（開発環境のみ）
    __ENV__?: Record<string, string>;
    __DEBUG__?: boolean;
    
    // analytics関連
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    
    // Service Worker関連
    registration?: ServiceWorkerRegistration;
  }

  interface Navigator {
    // PWA standalone detection
    standalone?: boolean;
    
    // Network Information API
    connection?: {
      effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
      downlink: number;
      rtt: number;
      saveData?: boolean;
    };
    
    // Device Memory API
    deviceMemory?: number;
    
    // Battery API
    getBattery?: () => Promise<{
      charging: boolean;
      chargingTime: number;
      dischargingTime: number;
      level: number;
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    }>;
  }

  interface Document {
    // iOS Safari specific
    webkitFullscreenElement?: Element;
    webkitExitFullscreen?: () => void;
    
    // Firefox specific  
    mozFullScreenElement?: Element;
    mozCancelFullScreen?: () => void;
    
    // IE/Edge specific
    msFullscreenElement?: Element;
    msExitFullscreen?: () => void;
  }

  interface Element {
    // Fullscreen API
    webkitRequestFullscreen?: () => void;
    mozRequestFullScreen?: () => void;
    msRequestFullscreen?: () => void;
  }

  // CSS-in-JS Emotion関連
  namespace JSX {
    interface IntrinsicAttributes {
      css?: import('@emotion/react').SerializedStyles;
    }
  }
}

// Service Worker types
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<{
      url: string;
      revision: string;
    }>;
    
    skipWaiting(): void;
    clients: Clients;
  }
}

// Intersection Observer用のモック型
declare global {
  interface IntersectionObserverEntry {
    readonly boundingClientRect: DOMRectReadOnly;
    readonly intersectionRatio: number;
    readonly intersectionRect: DOMRectReadOnly;
    readonly isIntersecting: boolean;
    readonly rootBounds: DOMRectReadOnly | null;
    readonly target: Element;
    readonly time: number;
  }

  interface IntersectionObserverInit {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
  }

  interface IntersectionObserver {
    readonly root: Element | null;
    readonly rootMargin: string;
    readonly thresholds: ReadonlyArray<number>;
    disconnect(): void;
    observe(target: Element): void;
    takeRecords(): IntersectionObserverEntry[];
    unobserve(target: Element): void;
  }

  interface IntersectionObserverConstructor {
    prototype: IntersectionObserver;
    new(
      callback: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void,
      options?: IntersectionObserverInit
    ): IntersectionObserver;
  }

  // ResizeObserver用のモック型
  interface ResizeObserverEntry {
    readonly target: Element;
    readonly contentRect: DOMRectReadOnly;
    readonly borderBoxSize: ReadonlyArray<ResizeObserverSize>;
    readonly contentBoxSize: ReadonlyArray<ResizeObserverSize>;
    readonly devicePixelContentBoxSize: ReadonlyArray<ResizeObserverSize>;
  }

  interface ResizeObserverSize {
    readonly blockSize: number;
    readonly inlineSize: number;
  }

  interface ResizeObserver {
    disconnect(): void;
    observe(target: Element, options?: ResizeObserverOptions): void;
    unobserve(target: Element): void;
  }

  interface ResizeObserverOptions {
    box?: 'border-box' | 'content-box' | 'device-pixel-content-box';
  }

  interface ResizeObserverConstructor {
    prototype: ResizeObserver;
    new(callback: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void): ResizeObserver;
  }
}

// 環境変数の型安全な取得
declare global {
  const process: {
    env: {
      NODE_ENV: 'development' | 'production' | 'test';
      [key: string]: string | undefined;
    };
  };
}

export {};