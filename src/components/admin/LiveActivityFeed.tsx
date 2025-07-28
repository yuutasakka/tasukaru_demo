import React, { useState, useEffect, useRef } from 'react';
import { useDashboardRealtime } from '../../contexts/DashboardRealtimeContext';
import { RealtimeEvent, SystemAlert } from '../../services/RealtimeService';

interface ActivityItem {
  id: string;
  type: 'event' | 'alert';
  timestamp: Date;
  title: string;
  description: string;
  icon: string;
  color: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  data?: any;
}

interface ActivityFilterOptions {
  types: string[];
  timeframe: '1h' | '6h' | '24h' | 'all';
  severity?: string[];
  search?: string;
}

const LiveActivityFeed: React.FC = () => {
  const {
    recentEvents,
    alerts,
    isConnected,
    markAlertsAsRead,
    resolveAlert
  } = useDashboardRealtime();

  const [filter, setFilter] = useState<ActivityFilterOptions>({
    types: ['event', 'alert'],
    timeframe: '6h',
    severity: ['info', 'warning', 'error', 'critical']
  });

  const [autoScroll, setAutoScroll] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const newItemRef = useRef<HTMLDivElement>(null);

  // イベントとアラートを統合してアクティビティアイテムに変換
  const processedItems: ActivityItem[] = React.useMemo(() => {
    const items: ActivityItem[] = [];

    // イベントを変換
    if (filter.types.includes('event')) {
      recentEvents.forEach(event => {
        items.push(convertEventToActivity(event));
      });
    }

    // アラートを変換
    if (filter.types.includes('alert')) {
      alerts.forEach(alert => {
        if (filter.severity?.includes(alert.severity)) {
          items.push(convertAlertToActivity(alert));
        }
      });
    }

    // フィルタリング
    const filteredItems = items.filter(item => {
      // 時間フィルタ
      if (filter.timeframe !== 'all') {
        const timeLimit = getTimeLimit(filter.timeframe);
        if (item.timestamp < timeLimit) return false;
      }

      // 検索フィルタ
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm)
        );
      }

      return true;
    });

    // 時間順にソート（新しいものが上）
    return filteredItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [recentEvents, alerts, filter]);

  // 自動スクロール機能
  useEffect(() => {
    if (autoScroll && feedRef.current && processedItems.length > 0) {
      feedRef.current.scrollTop = 0; // 最新を上に表示する場合
    }
  }, [processedItems, autoScroll]);

  // 新着アイテムのハイライト
  useEffect(() => {
    if (newItemRef.current) {
      newItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // 3秒後にハイライトを解除
      const timer = setTimeout(() => {
        if (newItemRef.current) {
          newItemRef.current.classList.remove('animate-pulse', 'bg-yellow-50');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [processedItems.length]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">ライブアクティビティ</h3>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 自動スクロール切り替え */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">自動スクロール</span>
            </label>

            {/* フィルタ切り替え */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <i className="fas fa-filter"></i>
            </button>

            {/* アラート既読マーク */}
            <button
              onClick={markAlertsAsRead}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              全て既読
            </button>
          </div>
        </div>

        {/* フィルタ */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* タイプフィルタ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">種類</label>
                <div className="space-y-2">
                  {['event', 'alert'].map(type => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filter.types.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilter(prev => ({ ...prev, types: [...prev.types, type] }));
                          } else {
                            setFilter(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-500"
                      />
                      <span className="text-sm">{type === 'event' ? 'イベント' : 'アラート'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 時間フィルタ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">期間</label>
                <select
                  value={filter.timeframe}
                  onChange={(e) => setFilter(prev => ({ ...prev, timeframe: e.target.value as any }))}
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  <option value="1h">過去1時間</option>
                  <option value="6h">過去6時間</option>
                  <option value="24h">過去24時間</option>
                  <option value="all">全期間</option>
                </select>
              </div>

              {/* 検索 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
                <input
                  type="text"
                  placeholder="キーワードで検索..."
                  value={filter.search || ''}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* アクティビティフィード */}
      <div 
        ref={feedRef}
        className="max-h-96 overflow-y-auto"
      >
        {processedItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <i className="fas fa-inbox text-4xl mb-4"></i>
            <p>表示するアクティビティがありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {processedItems.map((item, index) => (
              <ActivityItemComponent
                key={item.id}
                item={item}
                isNew={index === 0}
                onResolveAlert={resolveAlert}
              />
            ))}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{processedItems.length} 件のアクティビティ</span>
          <span>最終更新: {new Date().toLocaleTimeString('ja-JP')}</span>
        </div>
      </div>
    </div>
  );
};

interface ActivityItemProps {
  item: ActivityItem;
  isNew: boolean;
  onResolveAlert: (alertId: string) => void;
}

const ActivityItemComponent: React.FC<ActivityItemProps> = ({ 
  item, 
  isNew, 
  onResolveAlert 
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`p-4 hover:bg-gray-50 transition-colors ${
        isNew ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* アイコン */}
        <div 
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${item.color}`}
        >
          <i className={item.icon}></i>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {item.title}
            </h4>
            <div className="flex items-center space-x-2">
              {item.type === 'alert' && item.severity && (
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityStyle(item.severity)}`}>
                  {getSeverityLabel(item.severity)}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-1">
            {item.description}
          </p>

          {/* 詳細情報の展開 */}
          {item.data && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {expanded ? '詳細を隠す' : '詳細を表示'}
              </button>
              
              {expanded && (
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* アラート用アクションボタン */}
          {item.type === 'alert' && (
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => onResolveAlert(item.id)}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                解決済みにする
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ヘルパー関数
const convertEventToActivity = (event: RealtimeEvent): ActivityItem => {
  const eventConfig = getEventConfig(event.type);
  
  return {
    id: event.id,
    type: 'event',
    timestamp: event.timestamp,
    title: eventConfig.title,
    description: eventConfig.description,
    icon: eventConfig.icon,
    color: eventConfig.color,
    data: event.data
  };
};

const convertAlertToActivity = (alert: SystemAlert): ActivityItem => {
  return {
    id: alert.id,
    type: 'alert',
    timestamp: alert.timestamp,
    title: `システムアラート: ${alert.message}`,
    description: alert.message,
    icon: 'fas fa-exclamation-triangle',
    color: getSeverityColor(alert.severity),
    severity: alert.severity,
    data: alert.metadata
  };
};

const getEventConfig = (eventType: string) => {
  const configs: Record<string, any> = {
    DIAGNOSIS_STARTED: {
      title: '新規診断開始',
      description: 'ユーザーが診断を開始しました',
      icon: 'fas fa-play',
      color: 'bg-blue-500'
    },
    DIAGNOSIS_COMPLETED: {
      title: '診断完了',
      description: 'ユーザーが診断を完了しました',
      icon: 'fas fa-check',
      color: 'bg-green-500'
    },
    SMS_VERIFIED: {
      title: 'SMS認証完了',
      description: 'ユーザーがSMS認証を完了しました',
      icon: 'fas fa-mobile-alt',
      color: 'bg-yellow-500'
    },
    ADMIN_LOGIN: {
      title: '管理者ログイン',
      description: '管理者がログインしました',
      icon: 'fas fa-user-shield',
      color: 'bg-purple-500'
    },
    APPROVAL_REQUEST_CREATED: {
      title: '承認申請',
      description: '新しい承認申請が作成されました',
      icon: 'fas fa-file-alt',
      color: 'bg-orange-500'
    }
  };

  return configs[eventType] || {
    title: eventType,
    description: 'システムイベントが発生しました',
    icon: 'fas fa-circle',
    color: 'bg-gray-500'
  };
};

const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    critical: 'bg-red-700'
  };
  return colors[severity] || 'bg-gray-500';
};

const getSeverityStyle = (severity: string): string => {
  const styles: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    critical: 'bg-red-200 text-red-900'
  };
  return styles[severity] || 'bg-gray-100 text-gray-800';
};

const getSeverityLabel = (severity: string): string => {
  const labels: Record<string, string> = {
    info: '情報',
    warning: '警告',
    error: 'エラー',
    critical: '重大'
  };
  return labels[severity] || severity;
};

const getTimeLimit = (timeframe: string): Date => {
  const now = new Date();
  switch (timeframe) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
    case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    default: return new Date(0);
  }
};

const formatRelativeTime = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  
  if (diff < 60000) return '今';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
  
  return timestamp.toLocaleDateString('ja-JP');
};

export default LiveActivityFeed;