import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { realtimeService, RealtimeEvent, RealtimeMetrics, SystemAlert } from '../services/RealtimeService';

interface DashboardRealtimeState {
  // 接続状態
  isConnected: boolean;
  connectionError: Error | null;
  
  // メトリクス
  metrics: RealtimeMetrics;
  metricsHistory: RealtimeMetrics[];
  
  // イベント
  recentEvents: RealtimeEvent[];
  eventCounts: Record<string, number>;
  
  // アラート
  alerts: SystemAlert[];
  unreadAlertCount: number;
  
  // UI状態
  isRefreshing: boolean;
  lastRefresh: Date | null;
}

type DashboardRealtimeAction = 
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONNECTION_ERROR'; payload: Error | null }
  | { type: 'UPDATE_METRICS'; payload: RealtimeMetrics }
  | { type: 'ADD_EVENT'; payload: RealtimeEvent }
  | { type: 'SET_EVENTS'; payload: RealtimeEvent[] }
  | { type: 'ADD_ALERT'; payload: SystemAlert }
  | { type: 'RESOLVE_ALERT'; payload: string }
  | { type: 'MARK_ALERTS_READ' }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_LAST_REFRESH'; payload: Date };

const initialState: DashboardRealtimeState = {
  isConnected: false,
  connectionError: null,
  metrics: {
    activeDiagnoses: 0,
    completedDiagnoses: 0,
    activeUsers: 0,
    smsVerifications: 0,
    errorCount: 0,
    lastUpdated: new Date()
  },
  metricsHistory: [],
  recentEvents: [],
  eventCounts: {},
  alerts: [],
  unreadAlertCount: 0,
  isRefreshing: false,
  lastRefresh: null
};

function dashboardRealtimeReducer(state: DashboardRealtimeState, action: DashboardRealtimeAction): DashboardRealtimeState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload,
        connectionError: action.payload ? null : state.connectionError
      };

    case 'SET_CONNECTION_ERROR':
      return {
        ...state,
        connectionError: action.payload,
        isConnected: action.payload ? false : state.isConnected
      };

    case 'UPDATE_METRICS':
      const newMetrics = action.payload;
      const metricsHistory = [...state.metricsHistory, state.metrics].slice(-24); // 24時間分保持
      
      return {
        ...state,
        metrics: newMetrics,
        metricsHistory
      };

    case 'ADD_EVENT':
      const newEvent = action.payload;
      const recentEvents = [newEvent, ...state.recentEvents].slice(0, 100); // 最大100件
      const eventCounts = {
        ...state.eventCounts,
        [newEvent.type]: (state.eventCounts[newEvent.type] || 0) + 1
      };

      return {
        ...state,
        recentEvents,
        eventCounts
      };

    case 'SET_EVENTS':
      return {
        ...state,
        recentEvents: action.payload
      };

    case 'ADD_ALERT':
      const newAlert = action.payload;
      const alerts = [newAlert, ...state.alerts].slice(0, 50); // 最大50件
      
      return {
        ...state,
        alerts,
        unreadAlertCount: state.unreadAlertCount + 1
      };

    case 'RESOLVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(alert =>
          alert.id === action.payload ? { ...alert, resolved: true } : alert
        )
      };

    case 'MARK_ALERTS_READ':
      return {
        ...state,
        unreadAlertCount: 0
      };

    case 'SET_REFRESHING':
      return {
        ...state,
        isRefreshing: action.payload
      };

    case 'SET_LAST_REFRESH':
      return {
        ...state,
        lastRefresh: action.payload,
        isRefreshing: false
      };

    default:
      return state;
  }
}

interface DashboardRealtimeContextValue extends DashboardRealtimeState {
  // アクション
  refreshMetrics: () => Promise<void>;
  resolveAlert: (alertId: string) => void;
  markAlertsAsRead: () => void;
  clearEvents: () => void;
  
  // ユーティリティ
  getEventsByType: (eventType: string) => RealtimeEvent[];
  getUnresolvedAlerts: () => SystemAlert[];
  getMetricsTrend: (metric: keyof RealtimeMetrics, hours?: number) => number[];
}

const DashboardRealtimeContext = createContext<DashboardRealtimeContextValue | null>(null);

interface DashboardRealtimeProviderProps {
  children: ReactNode;
  autoRefreshInterval?: number;
}

