import React, { Component, ErrorInfo, ReactNode } from 'react';
import ProductionLogger from '../utils/productionLogger';
import { captureException, showReportDialog, addBreadcrumb } from '../utils/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 本番環境では詳細なエラー情報を記録
    ProductionLogger.error('React Error Boundary caught error:', error, {
      componentStack: errorInfo.componentStack
    });

    // エラー監視サービスへの送信
    captureException(error, {
      errorBoundary: true,
      componentStack: errorInfo.componentStack,
      props: this.props
    });
    
    // ブレッドクラムの追加
    addBreadcrumb(
      'Error Boundary triggered',
      'error',
      'error',
      { componentStack: errorInfo.componentStack }
    );
  }

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIがある場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#ffebee',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#d32f2f', marginBottom: '16px' }}>
            申し訳ございません
          </h2>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            予期しないエラーが発生しました。ページを再読み込みしてお試しください。
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ページを再読み込み
            </button>
            {import.meta.env.PROD && (
              <button
                onClick={() => showReportDialog()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                エラーを報告
              </button>
            )}
          </div>
          
          {/* 開発環境でのみエラー詳細を表示 */}
          {(typeof window !== 'undefined' && 
            process.env.NODE_ENV === 'development' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
           ) && this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#d32f2f' }}>
                エラー詳細（開発環境のみ）
              </summary>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {this.state.error.stack}
              </pre>
              {this.state.errorInfo && (
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px', 
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;