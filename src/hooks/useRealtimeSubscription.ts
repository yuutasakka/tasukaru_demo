import { useEffect, useCallback, useRef, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../components/supabaseClient';

export interface RealtimeSubscriptionConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  enabled?: boolean;
}

export interface RealtimeHookOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface RealtimeData<T = any> {
  eventType: string;
  new: T;
  old: T;
  errors: any[];
}

/**
 * Supabaseリアルタイム機能を管理するカスタムフック
 */
export const useRealtimeSubscription = <T = any>(
  config: RealtimeSubscriptionConfig,
  callback: (data: RealtimeData<T>) => void,
  options: RealtimeHookOptions = {}
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const {
    onConnected,
    onDisconnected,
    onError,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  // コールバックの更新
  callbackRef.current = callback;

  // チャネル接続の処理
  const connect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channelName = `realtime-${config.table}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // PostgreSQLの変更イベントを監視
    const subscription = channel.on(
      'postgres_changes' as any,
      {
        event: config.event,
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        const data: RealtimeData<T> = {
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          errors: payload.errors || []
        };
        callbackRef.current(data);
      }
    );

    // 接続状態の監視
    channel
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
          setReconnectCount(0);
          onConnected?.();
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          const error = new Error('チャネル接続エラーが発生しました');
          setConnectionError(error);
          onError?.(error);
          
          // 自動再接続の試行
          if (reconnectCount < reconnectAttempts) {
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectCount(prev => prev + 1);
              connect();
            }, reconnectDelay * Math.pow(2, reconnectCount)); // 指数バックオフ
          }
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          const error = new Error('接続がタイムアウトしました');
          setConnectionError(error);
          onError?.(error);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          onDisconnected?.();
        }
      });

    channelRef.current = channel;
  }, [config, onConnected, onDisconnected, onError, reconnectAttempts, reconnectCount, reconnectDelay]);

  // 接続の切断
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    setIsConnected(false);
    setReconnectCount(0);
  }, []);

  // 手動再接続
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100); // 短い遅延の後に再接続
  }, [connect, disconnect]);

  // 初期接続とクリーンアップ
  useEffect(() => {
    if (config.enabled !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.enabled]);

  // 設定変更時の再接続
  useEffect(() => {
    if (config.enabled !== false && channelRef.current) {
      reconnect();
    }
  }, [config.table, config.event, config.schema, config.filter]);

  return {
    isConnected,
    connectionError,
    reconnectCount,
    reconnect,
    disconnect
  };
};

/**
 * 複数のリアルタイム購読を管理するフック
 */
export const useMultipleRealtimeSubscriptions = <T = any>(
  subscriptions: Array<{
    config: RealtimeSubscriptionConfig;
    callback: (data: RealtimeData<T>) => void;
  }>,
  options: RealtimeHookOptions = {}
) => {
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  const subscriptionRefs = useRef<Array<ReturnType<typeof useRealtimeSubscription>>>([]);

  useEffect(() => {
    // 既存の購読をクリーンアップ
    subscriptionRefs.current.forEach(sub => sub.disconnect());
    subscriptionRefs.current = [];

    // 新しい購読を作成
    subscriptions.forEach((sub, index) => {
      const key = `${sub.config.table}-${index}`;
      
      const subscription = useRealtimeSubscription(
        sub.config,
        sub.callback,
        {
          ...options,
          onConnected: () => {
            setConnections(prev => ({ ...prev, [key]: true }));
            options.onConnected?.();
          },
          onDisconnected: () => {
            setConnections(prev => ({ ...prev, [key]: false }));
            options.onDisconnected?.();
          },
          onError: (error) => {
            setErrors(prev => ({ ...prev, [key]: error }));
            options.onError?.(error);
          }
        }
      );
      
      subscriptionRefs.current.push(subscription);
    });

    return () => {
      subscriptionRefs.current.forEach(sub => sub.disconnect());
    };
  }, [subscriptions]);

  const isAllConnected = Object.values(connections).every(connected => connected);
  const hasErrors = Object.values(errors).some(error => error !== null);

  return {
    connections,
    errors,
    isAllConnected,
    hasErrors,
    reconnectAll: () => subscriptionRefs.current.forEach(sub => sub.reconnect()),
    disconnectAll: () => subscriptionRefs.current.forEach(sub => sub.disconnect())
  };
};