export const DashboardRealtimeProvider: React.FC<DashboardRealtimeProviderProps> = ({
  children,
  autoRefreshInterval = 30000 // 30秒間隔でリフレッシュ
}) => {
  const [state, dispatch] = useReducer(dashboardRealtimeReducer, initialState);

  // リアルタイムサービスの初期化と購読
  useEffect(() => {
    let mounted = true;

    // 初期データの読み込み
    const initializeData = async () => {
      if (!mounted) return;
      
      dispatch({ type: 'SET_REFRESHING', payload: true });
      
      try {
        // 初期メトリクス取得
        const metrics = realtimeService.getCurrentMetrics();
        dispatch({ type: 'UPDATE_METRICS', payload: metrics });

        // 最近のイベント取得
        const events = realtimeService.getRecentEvents(50);
        dispatch({ type: 'SET_EVENTS', payload: events });

        // 最近のアラート取得
        const alerts = realtimeService.getRecentAlerts(20);
        alerts.forEach(alert => {
          dispatch({ type: 'ADD_ALERT', payload: alert });
        });

        dispatch({ type: 'SET_CONNECTED', payload: true });
      } catch (error) {
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: error as Error });
      } finally {
        dispatch({ type: 'SET_LAST_REFRESH', payload: new Date() });
      }
    };

    initializeData();

    // リアルタイムイベントの購読
    const unsubscribeEvents = realtimeService.subscribe('event', (event: RealtimeEvent) => {
      if (mounted) {
        dispatch({ type: 'ADD_EVENT', payload: event });
      }
    });

    const unsubscribeMetrics = realtimeService.subscribe('metrics', (metrics: RealtimeMetrics) => {
      if (mounted) {
        dispatch({ type: 'UPDATE_METRICS', payload: metrics });
      }
    });

    const unsubscribeAlerts = realtimeService.subscribe('alerts', (alert: SystemAlert) => {
      if (mounted) {
        dispatch({ type: 'ADD_ALERT', payload: alert });
      }
    });

    // 診断セッションイベントの監視を開始
    const diagnosisChannel = realtimeService.subscribeToDiagnosisEvents((event) => {
      if (mounted) {
        dispatch({ type: 'ADD_EVENT', payload: event });
      }
    });

    // 管理者アクティビティの監視を開始
    const adminChannel = realtimeService.subscribeToAdminActivity((event) => {
      if (mounted) {
        dispatch({ type: 'ADD_EVENT', payload: event });
      }
    });

    // システムエラーの監視を開始
    const errorChannel = realtimeService.subscribeToSystemErrors((alert) => {
      if (mounted) {
        dispatch({ type: 'ADD_ALERT', payload: alert });
      }
    });

    // 自動リフレッシュの設定
    const refreshInterval = setInterval(async () => {
      if (mounted && !state.isRefreshing) {
        try {
          await realtimeService.refreshMetrics();
        } catch (error) {
        }
      }
    }, autoRefreshInterval);

    return () => {
      mounted = false;
      unsubscribeEvents();
      unsubscribeMetrics();
      unsubscribeAlerts();
      clearInterval(refreshInterval);
      realtimeService.disconnect();
    };
  }, [autoRefreshInterval]);

  // コンテキスト値の作成
  const contextValue: DashboardRealtimeContextValue = {
    ...state,

    refreshMetrics: async () => {
      dispatch({ type: 'SET_REFRESHING', payload: true });
      try {
        await realtimeService.refreshMetrics();
      } catch (error) {
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: error as Error });
      } finally {
        dispatch({ type: 'SET_LAST_REFRESH', payload: new Date() });
      }
    },

    resolveAlert: (alertId: string) => {
      realtimeService.resolveAlert(alertId);
      dispatch({ type: 'RESOLVE_ALERT', payload: alertId });
    },

    markAlertsAsRead: () => {
      dispatch({ type: 'MARK_ALERTS_READ' });
    },

    clearEvents: () => {
      dispatch({ type: 'SET_EVENTS', payload: [] });
    },

    getEventsByType: (eventType: string) => {
      return state.recentEvents.filter(event => event.type === eventType);
    },

    getUnresolvedAlerts: () => {
      return state.alerts.filter(alert => !alert.resolved);
    },

    getMetricsTrend: (metric: keyof RealtimeMetrics, hours: number = 24) => {
      const targetHistory = state.metricsHistory.slice(-hours);
      return targetHistory.map(m => typeof m[metric] === 'number' ? m[metric] as number : 0);
    }
  };

  return (
    <DashboardRealtimeContext.Provider value={contextValue}>
      {children}
    </DashboardRealtimeContext.Provider>
  );
};

export const useDashboardRealtime = () => {
  const context = useContext(DashboardRealtimeContext);
  if (!context) {
    throw new Error('useDashboardRealtime must be used within a DashboardRealtimeProvider');
  }
  return context;
};