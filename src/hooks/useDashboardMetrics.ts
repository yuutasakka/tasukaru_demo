import { useState, useEffect, useRef, useMemo } from 'react';
import { useDashboardRealtime } from '../contexts/DashboardRealtimeContext';
import { RealtimeMetrics, RealtimeEvent } from '../services/RealtimeService';

export interface MetricConfig {
  key: keyof RealtimeMetrics;
  label: string;
  format?: (value: number) => string;
  color?: string;
  threshold?: {
    warning?: number;
    danger?: number;
  };
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'alert';
  size: 'small' | 'medium' | 'large';
  config: any;
  enabled: boolean;
  position: { x: number; y: number };
}

export interface AlertRule {
  id: string;
  metric: keyof RealtimeMetrics;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  message: string;
  enabled: boolean;
}

/**
 * ダッシュボードメトリクスの管理と監視を行うフック
 */
export const useDashboardMetrics = (config?: {
  updateInterval?: number;
  historyLength?: number;
  enableAlerts?: boolean;
}) => {
  const {
    metrics,
    metricsHistory,
    recentEvents,
    alerts,
    getMetricsTrend,
    isConnected,
    isRefreshing,
    refreshMetrics
  } = useDashboardRealtime();

  const {
    updateInterval = 5000,
    historyLength = 24,
    enableAlerts = true
  } = config || {};

  const [customAlertRules, setCustomAlertRules] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<string[]>([]);
  const previousMetricsRef = useRef<RealtimeMetrics>(metrics);

  // デフォルトのメトリクス設定
  const defaultMetricConfigs: MetricConfig[] = useMemo(() => [
    {
      key: 'activeDiagnoses',
      label: 'アクティブ診断',
      format: (value) => value.toString(),
      color: '#3B82F6',
      threshold: { warning: 50, danger: 100 }
    },
    {
      key: 'completedDiagnoses',
      label: '完了診断',
      format: (value) => value.toString(),
      color: '#10B981',
    },
    {
      key: 'activeUsers',
      label: 'アクティブユーザー',
      format: (value) => value.toString(),
      color: '#8B5CF6',
      threshold: { warning: 200, danger: 500 }
    },
    {
      key: 'smsVerifications',
      label: 'SMS認証',
      format: (value) => value.toString(),
      color: '#F59E0B',
    },
    {
      key: 'errorCount',
      label: 'エラー数',
      format: (value) => value.toString(),
      color: '#EF4444',
      threshold: { warning: 5, danger: 10 }
    }
  ], []);

  // メトリクスの変化率を計算
  const getMetricChange = (key: keyof RealtimeMetrics, timeframe: number = 1) => {
    const trend = getMetricsTrend(key, timeframe + 1);
    if (trend.length < 2) return 0;
    
    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // メトリクスの状態を判定
  const getMetricStatus = (key: keyof RealtimeMetrics, value: number) => {
    const config = defaultMetricConfigs.find(c => c.key === key);
    if (!config?.threshold) return 'normal';
    
    if (config.threshold.danger && value >= config.threshold.danger) return 'danger';
    if (config.threshold.warning && value >= config.threshold.warning) return 'warning';
    return 'normal';
  };

  // カスタムアラートルールのチェック
  useEffect(() => {
    if (!enableAlerts) return;

    const checkAlertRules = () => {
      const newTriggeredAlerts: string[] = [];

      customAlertRules.forEach(rule => {
        if (!rule.enabled) return;

        const currentValue = metrics[rule.metric] as number;
        const isTriggered = (() => {
          switch (rule.condition) {
            case 'gt': return currentValue > rule.threshold;
            case 'lt': return currentValue < rule.threshold;
            case 'eq': return currentValue === rule.threshold;
            default: return false;
          }
        })();

        if (isTriggered && !triggeredAlerts.includes(rule.id)) {
          newTriggeredAlerts.push(rule.id);
        }
      });

      if (newTriggeredAlerts.length > 0) {
        setTriggeredAlerts(prev => [...prev, ...newTriggeredAlerts]);
      }
    };

    checkAlertRules();
  }, [metrics, customAlertRules, enableAlerts, triggeredAlerts]);

  // メトリクスの統計情報を計算
  const getMetricStats = (key: keyof RealtimeMetrics) => {
    const trend = getMetricsTrend(key, historyLength);
    const values = trend.filter(v => typeof v === 'number' && !isNaN(v));
    
    if (values.length === 0) {
      return {
        current: metrics[key] as number,
        average: 0,
        min: 0,
        max: 0,
        change: 0
      };
    }

    const current = metrics[key] as number;
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const change = getMetricChange(key);

    return {
      current,
      average: Math.round(average * 100) / 100,
      min,
      max,
      change: Math.round(change * 100) / 100
    };
  };

  // イベントベースの統計
  const getEventStats = (timeframe: number = 60) => {
    const cutoff = new Date(Date.now() - timeframe * 60 * 1000);
    const recentEventsInTimeframe = recentEvents.filter(event => 
      event.timestamp > cutoff
    );

    const eventsByType = recentEventsInTimeframe.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: recentEventsInTimeframe.length,
      eventsByType,
      eventsPerMinute: recentEventsInTimeframe.length / timeframe
    };
  };

  // パフォーマンス指標の計算
  const getPerformanceIndicators = () => {
    const stats = getEventStats(60); // 過去1時間
    const diagnosisStarted = stats.eventsByType['DIAGNOSIS_STARTED'] || 0;
    const diagnosisCompleted = stats.eventsByType['DIAGNOSIS_COMPLETED'] || 0;
    const smsVerified = stats.eventsByType['SMS_VERIFIED'] || 0;

    return {
      completionRate: diagnosisStarted > 0 ? (diagnosisCompleted / diagnosisStarted) * 100 : 0,
      verificationRate: diagnosisStarted > 0 ? (smsVerified / diagnosisStarted) * 100 : 0,
      averageSessionTime: 0, // これは実際のセッションデータから計算する必要があります
      throughput: stats.eventsPerMinute
    };
  };

  // カスタムアラートルールの管理
  const addAlertRule = (rule: Omit<AlertRule, 'id'>) => {
    const newRule: AlertRule = {
      ...rule,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setCustomAlertRules(prev => [...prev, newRule]);
    return newRule.id;
  };

  const updateAlertRule = (id: string, updates: Partial<AlertRule>) => {
    setCustomAlertRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const removeAlertRule = (id: string) => {
    setCustomAlertRules(prev => prev.filter(rule => rule.id !== id));
    setTriggeredAlerts(prev => prev.filter(alertId => alertId !== id));
  };

  // アラートのクリア
  const clearTriggeredAlert = (id: string) => {
    setTriggeredAlerts(prev => prev.filter(alertId => alertId !== id));
  };

  return {
    // 基本データ
    metrics,
    metricsHistory,
    isConnected,
    isRefreshing,
    
    // 統計機能
    getMetricStats,
    getMetricChange,
    getMetricStatus,
    getEventStats,
    getPerformanceIndicators,
    
    // 設定
    metricConfigs: defaultMetricConfigs,
    
    // アラート機能
    customAlertRules,
    triggeredAlerts,
    addAlertRule,
    updateAlertRule,
    removeAlertRule,
    clearTriggeredAlert,
    
    // アクション
    refreshMetrics
  };
};