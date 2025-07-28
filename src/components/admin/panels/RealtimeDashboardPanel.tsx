import React, { useState, useEffect } from 'react';
import { useDashboardRealtime } from '../../../contexts/DashboardRealtimeContext';
import { useDashboardMetrics } from '../../../hooks/useDashboardMetrics';

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: (value: number) => string;
  color?: string;
  status?: 'normal' | 'warning' | 'danger';
  icon?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue = 0,
  format = (v) => v.toString(),
  color = '#3B82F6',
  status = 'normal',
  icon = 'fas fa-chart-line'
}) => {
  const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const isIncrease = change > 0;

  const statusColors = {
    normal: 'border-gray-200 bg-white',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50'
  };

  return (
    <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: color }}
          >
            <i className={`${icon} text-lg`}></i>
          </div>
          <div>
            <h3 className="font-medium text-gray-600 text-sm">{title}</h3>
            <div className="text-3xl font-bold text-gray-900">{format(value)}</div>
          </div>
        </div>
        {change !== 0 && (
          <div className={`flex items-center space-x-1 ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
            <i className={`fas ${isIncrease ? 'fa-arrow-up' : 'fa-arrow-down'} text-sm`}></i>
            <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {/* ミニチャート的なビジュアル */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${Math.min(100, (value / (value + 10)) * 100)}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};

interface ChartProps {
  title: string;
  data: number[];
  color: string;
  height?: number;
}

const MiniChart: React.FC<ChartProps> = ({ title, data, color, height = 80 }) => {
  const maxValue = Math.max(...data, 1);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <h4 className="text-sm font-medium text-gray-600 mb-3">{title}</h4>
      <div style={{ height }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.1 }} />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            className="drop-shadow-sm"
          />
          <polygon
            fill={`url(#gradient-${title})`}
            points={`0,100 ${points} 100,100`}
          />
          {data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - (value / maxValue) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill={color}
                className="opacity-80"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        最新: {data[data.length - 1]} | 最大: {maxValue}
      </div>
    </div>
  );
};

const RealtimeDashboardPanel: React.FC = () => {
  const { 
    metrics, 
    isConnected, 
    isRefreshing, 
    refreshMetrics,
    lastRefresh 
  } = useDashboardRealtime();
  
  const {
    getMetricStats,
    getMetricChange,
    getMetricStatus,
    getEventStats,
    getPerformanceIndicators,
    metricConfigs
  } = useDashboardMetrics();

  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '6h' | '24h'>('6h');

  // パフォーマンス指標の取得
  const performanceData = getPerformanceIndicators();
  const eventStats = getEventStats(60); // 過去1時間

  // 自動更新の実装
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing) {
        refreshMetrics();
      }
    }, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [isRefreshing, refreshMetrics]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">リアルタイムダッシュボード</h2>
          <p className="text-sm text-gray-600">
            最終更新: {lastRefresh ? lastRefresh.toLocaleTimeString('ja-JP') : '未更新'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 接続状態インジケータ */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'リアルタイム接続中' : '接続なし'}
            </span>
          </div>
          
          {/* 更新ボタン */}
          <button
            onClick={refreshMetrics}
            disabled={isRefreshing}
            className={`px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium transition-colors ${
              isRefreshing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isRefreshing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                更新中...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt mr-2"></i>
                更新
              </>
            )}
          </button>
        </div>
      </div>

      {/* 主要メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {metricConfigs.map((config) => {
          const stats = getMetricStats(config.key);
          const status = getMetricStatus(config.key, stats.current);
          
          return (
            <MetricCard
              key={config.key}
              title={config.label}
              value={stats.current}
              previousValue={stats.average}
              format={config.format}
              color={config.color}
              status={status}
              icon={getMetricIcon(config.key)}
            />
          );
        })}
      </div>

      {/* パフォーマンス指標 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <i className="fas fa-check-circle text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">完了率</h3>
              <div className="text-3xl font-bold text-green-600">
                {performanceData.completionRate.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${performanceData.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <i className="fas fa-mobile-alt text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">SMS認証率</h3>
              <div className="text-3xl font-bold text-blue-600">
                {performanceData.verificationRate.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${performanceData.verificationRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
              <i className="fas fa-tachometer-alt text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">スループット</h3>
              <div className="text-3xl font-bold text-purple-600">
                {performanceData.throughput.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500">events/min</div>
            </div>
          </div>
        </div>
      </div>

      {/* 時系列チャート */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">メトリクス推移</h3>
          <div className="flex space-x-2">
            {['1h', '6h', '24h'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MiniChart
            title="アクティブ診断"
            data={generateMockTrendData()}
            color="#3B82F6"
          />
          <MiniChart
            title="完了診断"
            data={generateMockTrendData()}
            color="#10B981"
          />
          <MiniChart
            title="アクティブユーザー"
            data={generateMockTrendData()}
            color="#8B5CF6"
          />
          <MiniChart
            title="エラー数"
            data={generateMockTrendData()}
            color="#EF4444"
          />
        </div>
      </div>

      {/* システム状態 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のイベント</h3>
          <div className="space-y-3">
            {Object.entries(eventStats.eventsByType).map(([eventType, count]) => (
              <div key={eventType} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                    getEventColor(eventType)
                  }`}>
                    <i className={getEventIcon(eventType)}></i>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {getEventLabel(eventType)}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">システム健全性</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">データベース接続</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm text-green-600">正常</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">リアルタイム通信</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? '正常' : '切断'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">SMS サービス</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm text-green-600">正常</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ヘルパー関数
const getMetricIcon = (key: string): string => {
  const icons: Record<string, string> = {
    activeDiagnoses: 'fas fa-play-circle',
    completedDiagnoses: 'fas fa-check-circle',
    activeUsers: 'fas fa-users',
    smsVerifications: 'fas fa-mobile-alt',
    errorCount: 'fas fa-exclamation-triangle'
  };
  return icons[key] || 'fas fa-chart-line';
};

const getEventColor = (eventType: string): string => {
  const colors: Record<string, string> = {
    DIAGNOSIS_STARTED: 'bg-blue-500',
    DIAGNOSIS_COMPLETED: 'bg-green-500',
    SMS_VERIFIED: 'bg-yellow-500',
    ADMIN_LOGIN: 'bg-purple-500',
    APPROVAL_REQUEST_CREATED: 'bg-orange-500'
  };
  return colors[eventType] || 'bg-gray-500';
};

const getEventIcon = (eventType: string): string => {
  const icons: Record<string, string> = {
    DIAGNOSIS_STARTED: 'fas fa-play',
    DIAGNOSIS_COMPLETED: 'fas fa-check',
    SMS_VERIFIED: 'fas fa-mobile',
    ADMIN_LOGIN: 'fas fa-user',
    APPROVAL_REQUEST_CREATED: 'fas fa-file'
  };
  return icons[eventType] || 'fas fa-circle';
};

const getEventLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    DIAGNOSIS_STARTED: '診断開始',
    DIAGNOSIS_COMPLETED: '診断完了',
    SMS_VERIFIED: 'SMS認証',
    ADMIN_LOGIN: '管理者ログイン',
    APPROVAL_REQUEST_CREATED: '承認申請'
  };
  return labels[eventType] || eventType;
};

const generateMockTrendData = (): number[] => {
  // 実際の実装では、getMetricsTrend()を使用
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));
};

export default RealtimeDashboardPanel;