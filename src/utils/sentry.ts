import * as Sentry from '@sentry/react';

export const initSentry = () => {
  // 本番環境でのみSentryを有効化
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration({
          // パフォーマンス監視の設定
          enableInp: true,
          // トランザクションの自動検出
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/yourapp\.com\/api/,
          ],
        }),
        Sentry.browserProfilingIntegration(),
        Sentry.replayIntegration({
          // セッションリプレイの設定
          maskAllText: true,
          blockAllMedia: true,
          // 金融データを含む可能性があるため、より厳格なマスキング
          maskTextFn: (text) => {
            // 電話番号、メールアドレスなどをマスク
            return text.replace(/\d{3,}/g, '***');
          },
        }),
      ],
      
      // パフォーマンス監視
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      
      // セッションリプレイのサンプリング
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // エラーフィルタリング
      beforeSend(event, hint) {
        // 個人情報を含む可能性のあるデータを除外
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        
        // 特定のエラーを無視
        const error = hint.originalException;
        if (error && error instanceof Error) {
          // ネットワークエラーやキャンセルされたリクエストを無視
          if (
            error.message?.includes('Network request failed') ||
            error.message?.includes('Cancelled')
          ) {
            return null;
          }
        }
        
        // 開発環境のエラーを除外
        if (event.environment === 'development') {
          return null;
        }
        
        return event;
      },
      
      // ユーザー情報の設定（匿名化）
      initialScope: {
        tags: {
          component: 'frontend',
        },
      },
    });
  }
};

// エラーバウンダリー用のコンポーネント
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// 手動でエラーを記録する関数
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      contexts: {
        custom: context || {},
      },
    });
  } else {
  }
};

// ユーザーフィードバックを収集する関数
export const showReportDialog = (options?: Sentry.ReportDialogOptions) => {
  if (import.meta.env.PROD) {
    Sentry.showReportDialog(options);
  }
};

// パフォーマンス計測用の関数
export const measurePerformance = async (
  transactionName: string,
  callback: () => Promise<void>
) => {
  // Sentry v8ではstartSpanを使用
  return await Sentry.startSpan(
    {
      name: transactionName,
      op: 'custom',
    },
    async () => {
      try {
        await callback();
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
};

// ユーザーコンテキストの設定（匿名化）
export const setUserContext = (userId: string) => {
  Sentry.setUser({
    id: userId,
    // 個人情報は含めない
  });
};

// ブレッドクラムの追加
export const addBreadcrumb = (
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};