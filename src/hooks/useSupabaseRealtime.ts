import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../components/supabaseClient';
import { secureLog } from '../config/clientSecurity';

interface UseSupabaseRealtimeOptions {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
}

export function useSupabaseRealtime<T = any>(
  channelName: string,
  onMessage: (payload: T) => void,
  options: UseSupabaseRealtimeOptions = {}
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    event = '*',
    schema = 'public',
    table,
    filter,
    onConnect,
    onDisconnect,
    onError,
    maxRetries = 5,
    retryDelay = 5000
  } = options;

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        // 既存の接続をクリーンアップ
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // 環境チェック
        const isProduction = window.location.hostname !== 'localhost' && 
                           !window.location.hostname.includes('127.0.0.1');
        
        // 開発環境では警告のみ
        if (!isProduction) {
          secureLog('Realtime connection may not work in development environment');
        }

        // チャンネルを作成
        const channel = supabase.channel(channelName);

        // イベントリスナーを設定
        if (table) {
          // テーブル変更の監視
          const subscription = channel.on(
            'postgres_changes' as any,
            {
              event,
              schema,
              table,
              filter
            },
            (payload) => {
              if (mounted) {
                onMessage(payload as T);
              }
            }
          );
        } else {
          // ブロードキャストメッセージの監視
          channel.on('broadcast', { event }, (payload) => {
            if (mounted) {
              onMessage(payload as T);
            }
          });
        }

        // 接続状態の監視
        channel
          .on('presence', { event: 'sync' }, () => {
            if (mounted) {
              setIsConnected(true);
              setError(null);
              retryCountRef.current = 0;
              onConnect?.();
            }
          })
          .on('system', {}, (payload) => {
            if (payload.message === 'RECONNECTED') {
              if (mounted) {
                setIsConnected(true);
                setError(null);
                secureLog('Realtime reconnected');
              }
            }
          });

        // チャンネルを購読
        const { error: subscribeError } = await channel.subscribe((status) => {
          if (mounted) {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setError(null);
              retryCountRef.current = 0;
              secureLog('Realtime subscribed successfully');
              onConnect?.();
            } else if (status === 'CLOSED') {
              setIsConnected(false);
              onDisconnect?.();
              handleReconnect();
            } else if (status === 'CHANNEL_ERROR') {
              const err = new Error('Channel subscription error');
              setError(err);
              onError?.(err);
              handleReconnect();
            }
          }
        });

        if (subscribeError) {
          throw subscribeError;
        }

        channelRef.current = channel;

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown realtime error');
        
        if (mounted) {
          setError(error);
          setIsConnected(false);
          secureLog('Realtime connection error:', error.message);
          onError?.(error);
          
          // リトライロジック
          handleReconnect();
        }
      }
    };

    const handleReconnect = () => {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1); // 指数バックオフ
        
        secureLog(`Retrying realtime connection in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            connect();
          }
        }, delay);
      } else {
        secureLog('Max realtime retry attempts reached');
      }
    };

    // 初回接続
    connect();

    // クリーンアップ
    return () => {
      mounted = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setIsConnected(false);
      setError(null);
    };
  }, [channelName, event, schema, table, filter, onMessage, onConnect, onDisconnect, onError, maxRetries, retryDelay]);

  return {
    isConnected,
    error,
    retry: () => {
      retryCountRef.current = 0;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // 再接続は useEffect 内で自動的に行われる
    }
  };
}

// ブロードキャスト送信用のヘルパー関数
export async function broadcastMessage<T = any>(
  channelName: string,
  event: string,
  payload: T
): Promise<{ error: Error | null }> {
  try {
    const channel = supabase.channel(channelName);
    await channel.send({
      type: 'broadcast',
      event,
      payload
    });
    
    return { error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Broadcast failed');
    secureLog('Broadcast error:', error.message);
    return { error };
  }
}