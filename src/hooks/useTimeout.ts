// カスタムフック: メモリリーク防止のためのsetTimeout管理
import { useEffect, useRef, useCallback } from 'react';

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // コールバックを最新の状態で保持
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // タイムアウトの設定・クリア
  const startTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (delay !== null) {
      timeoutRef.current = setTimeout(() => {
        savedCallback.current();
      }, delay);
    }
  }, [delay]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // delayが変更された時のタイムアウト再設定
  useEffect(() => {
    startTimeout();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, startTimeout]);

  // 手動でタイムアウトをクリアする関数
  const clearTimeoutManually = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { clearTimeout: clearTimeoutManually };
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // コールバックを最新の状態で保持
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // インターバルの設定・クリア
  useEffect(() => {
    if (delay !== null) {
      intervalRef.current = setInterval(() => {
        savedCallback.current();
      }, delay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [delay]);

  // 手動でインターバルをクリアする関数
  const clearIntervalManually = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { clearInterval: clearIntervalManually };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 新しいタイムアウトを設定
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // クリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

// 複数の状態メッセージを管理するフック
export function useStatusMessage(defaultMessage = '') {
  const [status, setStatus] = useState(defaultMessage);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setStatusWithTimeout = useCallback((message: string, duration = 5000) => {
    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus(message);

    // 指定時間後にクリア
    timeoutRef.current = setTimeout(() => {
      setStatus(defaultMessage);
    }, duration);
  }, [defaultMessage]);

  const clearStatus = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus(defaultMessage);
  }, [defaultMessage]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    setStatus,
    setStatusWithTimeout,
    clearStatus
  };
}